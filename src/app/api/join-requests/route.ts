import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PROFILE_SELECT = "name, image, position, city, bio, phone, whatsapp, facebook, instagram, show_phone, show_whatsapp, show_facebook, show_instagram";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonError("Unauthorized", 401);

  let body: { matchId?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const { matchId } = body;
  if (!matchId) return jsonError("matchId is required");
  if (!UUID_RE.test(matchId)) return jsonError("Invalid matchId format");

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("*, join_requests(status, player_id)")
    .eq("id", matchId)
    .single();

  if (matchError || !match) return jsonError("Match not found", 404);
  if (match.status === "CLOSED" || match.status === "COMPLETED" || match.status === "ARCHIVED") {
    return jsonError("Match is not accepting requests");
  }
  if (match.organizer_id === user.id) return jsonError("Cannot join your own match");

  const acceptedCount = match.join_requests.filter((r: { status: string }) => r.status === "ACCEPTED").length;
  const isFull = acceptedCount >= match.max_players;

  const existing = match.join_requests.find((r: { player_id: string; status: string }) => r.player_id === user.id);
  if (existing && existing.status === "PENDING") return jsonError("Already requested to join");
  if (existing && existing.status === "ACCEPTED") return jsonError("You are already accepted");

  if (existing && existing.status === "REJECTED") {
    const { data: updated, error: updateErr } = await supabase
      .from("join_requests")
      .update({ status: "PENDING" })
      .eq("id", existing.id)
      .select(`*, profiles!player_id(${PROFILE_SELECT})`)
      .single();
    if (updateErr) return jsonError(updateErr.message, 500);
    await supabase.rpc("create_notification", {
      p_user_id: match.organizer_id,
      p_title: isFull ? "New waitlist request" : "New join request",
      p_message: isFull
        ? `Someone wants to waitlist for "${match.title}"`
        : `Someone wants to join "${match.title}"`,
      p_match_id: matchId,
    });
    return NextResponse.json({ ...updated, waitlisted: isFull }, { status: 201 });
  }

  const { data: joinRequest, error } = await supabase
    .from("join_requests")
    .insert({ match_id: matchId, player_id: user.id })
    .select(`*, profiles!player_id(${PROFILE_SELECT})`)
    .single();

  if (error) return jsonError(error.message, 500);

  await supabase.rpc("create_notification", {
    p_user_id: match.organizer_id,
    p_title: isFull ? "New waitlist request" : "New join request",
    p_message: isFull
      ? `Someone wants to waitlist for "${match.title}"`
      : `Someone wants to join "${match.title}"`,
    p_match_id: matchId,
  });

  return NextResponse.json({ ...joinRequest, waitlisted: isFull }, { status: 201 });
}
