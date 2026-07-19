import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user, error: authError } = await requireAuth();
  if (authError) return authError;

  const body = await req.json();
  const {
    overallRating,
    organizerRating,
    fieldRating,
    fairPlayRating,
    comment,
    goalsScored,
  } = body;

  // Upsert review
  const { error: reviewError } = await supabase
    .from("reviews")
    .upsert(
      {
        match_id: id,
        reviewer_id: user.id,
        player_id: user.id,
        overall_rating: overallRating,
        organizer_rating: organizerRating,
        field_rating: fieldRating,
        fair_play_rating: fairPlayRating,
        comment: comment || null,
        rating: overallRating,
        goals_scored: goalsScored ?? 0,
      },
      { onConflict: "match_id,reviewer_id" },
    );

  if (reviewError) {
    return NextResponse.json({ error: reviewError.message }, { status: 500 });
  }

  // Upsert stats
  if (goalsScored && goalsScored > 0) {
    await supabase
      .from("match_player_stats")
      .upsert(
        { match_id: id, player_id: user.id, goals_scored: goalsScored },
        { onConflict: "match_id,player_id" },
      );

    // Update profile goals
    const { data: profile } = await supabase.from("profiles").select("goals_scored").eq("id", user.id).single();
    if (profile) {
      await supabase.from("profiles").update({ goals_scored: (profile.goals_scored ?? 0) + goalsScored }).eq("id", user.id);
    }
  }

  // Update profile avg_rating
  const { data: reviews } = await supabase
    .from("reviews")
    .select("overall_rating")
    .eq("reviewer_id", user.id)
    .not("overall_rating", "is", null);

  if (reviews && reviews.length > 0) {
    const avg = reviews.reduce((sum, r) => sum + (r.overall_rating ?? 0), 0) / reviews.length;
    await supabase.from("profiles").update({ avg_rating: Math.round(avg * 10) / 10 }).eq("id", user.id);
  }

  // Check achievements
  await checkAndUnlockAchievements(supabase, user.id);

  return NextResponse.json({ success: true });
}

async function checkAndUnlockAchievements(supabase: Awaited<ReturnType<typeof createClient>>, playerId: string) {
  const achievements: { type: string; name: string; condition: boolean }[] = [];

  // Get profile stats
  const { data: profile } = await supabase
    .from("profiles")
    .select("matches_played, goals_scored, motm_awards")
    .eq("id", playerId)
    .single();

  if (profile) {
    achievements.push(
      { type: "first_match", name: "First Match", condition: profile.matches_played >= 1 },
      { type: "first_goal", name: "First Goal", condition: profile.goals_scored >= 1 },
      { type: "matches_10", name: "10 Matches Played", condition: profile.matches_played >= 10 },
      { type: "matches_25", name: "25 Matches Played", condition: profile.matches_played >= 25 },
      { type: "motm_5", name: "5 Man of the Match Awards", condition: profile.motm_awards >= 5 },
    );

    // Hat-trick (3+ goals in a single match)
    const { data: hatTrick } = await supabase
      .from("match_player_stats")
      .select("id")
      .eq("player_id", playerId)
      .gte("goals_scored", 3)
      .limit(1);
    achievements.push({ type: "hat_trick", name: "Hat-Trick", condition: (hatTrick?.length ?? 0) > 0 });
  }

  // Community Favorite (avg rating >= 4.5 with 5+ reviews)
  const { data: reviewData } = await supabase
    .from("reviews")
    .select("overall_rating")
    .eq("player_id", playerId)
    .not("overall_rating", "is", null);
  if (reviewData && reviewData.length >= 5) {
    const avg = reviewData.reduce((s, r) => s + (r.overall_rating ?? 0), 0) / reviewData.length;
    achievements.push({ type: "community_favorite", name: "Community Favorite", condition: avg >= 4.5 });
  }

  // Reliable Player (matches_played >= 5, completion_rate >= 90)
  if (profile && profile.matches_played >= 5) {
    const { data: p } = await supabase.from("profiles").select("completion_rate").eq("id", playerId).single();
    achievements.push({ type: "reliable_player", name: "Reliable Player", condition: (p?.completion_rate ?? 0) >= 90 });
  }

  // Top Organizer (organized 10+ matches with avg rating >= 4)
  const { count: organized } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("organizer_id", playerId);
  if ((organized ?? 0) >= 10) {
    achievements.push({ type: "top_organizer", name: "Top Organizer", condition: true });
  }

  // Insert newly unlocked achievements
  for (const ach of achievements) {
    if (ach.condition) {
      await supabase
        .from("player_achievements")
        .upsert(
          { player_id: playerId, achievement_type: ach.type, achievement_name: ach.name },
          { onConflict: "player_id,achievement_type" },
        );
    }
  }
}
