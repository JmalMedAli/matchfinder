import { NextRequest, NextResponse } from "next/server";
import { UUID_RE, jsonError, requireAuth, parseJsonBody } from "@/lib/api/helpers";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const { supabase, user, error } = await requireAuth();
  if (error) return error;

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json(data ?? []);
}

/** Deletes the given notification ids, or all of the caller's notifications if `ids` is omitted. */
export async function DELETE(req: NextRequest) {
  const { supabase, user, error } = await requireAuth();
  if (error) return error;

  if (!(await rateLimit(supabase, "delete-notifications"))) {
    return jsonError("Too many requests", 429);
  }

  const { body, error: bodyError } = await parseJsonBody<{ ids?: unknown }>(req);
  if (bodyError) return bodyError;

  const { ids } = body;

  if (ids !== undefined && ids !== null) {
    if (!Array.isArray(ids)) return jsonError("ids must be an array");
    const validIds = ids.filter((id): id is string => typeof id === "string" && UUID_RE.test(id));
    if (validIds.length === 0) return jsonError("No valid notification IDs provided");

    const { error: deleteError } = await supabase
      .from("notifications")
      .delete()
      .in("id", validIds)
      .eq("user_id", user.id);
    if (deleteError) return jsonError(deleteError.message, 500);
  } else {
    const { error: deleteError } = await supabase.from("notifications").delete().eq("user_id", user.id);
    if (deleteError) return jsonError(deleteError.message, 500);
  }

  return NextResponse.json({ success: true });
}
