import { NextRequest, NextResponse } from "next/server";
import { UUID_RE, requireAuth, parseJsonBody } from "@/lib/api/helpers";

export async function GET(req: NextRequest) {
  const { supabase, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const playerId = searchParams.get("playerId");
  const matchId = searchParams.get("matchId");

  if (playerId) {
    if (!UUID_RE.test(playerId)) return NextResponse.json({ error: "Invalid playerId" }, { status: 400 });
    const { data } = await supabase.rpc("get_player_reviews", {
      p_player_id: playerId,
      p_limit: 20,
    });
    return NextResponse.json(data ?? []);
  }

  if (matchId) {
    if (!UUID_RE.test(matchId)) return NextResponse.json({ error: "Invalid matchId" }, { status: 400 });
    const { data } = await supabase
      .from("reviews")
      .select("*, profiles!reviewer_id(name, image)")
      .eq("match_id", matchId)
      .order("created_at", { ascending: false });
    return NextResponse.json(data ?? []);
  }

  return NextResponse.json({ error: "playerId or matchId required" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const { supabase, user, error } = await requireAuth();
  if (error) return error;

  const { body, error: bodyError } = await parseJsonBody<{ matchId?: string; playerId?: string; rating?: number; comment?: string }>(req, "Invalid JSON");
  if (bodyError) return bodyError;

  const { matchId, playerId, rating, comment } = body;
  if (!matchId || !playerId || !rating) {
    return NextResponse.json({ error: "matchId, playerId, and rating are required" }, { status: 400 });
  }
  if (!UUID_RE.test(matchId) || !UUID_RE.test(playerId)) {
    return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
  }
  if (playerId === user.id) {
    return NextResponse.json({ error: "Cannot review yourself" }, { status: 400 });
  }

  const { data: match } = await supabase
    .from("matches")
    .select("id, status")
    .eq("id", matchId)
    .single();

  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (match.status !== "COMPLETED") return NextResponse.json({ error: "Match not completed" }, { status: 400 });

  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("match_id", matchId)
    .eq("reviewer_id", user.id)
    .eq("player_id", playerId)
    .single();

  if (existing) return NextResponse.json({ error: "Already reviewed" }, { status: 400 });

  const { data: review, error: insertError } = await supabase
    .from("reviews")
    .insert({
      match_id: matchId,
      reviewer_id: user.id,
      player_id: playerId,
      rating,
      comment: comment?.trim() || null,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json(review, { status: 201 });
}
