-- Post-match reliability + no-self-rating redesign.
--
-- Product decision: players must never rate themselves. Reviews split into
-- two concepts:
--   1. reviews        - person rates ANOTHER player (peer trust rating).
--                        Organizer rating now flows through here too
--                        (reviewer -> organizer, skipped when reviewer IS
--                        the organizer).
--   2. match_reviews   - person's own experience report for a match
--                        (overall rating + comment). Not a rating of any
--                        player, so it can never violate the self-rating
--                        rule.
--   3. field_reviews   - person's rating of a venue (not match-scoped -
--                        one canonical review per person per field,
--                        editable, matches how football_fields.rating /
--                        review_count were already meant to be fed).
-- goals_scored is a stat, not a rating - it already has a correct home
-- in match_player_stats and is not duplicated anywhere new.
--
-- Verified via Supabase MCP before writing this file: reviews,
-- match_awards, match_player_stats, player_achievements all have 0 rows
-- in production. This is a clean-slate schema change - no backfill.
--
-- match_awards / match_player_stats / player_achievements currently have
-- RLS enabled with ZERO policies (deny-all for every role). That gap is
-- fixed here because it blocks the awards/stats/achievements half of this
-- same feature from working at all - not a separate, deferred concern.

-- ============================================================
-- 1. REVIEWS - evolve into strictly player-to-player
-- ============================================================

ALTER TABLE reviews ADD CONSTRAINT reviews_no_self_rating CHECK (reviewer_id <> player_id);

ALTER TABLE reviews DROP COLUMN IF EXISTS overall_rating;
ALTER TABLE reviews DROP COLUMN IF EXISTS organizer_rating;
ALTER TABLE reviews DROP COLUMN IF EXISTS field_rating;
ALTER TABLE reviews DROP COLUMN IF EXISTS fair_play_rating;
ALTER TABLE reviews DROP COLUMN IF EXISTS goals_scored;

-- Keep profiles.avg_rating in sync with reviews RECEIVED (player_id),
-- replacing the old app-side logic that incorrectly used reviewer_id.
CREATE OR REPLACE FUNCTION public.sync_player_avg_rating()
RETURNS trigger AS $$
DECLARE
  v_avg numeric;
BEGIN
  SELECT average_rating INTO v_avg FROM public.get_player_rating(NEW.player_id);
  UPDATE public.profiles SET avg_rating = COALESCE(v_avg, 0) WHERE id = NEW.player_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

DROP TRIGGER IF EXISTS trg_sync_player_avg_rating ON reviews;
CREATE TRIGGER trg_sync_player_avg_rating
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION public.sync_player_avg_rating();

-- ============================================================
-- 2. MATCH_REVIEWS (new) - a person's own report of a match
-- ============================================================

CREATE TABLE IF NOT EXISTS match_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  overall_rating integer NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, reviewer_id)
);

ALTER TABLE match_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Match reviews are public" ON match_reviews
  FOR SELECT USING (true);

CREATE POLICY "Participants can insert match reviews" ON match_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM join_requests jr
      WHERE jr.match_id = match_reviews.match_id
        AND jr.player_id = reviewer_id
        AND jr.status = 'ACCEPTED'
    )
  );

-- ============================================================
-- 3. FIELD_REVIEWS (new) - a person's rating of a venue
-- ============================================================

CREATE TABLE IF NOT EXISTS field_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id uuid NOT NULL REFERENCES football_fields(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  match_id uuid REFERENCES matches(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (field_id, reviewer_id)
);

ALTER TABLE field_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Field reviews are public" ON field_reviews
  FOR SELECT USING (true);

CREATE POLICY "Participants can insert field reviews" ON field_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM join_requests jr
      JOIN matches m ON m.id = jr.match_id
      WHERE m.football_field_id = field_reviews.field_id
        AND jr.player_id = reviewer_id
        AND jr.status = 'ACCEPTED'
    )
  );

