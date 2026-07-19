import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/helpers";

export async function GET() {
  const { supabase, error: authError } = await requireAuth();
  if (authError) return authError;

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, name, image, position, city")
    .limit(50);

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  const leaderboard = await Promise.all(
    (profiles ?? []).map(async (p) => {
      const { count: matchesPlayed } = await supabase
        .from("join_requests")
        .select("*", { count: "exact", head: true })
        .eq("player_id", p.id)
        .eq("status", "ACCEPTED");

      const { count: matchesOrganized } = await supabase
        .from("matches")
        .select("*", { count: "exact", head: true })
        .eq("organizer_id", p.id);

      const { data: reviews } = await supabase
        .from("reviews")
        .select("rating")
        .eq("player_id", p.id);

      const avgRating = reviews && reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

      return {
        ...p,
        matches_played: matchesPlayed ?? 0,
        matches_organized: matchesOrganized ?? 0,
        avg_rating: Math.round(avgRating * 10) / 10,
        review_count: reviews?.length ?? 0,
      };
    })
  );

  leaderboard.sort((a, b) => b.matches_played - a.matches_played || b.avg_rating - a.avg_rating);

  return NextResponse.json(leaderboard.slice(0, 20));
}
