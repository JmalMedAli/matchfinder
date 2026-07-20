import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/api/helpers";
import { logger } from "@/lib/logger";
import { notifyUser } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { data, error } = await supabase
    .from("match_reviews")
    .select("id, overall_rating, comment")
    .eq("match_id", id)
    .eq("reviewer_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? null);
}

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
    comment,
    goalsScored,
  } = body;

  const { data: match } = await supabase
    .from("matches")
    .select("organizer_id, football_field_id")
    .eq("id", id)
    .single();

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // Own experience report for this match - never a rating of a player.
  const { error: matchReviewError } = await supabase
    .from("match_reviews")
    .upsert(
      { match_id: id, reviewer_id: user.id, overall_rating: overallRating, comment: comment || null },
      { onConflict: "match_id,reviewer_id" },
    );

  if (matchReviewError) {
    return NextResponse.json({ error: matchReviewError.message }, { status: 500 });
  }

  // Rate the organizer as a player - skipped entirely if you organized
  // your own match, since players must never rate themselves.
  if (organizerRating && match.organizer_id !== user.id) {
    const { error } = await supabase
      .from("reviews")
      .upsert(
        { match_id: id, reviewer_id: user.id, player_id: match.organizer_id, rating: organizerRating },
        { onConflict: "match_id,reviewer_id,player_id" },
      );
    if (error) logger.warn("post-review: failed to record organizer rating", { matchId: id, error: error.message });
  }

  // Rate the field - not a player rating, feeds football_fields.rating.
  if (fieldRating && match.football_field_id) {
    const { error } = await supabase
      .from("field_reviews")
      .upsert(
        { field_id: match.football_field_id, reviewer_id: user.id, rating: fieldRating, match_id: id },
        { onConflict: "field_id,reviewer_id" },
      );
    if (error) logger.warn("post-review: failed to record field rating", { matchId: id, error: error.message });
  }

  // Upsert stats
  if (goalsScored && goalsScored > 0) {
    const { error } = await supabase
      .from("match_player_stats")
      .upsert(
        { match_id: id, player_id: user.id, goals_scored: goalsScored },
        { onConflict: "match_id,player_id" },
      );
    if (error) logger.warn("post-review: failed to record match stats", { matchId: id, error: error.message });

    // Update profile goals
    const { data: profile } = await supabase.from("profiles").select("goals_scored").eq("id", user.id).single();
    if (profile) {
      await supabase.from("profiles").update({ goals_scored: (profile.goals_scored ?? 0) + goalsScored }).eq("id", user.id);
    }
  }

  // profiles.avg_rating is kept in sync by a database trigger on reviews
  // (reviews received, not reviews given) - no app-side recalculation here.

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

  // Community Favorite (avg rating >= 4.5 with 5+ reviews received)
  const { data: reviewData } = await supabase
    .from("reviews")
    .select("rating")
    .eq("player_id", playerId);
  if (reviewData && reviewData.length >= 5) {
    const avg = reviewData.reduce((s, r) => s + r.rating, 0) / reviewData.length;
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

  // Insert newly unlocked achievements - ignoreDuplicates so an already
  // unlocked achievement isn't rewritten (and so we can tell it was new).
  for (const ach of achievements) {
    if (ach.condition) {
      const { data: inserted, error } = await supabase
        .from("player_achievements")
        .upsert(
          { player_id: playerId, achievement_type: ach.type, achievement_name: ach.name },
          { onConflict: "player_id,achievement_type", ignoreDuplicates: true },
        )
        .select();

      if (error) {
        logger.warn("post-review: failed to unlock achievement", { playerId, type: ach.type, error: error.message });
        continue;
      }

      if (inserted && inserted.length > 0) {
        await notifyUser({
          userId: playerId,
          title: "Achievement unlocked!",
          message: `You unlocked "${ach.name}".`,
          skipEmail: true,
        });
      }
    }
  }
}
