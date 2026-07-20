import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { jsonError, requireAuth } from "@/lib/api/helpers";
import { NextResponse } from "next/server";

/**
 * Shared admin guard for src/app/api/admin/**. Requires both:
 * - profiles.role === "admin" (the DB-level, RLS-enforced source of truth)
 * - user.id === ADMIN_USER_ID (the configured single admin account)
 * so a corrupted/mis-set role column alone can't grant access.
 */

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type AdminAuthResult =
  | { supabase: SupabaseServerClient; user: User; error: null }
  | { supabase: null; user: null; error: NextResponse };

export async function requireAdmin(): Promise<AdminAuthResult> {
  const { supabase, user, error } = await requireAuth();
  if (error) return { supabase: null, user: null, error };

  if (!process.env.ADMIN_USER_ID || user.id !== process.env.ADMIN_USER_ID) {
    return { supabase: null, user: null, error: jsonError("Forbidden", 403) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { supabase: null, user: null, error: jsonError("Forbidden", 403) };
  }

  return { supabase, user, error: null };
}

/**
 * Guard for moderator-eligible admin surfaces (Stats, Users GET/status-PATCH,
 * Matches, Fields, Reports, Reviews, Analytics). Unlike requireAdmin(), this
 * accepts profiles.role in ('admin','moderator') and has no ADMIN_USER_ID
 * lock — that lock stays specific to the one true admin. Settings,
 * Notifications/Broadcast, and role changes on Users stay requireAdmin()-only.
 */
/**
 * Server-side role lookup for page layouts (src/app/dashboard/admin/**).
 * Unlike requireAdmin()/requireStaff(), this doesn't return a Response — it's
 * for redirect() calls in server-component layouts, not JSON API routes.
 */
export async function getStaffRole(): Promise<{ role: "admin" | "moderator" | "user" | null; isFullAdmin: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { role: null, isFullAdmin: false };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isFullAdmin = profile?.role === "admin" && user.id === process.env.ADMIN_USER_ID;
  const role: "admin" | "moderator" | "user" | null = isFullAdmin
    ? "admin"
    : profile?.role === "moderator"
      ? "moderator"
      : profile?.role === "user"
        ? "user"
        : null;

  return { role, isFullAdmin };
}

export async function requireStaff(): Promise<AdminAuthResult> {
  const { supabase, user, error } = await requireAuth();
  if (error) return { supabase: null, user: null, error };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" && profile?.role !== "moderator") {
    return { supabase: null, user: null, error: jsonError("Forbidden", 403) };
  }

  return { supabase, user, error: null };
}
