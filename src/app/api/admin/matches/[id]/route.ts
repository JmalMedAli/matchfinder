import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/admin";
import { UUID_RE, jsonError, parseJsonBody } from "@/lib/api/helpers";
import { rateLimit } from "@/lib/rate-limit";
import { notifyUsers } from "@/lib/notify";

// Matches only ever use OPEN/FULL/CLOSED/COMPLETED/ARCHIVED (DB CHECK
// constraint) — there is no separate CANCELLED status. Introducing one would
// mean a schema migration plus touching every place across the app that
// branches on match status (~29 files: cards, calendar, filters, badges).
// Admin "Cancel" reuses ARCHIVED (already means "no longer active") instead;
// tracked as a deliberate scope boundary in docs/technical-debt.md.
const STATUSES = ["OPEN", "FULL", "CLOSED", "COMPLETED", "ARCHIVED"] as const;

interface MatchPatchBody {
  title?: string;
  description?: string;
  date?: string;
  max_players?: number;
  status?: string;
  action?: "cancel" | "force-complete";
}

async function notifyParticipants(
  supabase: Awaited<ReturnType<typeof requireStaff>>["supabase"],
  matchId: string,
  title: string,
  message: string,
) {
  if (!supabase) return;
  const { data: requests } = await supabase
    .from("join_requests")
    .select("player_id")
    .eq("match_id", matchId)
    .in("status", ["PENDING", "ACCEPTED"]);
  const playerIds = (requests ?? []).map((r) => r.player_id as string);
  if (playerIds.length > 0) {
    notifyUsers(playerIds, { title, message, matchId, skipEmail: false }).catch(() => {});
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("Invalid id");

  const { supabase, error } = await requireStaff();
  if (error) return error;

  if (!(await rateLimit(supabase, "admin-match-patch"))) {
    return jsonError("Too many requests", 429);
  }

  const { body, error: bodyError } = await parseJsonBody<MatchPatchBody>(req);
  if (bodyError) return bodyError;

  const updates: Record<string, string | number> = {};

  if (body.action === "cancel") {
    updates.status = "ARCHIVED";
  } else if (body.action === "force-complete") {
    updates.status = "COMPLETED";
  } else {
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.date !== undefined) updates.date = body.date;
    if (body.max_players !== undefined) updates.max_players = body.max_players;
    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status as (typeof STATUSES)[number])) return jsonError("Invalid status");
      updates.status = body.status;
    }
  }

  if (Object.keys(updates).length === 0) return jsonError("No changes supplied");

  const { data, error: updateError } = await supabase
    .from("matches")
    .update(updates)
    .eq("id", id)
    .select("id, title, status")
    .single();

  if (updateError) return jsonError(updateError.message, 500);

  if (body.action === "cancel") {
    await notifyParticipants(
      supabase,
      id,
      "Match cancelled",
      `"${data.title}" was cancelled by an administrator.`,
    );
  } else if (body.action === "force-complete") {
    await notifyParticipants(
      supabase,
      id,
      "Match marked complete",
      `"${data.title}" was marked completed by an administrator. You can now leave a review.`,
    );
  }

  return NextResponse.json(data);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("Invalid id");

  const { supabase, error } = await requireStaff();
  if (error) return error;

  if (!(await rateLimit(supabase, "admin-match-delete"))) {
    return jsonError("Too many requests", 429);
  }

  const { data: match } = await supabase.from("matches").select("title").eq("id", id).single();
  if (!match) return jsonError("Match not found", 404);

  await notifyParticipants(
    supabase,
    id,
    "Match removed",
    `"${match.title}" was removed by an administrator.`,
  );

  const { error: deleteError } = await supabase.from("matches").delete().eq("id", id);
  if (deleteError) return jsonError(deleteError.message, 500);

  return NextResponse.json({ success: true });
}
