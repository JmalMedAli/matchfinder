import { NextRequest, NextResponse } from "next/server";
import { UUID_RE, requireAuth, parseJsonBody } from "@/lib/api/helpers";

export async function PATCH(req: NextRequest) {
  const { supabase, user, error } = await requireAuth();
  if (error) return error;

  const { body, error: bodyError } = await parseJsonBody<{ ids?: unknown }>(req);
  if (bodyError) return bodyError;

  const { ids } = body;

  if (ids !== undefined && ids !== null) {
    if (!Array.isArray(ids)) {
      return NextResponse.json({ error: "ids must be an array" }, { status: 400 });
    }
    const validIds = ids.filter((id): id is string => typeof id === "string" && UUID_RE.test(id));
    if (validIds.length === 0) {
      return NextResponse.json({ error: "No valid notification IDs provided" }, { status: 400 });
    }
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read: true })
      .in("id", validIds)
      .eq("user_id", user.id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  } else {
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