-- Keep football_fields.rating / review_count in sync (columns already
-- existed, unused until now).
CREATE OR REPLACE FUNCTION public.sync_field_rating()
RETURNS trigger AS $$
DECLARE
  v_field_id uuid := COALESCE(NEW.field_id, OLD.field_id);
  v_avg numeric;
  v_count integer;
BEGIN
  SELECT COALESCE(AVG(rating), 0)::numeric(3,2), COUNT(*)
    INTO v_avg, v_count
    FROM public.field_reviews WHERE field_id = v_field_id;
  UPDATE public.football_fields SET rating = v_avg, review_count = v_count WHERE id = v_field_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

DROP TRIGGER IF EXISTS trg_sync_field_rating ON field_reviews;
CREATE TRIGGER trg_sync_field_rating
  AFTER INSERT OR UPDATE OR DELETE ON field_reviews
  FOR EACH ROW EXECUTE FUNCTION public.sync_field_rating();

-- ============================================================
-- 4. MATCH_AWARDS - self-vote guard + the RLS fix it needs to
--    function at all (was enabled with zero policies)
-- ============================================================

ALTER TABLE match_awards ADD CONSTRAINT match_awards_no_self_vote CHECK (voter_id <> recipient_id);

DROP POLICY IF EXISTS "Authenticated read awards" ON match_awards;
CREATE POLICY "Authenticated read awards" ON match_awards
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Voters cast own votes" ON match_awards;
CREATE POLICY "Voters cast own votes" ON match_awards
  FOR ALL TO authenticated USING (voter_id = auth.uid()) WITH CHECK (voter_id = auth.uid());

-- ============================================================
-- 5. MATCH_PLAYER_STATS - RLS fix (same deny-all gap)
-- ============================================================

DROP POLICY IF EXISTS "Authenticated read stats" ON match_player_stats;
CREATE POLICY "Authenticated read stats" ON match_player_stats
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Players record own stats" ON match_player_stats;
CREATE POLICY "Players record own stats" ON match_player_stats
  FOR ALL TO authenticated USING (player_id = auth.uid()) WITH CHECK (player_id = auth.uid());

-- ============================================================
-- 6. PLAYER_ACHIEVEMENTS - RLS fix (same deny-all gap)
-- ============================================================

DROP POLICY IF EXISTS "Anyone reads achievements" ON player_achievements;
CREATE POLICY "Anyone reads achievements" ON player_achievements
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Players unlock own achievements" ON player_achievements;
CREATE POLICY "Players unlock own achievements" ON player_achievements
  FOR ALL TO authenticated USING (player_id = auth.uid()) WITH CHECK (player_id = auth.uid());

-- ============================================================
-- Rollback notes
-- ============================================================
-- All tables touched here (reviews, match_awards, match_player_stats,
-- player_achievements) had 0 rows at the time of writing, and
-- match_reviews / field_reviews are brand new - so rollback is a pure
-- schema reversal with no data to reconcile:
--   DROP TRIGGER trg_sync_field_rating ON field_reviews;
--   DROP TRIGGER trg_sync_player_avg_rating ON reviews;
--   DROP FUNCTION public.sync_field_rating();
--   DROP FUNCTION public.sync_player_avg_rating();
--   DROP TABLE field_reviews;
--   DROP TABLE match_reviews;
--   ALTER TABLE reviews DROP CONSTRAINT reviews_no_self_rating;
--   ALTER TABLE reviews ADD COLUMN overall_rating integer, ADD COLUMN
--     organizer_rating integer, ADD COLUMN field_rating integer, ADD
--     COLUMN fair_play_rating integer, ADD COLUMN goals_scored integer;
--   ALTER TABLE match_awards DROP CONSTRAINT match_awards_no_self_vote;
--   (policies added in sections 4-6 can be dropped individually by name
--   if ever reverted; not repeated here for brevity)
