import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { ids?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

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
