import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api/admin";
import { UUID_RE, jsonError, parseJsonBody } from "@/lib/api/helpers";
import { rateLimit } from "@/lib/rate-limit";
import { notifyUser } from "@/lib/notify";

const STATUSES = ["PENDING", "ACCEPTED", "REJECTED"] as const;

/**
 * Staff-only join-request management for a match, independent of who
 * organizes it. Uses admin_set_join_request_status (SECURITY DEFINER,
 * checks is_staff() internally) rather than accept_join_request/
 * remove_accepted_player, which are locked to the real organizer's own
 * auth.uid() — see that migration for why.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; requestId: string }> },
) {
  const { id, requestId } = await params;
  if (!UUID_RE.test(id) || !UUID_RE.test(requestId)) return jsonError("Invalid id");

  const { supabase, error } = await requireStaff();
  if (error) return error;

  if (!(await rateLimit(supabase, "admin-match-patch"))) {
    return jsonError("Too many requests", 429);
  }

  const { body, error: bodyError } = await parseJsonBody<{ status?: string }>(req);
  if (bodyError) return bodyError;

  if (!body.status || !STATUSES.includes(body.status as (typeof STATUSES)[number])) {
    return jsonError("status must be PENDING, ACCEPTED, or REJECTED");
  }

  const { data: joinRequest, error: jrError } = await supabase
    .from("join_requests")
    .select("player_id, status, match_id, matches!match_id(title)")
    .eq("id", requestId)
    .eq("match_id", id)
    .single();

  if (jrError || !joinRequest) return jsonError("Join request not found", 404);

  const { data: ok, error: rpcError } = await supabase.rpc("admin_set_join_request_status", {
    p_join_request_id: requestId,
    p_status: body.status,
  });

  if (rpcError) return jsonError(rpcError.message, 500);
  if (!ok) return jsonError("Could not update this request (match may be full, or you're not staff)", 400);

  const match = joinRequest.matches as unknown as { title: string } | null;
  if (body.status !== joinRequest.status) {
    const verb = body.status === "ACCEPTED" ? "accepted" : body.status === "REJECTED" ? "declined" : "set back to pending";
    notifyUser({
      userId: joinRequest.player_id,
      title: `Request ${verb}`,
      message: `Your request to join "${match?.title ?? "a match"}" was ${verb} by an administrator.`,
      matchId: id,
    }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
