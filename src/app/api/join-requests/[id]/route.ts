import { NextRequest, NextResponse } from "next/server";
import { notifyUser } from "@/lib/notify";
import { UUID_RE, jsonError, requireAuth, parseJsonBody } from "@/lib/api/helpers";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("Invalid request ID format");

  const { body, error: bodyError } = await parseJsonBody<{ status?: string }>(req);
  if (bodyError) return bodyError;

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

  if (joinRequest.status === "ACCEPTED" && status === "REJECTED") {
    const { data: removed, error: removeError } = await supabase
      .rpc("remove_accepted_player", {
        p_join_request_id: id,
        p_organizer_id: user.id,
      });

    if (removeError) return jsonError(removeError.message, 500);
    if (!removed) return jsonError("Player is not accepted or match not found");
  } else if (joinRequest.status === "PENDING") {
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
  } else {
    return jsonError("Already processed", 400);
  }

  const isRemove = joinRequest.status === "ACCEPTED" && status === "REJECTED";
  await notifyUser({
    userId: joinRequest.player_id,
    title: isRemove ? "Removed from match" : `Request ${status.toLowerCase()}`,
    message: isRemove
      ? `You have been removed from "${match.title}"`
      : `Your request to join "${match.title}" has been ${status.toLowerCase()}`,
    matchId: joinRequest.match_id,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user, error: authError } = await requireAuth();
  if (authError) return authError;

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
