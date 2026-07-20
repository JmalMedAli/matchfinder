import { NextResponse } from "next/server";
import { UUID_RE, jsonError, requireAuth, parseJsonBody } from "@/lib/api/helpers";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const { supabase, user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { data, error } = await supabase
    .from("blocked_users")
    .select("id, blocked_id")
    .eq("blocker_id", user.id);

  if (error) return jsonError(error.message, 500);
  return NextResponse.json(data ?? []);
}

/** Toggles a block: creates it if absent, removes it if present. */
export async function POST(req: Request) {
  const { supabase, user, error: authError } = await requireAuth();
  if (authError) return authError;

  if (!(await rateLimit(supabase, "block-user"))) {
    return jsonError("Too many requests", 429);
  }

  const { body, error: bodyError } = await parseJsonBody<{ blockedId?: string }>(req);
  if (bodyError) return bodyError;

  const blockedId = body.blockedId;
  if (!blockedId || !UUID_RE.test(blockedId)) return jsonError("Invalid blockedId");
  if (blockedId === user.id) return jsonError("You cannot block yourself");

  const { data: existing } = await supabase
    .from("blocked_users")
    .select("id")
    .eq("blocker_id", user.id)
    .eq("blocked_id", blockedId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("blocked_users").delete().eq("id", existing.id);
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ action: "unblocked" });
  }

  const { error } = await supabase.from("blocked_users").insert({ blocker_id: user.id, blocked_id: blockedId });
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ action: "blocked" }, { status: 201 });
}
