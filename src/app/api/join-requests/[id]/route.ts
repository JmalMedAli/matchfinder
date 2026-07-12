import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("Invalid request ID format");

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const { status } = body;
  if (!status || !["ACCEPTED", "REJECTED"].includes(status)) {
    return jsonError("Status must be ACCEPTED or REJECTED");
  }

  const { data: joinRequest, error: jrError } = await supabase
    .from("join_requests")
    .select("*, matches!match_id(organizer_id, title)")
    .eq("id", id)
    .single();

  if (jrError || !joinRequest) return jsonError("Not found", 404);

  const match = joinRequest.matches as { organizer_id: string; title: string };
  if (match.organizer_id !== user.id) return jsonError("Only organizer can accept/reject", 403);
  if (joinRequest.status !== "PENDING") return jsonError("Already processed");

  if (status === "ACCEPTED") {
    const { data: accepted, error: acceptError } = await supabase
      .rpc("accept_join_request", {
        p_join_request_id: id,
        p_organizer_id: user.id,
      });

    if (acceptError) return jsonError(acceptError.message, 500);
    if (!accepted) return jsonError("Match is full or not open");
  } else {
    const { error } = await supabase
      .from("join_requests")
      .update({ status: "REJECTED" })
      .eq("id", id);
    if (error) return jsonError(error.message, 500);
  }

  await supabase.rpc("create_notification", {
    p_user_id: joinRequest.player_id,
    p_title: `Request ${status.toLowerCase()}`,
    p_message: `Your request to join "${match.title}" has been ${status.toLowerCase()}`,
    p_match_id: joinRequest.match_id,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("Invalid request ID format");

  const { data: joinRequest, error: jrError } = await supabase
    .from("join_requests")
    .select("player_id, status")
    .eq("id", id)
    .single();

  if (jrError || !joinRequest) return jsonError("Not found", 404);
  if (joinRequest.player_id !== user.id) return jsonError("Not your request", 403);
  if (joinRequest.status !== "PENDING") return jsonError("Only pending requests can be withdrawn", 400);

  const { error } = await supabase.from("join_requests").delete().eq("id", id);
  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ success: true });
}
