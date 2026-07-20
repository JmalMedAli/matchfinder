import { NextResponse } from "next/server";
import { requireAdmin, requireStaff } from "@/lib/api/admin";
import { UUID_RE, jsonError, parseJsonBody } from "@/lib/api/helpers";
import { rateLimit } from "@/lib/rate-limit";
import { notifyUser } from "@/lib/notify";

const ROLES = ["user", "moderator", "admin"] as const;
const STATUSES = ["active", "suspended", "banned"] as const;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("Invalid id");

  const { supabase, error } = await requireStaff();
  if (error) return error;

  const [profile, matchesOrganized, joinRequests, reportsFiled, reportsAgainst] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    supabase
      .from("matches")
      .select("id, title, date, status")
      .eq("organizer_id", id)
      .order("date", { ascending: false })
      .limit(5),
    supabase.from("join_requests").select("id, status", { count: "exact", head: true }).eq("player_id", id),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("reporter_id", id),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("target_type", "user")
      .eq("target_id", id),
  ]);

  if (profile.error || !profile.data) return jsonError("User not found", 404);

  return NextResponse.json({
    profile: profile.data,
    recentMatches: matchesOrganized.data ?? [],
    joinRequestCount: joinRequests.count ?? 0,
    reportsFiled: reportsFiled.count ?? 0,
    reportsAgainst: reportsAgainst.count ?? 0,
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("Invalid id");

  const { supabase, user, error } = await requireStaff();
  if (error) return error;

  if (!(await rateLimit(supabase, "admin-user-patch"))) {
    return jsonError("Too many requests", 429);
  }

  const { body, error: bodyError } = await parseJsonBody<{ role?: string; status?: string }>(req);
  if (bodyError) return bodyError;

  if (id === user.id) {
    return jsonError("You cannot change your own role or status", 400);
  }

  // Role changes are the one Users action that stays admin-only even though
  // this route is otherwise staff-accessible — a moderator can suspend/ban
  // but can't grant themselves or anyone else admin/moderator access.
  if (body.role !== undefined && user.id !== process.env.ADMIN_USER_ID) {
    return jsonError("Only the administrator can change roles", 403);
  }

  const updates: Record<string, string> = {};
  if (body.role !== undefined) {
    if (!ROLES.includes(body.role as (typeof ROLES)[number])) return jsonError("Invalid role");
    updates.role = body.role;
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status as (typeof STATUSES)[number])) return jsonError("Invalid status");
    updates.status = body.status;
  }
  if (Object.keys(updates).length === 0) return jsonError("No changes supplied");

  const { data, error: updateError } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select("id, name, role, status")
    .single();

  if (updateError) return jsonError(updateError.message, 500);

  if (updates.status === "suspended" || updates.status === "banned") {
    notifyUser({
      userId: id,
      title: updates.status === "banned" ? "Your account has been banned" : "Your account has been suspended",
      message: "Contact support if you believe this was a mistake.",
      skipEmail: false,
    }).catch(() => {});
  }

  return NextResponse.json(data);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("Invalid id");

  const { supabase, user, error } = await requireAdmin();
  if (error) return error;

  if (!(await rateLimit(supabase, "admin-user-delete"))) {
    return jsonError("Too many requests", 429);
  }

  if (id === user.id) {
    return jsonError("You cannot delete your own account", 400);
  }

  // Soft delete: profiles.id cascades into ~18 tables (matches organized,
  // reviews, messages, other players' join_requests, …) — a real DELETE would
  // silently destroy other players' history. Ban + anonymize instead.
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      status: "banned",
      name: "Deleted User",
      bio: null,
      phone: null,
      whatsapp: null,
      facebook: null,
      instagram: null,
      image: null,
    })
    .eq("id", id);

  if (updateError) return jsonError(updateError.message, 500);

  return NextResponse.json({ success: true });
}
