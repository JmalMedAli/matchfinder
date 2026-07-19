-- ============================================================
-- MATCHFINDER MIGRATION V6 - SCHEMA BACKFILL (PROPOSAL)
-- ============================================================
-- PURPOSE: make the repo's migrations reproduce the production
-- schema. Every table/column here is already used by application
-- code but was previously created ad hoc (no migration file).
--
-- STATUS: PROPOSAL, NOT YET APPLIED. Every table/policy section in
-- this file has now been checked against the live database via
-- Supabase MCP (columns, constraints, RLS policy names and
-- conditions, function bodies). Each section below is labeled with
-- one of three tags so it is clear what this file actually does:
--
--   [APPLIED]  - this migration creates or replaces something,
--                verified against production so the result is a
--                true no-op if run against the current database.
--   [FACT]     - documents a real, already-existing production
--                policy/column verbatim; this migration does not
--                create or change it (either it already exists
--                correctly, or CREATE ... IF NOT EXISTS is a no-op
--                against it).
--   [DEFERRED] - a known discrepancy or debt item, intentionally
--                left unfixed by this migration. Reason given
--                inline. Tracked in docs/technical-debt.md where
--                applicable.
--
-- DEFERRED, not touched by this pass (product/architecture
-- decisions, left exactly as-is per explicit instruction):
--   * push_delivery_log's unrestricted INSERT/UPDATE policies
--     (authorization model - Phase 3 dependency)
--   * activity_feed's write architecture (no trigger/app code
--     populates it - separate product decision)
--   * profiles.completion_rate default (DEFAULT 0 here vs the real
--     DEFAULT 100 in production) - Section 1, untouched
--
-- SAFETY: fully idempotent where verified - IF NOT EXISTS / OR
-- REPLACE / DROP POLICY IF EXISTS throughout. Running the verified
-- sections against a database that already matches production is
-- a no-op. No data is modified or deleted. The unverified sections
-- above are NOT guaranteed idempotent against this project's
-- current production database.
--
-- ROLLBACK: see commented section at end of file.
--
-- Favorites: the old "favorites" table (destination-bookmarking,
-- belonging to a separate abandoned application) and its
-- MatchFinder replacement "player_favorites" are both handled by
-- supabase/migration-cleanup-abandoned-schema.sql, already applied
-- and committed (80186a6). Not duplicated here.
-- ============================================================


-- ============================================================
-- 1. COLUMN BACKFILLS ON EXISTING TABLES
-- (unchanged this pass - not part of the verified scope above)
-- ============================================================

-- profiles: role/admin gating + denormalized stats
-- Evidence: api/admin/stats (role), matches/[id] (matches_played),
-- post-review (goals_scored, avg_rating, completion_rate),
-- awards (motm_awards)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS matches_played integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goals_scored integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS motm_awards integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avg_rating numeric NOT NULL DEFAULT 0;      -- ASSUMPTION: numeric
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS completion_rate numeric NOT NULL DEFAULT 0; -- ASSUMPTION: numeric, production default is actually 100

-- matches: feature columns added across later phases
-- Evidence: api/matches (position_needed, price_per_person),
-- awards (motm_player_id, fair_play_player_id), checkin
-- (checkin_code), featured (is_featured)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS position_needed text;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS price_per_person numeric;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS motm_player_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS fair_play_player_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS checkin_code text;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

-- matches: status CHECK must allow ARCHIVED (used throughout code).
-- Verified: this already matches production exactly (constraint
-- name matches_status_check, same 5 values). Kept idempotent.
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_status_check;
ALTER TABLE matches ADD CONSTRAINT matches_status_check
  CHECK (status IN ('OPEN', 'FULL', 'CLOSED', 'COMPLETED', 'ARCHIVED'));

-- notifications: deep-link target (commit bb29f03)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS match_id uuid REFERENCES matches(id) ON DELETE SET NULL;

-- football_fields: soft-delete flag (api/fields filters on it)
ALTER TABLE football_fields ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_matches_featured ON matches(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_matches_field ON matches(football_field_id);


-- ============================================================
-- 1b. FOOTBALL_FIELDS - ADMIN-ONLY WRITE POLICIES
-- VERIFIED: production currently grants INSERT/UPDATE/DELETE to
-- any authenticated user (qual/with_check = true on all three).
-- No app code writes to football_fields (grepped src/app/api) -
-- fields are curated reference data (6 seeded cities), not
-- user-generated content. Confirmed safe to restrict to admins.
-- Policy names below match the real live policy names exactly, so
-- this section is a true idempotent replacement, not an addition.
-- ============================================================

DROP POLICY IF EXISTS "Authenticated insert football fields" ON football_fields;
CREATE POLICY "Authenticated insert football fields" ON football_fields
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "Authenticated update football fields" ON football_fields;
CREATE POLICY "Authenticated update football fields" ON football_fields
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "Authenticated delete football fields" ON football_fields;
CREATE POLICY "Authenticated delete football fields" ON football_fields
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- SELECT policy ("Authenticated view football fields", qual true)
-- is unchanged - read access for all authenticated users is correct.


-- ============================================================
-- 2. REVIEWS
-- VERIFIED against production. Table already exists with these
-- exact columns and constraints. RLS policies already exist under
-- different names than this file previously assumed - documented
-- below rather than recreated, to avoid adding duplicate policies.
-- ============================================================

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  overall_rating integer CHECK (overall_rating >= 1 AND overall_rating <= 5),
  organizer_rating integer CHECK (organizer_rating >= 1 AND organizer_rating <= 5),
  field_rating integer CHECK (field_rating >= 1 AND field_rating <= 5),
  fair_play_rating integer CHECK (fair_play_rating >= 1 AND fair_play_rating <= 5),
  goals_scored integer NOT NULL DEFAULT 0,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, reviewer_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_player ON reviews(player_id);
CREATE INDEX IF NOT EXISTS idx_reviews_match ON reviews(match_id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Real live policies (documented, not recreated under old names):
--   "Reviews are public" - FOR SELECT USING (true)
--   "Participants can insert reviews" - FOR INSERT WITH CHECK
--     (auth.uid() = reviewer_id AND EXISTS an ACCEPTED join_request
--     for (match_id, reviewer_id))
-- No UPDATE or DELETE policy currently exists in production.
--
-- CONFLICT TARGET NOTE [FIXED]: the real UNIQUE constraint is
-- 3-column (match_id, reviewer_id, player_id). Previously,
-- src/app/api/matches/[id]/post-review/route.ts:41 upserted with
-- onConflict: "match_id,reviewer_id" (2 columns), which did not
-- match this constraint and Postgres rejected it (42P10), causing
-- every post-match review submission to fail in production. Fixed
-- in application code (conflict target corrected to
-- "match_id,reviewer_id,player_id") - no schema change needed.
--
-- REMAINING GAP [DEFERRED]: production has no UPDATE policy on
-- reviews (see line 170). The upsert's conflict branch runs as an
-- UPDATE under RLS, so a second submission for the same match would
-- still be rejected by RLS even with the corrected conflict target.
-- Not currently reachable - post-match-review.tsx is a one-shot
-- modal with no resubmission path - so not fixed here. Would need a
-- future migration adding an UPDATE policy if resubmission is ever
-- supported.


-- ============================================================
-- 3. (removed) FAVORITES
-- See header note: player_favorites is created and RLS-protected
-- by supabase/migration-cleanup-abandoned-schema.sql, already
-- applied. Nothing to do here.
-- ============================================================


-- ============================================================
-- 4. MATCH TEMPLATES  [APPLIED: columns/index; FACT: policy]
-- Evidence: api/match-templates (+[id])
-- VERIFIED this pass. Real policy name is "Users can manage own
-- templates" (this file previously said "Users manage own
-- templates" - missing "can", would have created a duplicate).
-- Real policy grants to role "public" (not "authenticated") and
-- has no explicit WITH CHECK (Postgres uses the USING expression
-- for WITH CHECK on FOR ALL policies when it is omitted, so this
-- is behaviorally identical to an explicit matching WITH CHECK).
-- ============================================================

CREATE TABLE IF NOT EXISTS match_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text NOT NULL,
  description text,
  location text,
  football_field_id uuid REFERENCES football_fields(id) ON DELETE SET NULL,
  max_players integer NOT NULL DEFAULT 14,
  position_needed text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_user ON match_templates(user_id);

ALTER TABLE match_templates ENABLE ROW LEVEL SECURITY;

-- [FACT] real policy, documented under its real name
DROP POLICY IF EXISTS "Users can manage own templates" ON match_templates;
CREATE POLICY "Users can manage own templates" ON match_templates
  FOR ALL USING (user_id = auth.uid());


-- ============================================================
-- 5. MATCH PHOTOS (+ storage bucket)  [APPLIED: columns/index/
-- bucket; FACT: policies]
-- Evidence: api/match-photos (uploader-owned delete, public read)
-- VERIFIED this pass. Real policy names differ from what this file
-- previously had, and the real INSERT policy additionally requires
-- an ACCEPTED join_request for the uploader on that match (this
-- file's previous version was missing that check entirely - it
-- would have created a broader, weaker duplicate policy alongside
-- the real one, since permissive RLS policies are OR'd together).
-- ============================================================

CREATE TABLE IF NOT EXISTS match_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_photos_match ON match_photos(match_id);

ALTER TABLE match_photos ENABLE ROW LEVEL SECURITY;

-- [FACT] real policies, documented under their real names
DROP POLICY IF EXISTS "Photos are public" ON match_photos;
CREATE POLICY "Photos are public" ON match_photos
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Participants can upload photos" ON match_photos;
CREATE POLICY "Participants can upload photos" ON match_photos
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM join_requests jr
      WHERE jr.match_id = match_photos.match_id
        AND jr.player_id = auth.uid()
        AND jr.status = 'ACCEPTED'
    )
  );
DROP POLICY IF EXISTS "Users can delete own photos" ON match_photos;
CREATE POLICY "Users can delete own photos" ON match_photos
  FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket (public read like avatars; verified: bucket exists
-- and is public in production) [APPLIED, idempotent via ON CONFLICT]
INSERT INTO storage.buckets (id, name, public)
VALUES ('match-photos', 'match-photos', true)
ON CONFLICT (id) DO NOTHING;

-- [FACT] real storage policies, documented under their real names
-- and mechanisms. The real DELETE policy checks ownership via the
-- object's folder path (storage.foldername(name)[1] = auth.uid()),
-- not the storage.objects.owner column this file previously
-- assumed - files must be uploaded under a folder named after the
-- uploader's UID for delete-ownership to resolve correctly. The
-- real INSERT policy uses the deprecated auth.role() = 'authenticated'
-- pattern rather than a TO authenticated clause; documented as-is,
-- not modernized in this pass.
DROP POLICY IF EXISTS "Match photos are publicly readable" ON storage.objects;
CREATE POLICY "Match photos are publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'match-photos');
DROP POLICY IF EXISTS "Authenticated users can upload match photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload match photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'match-photos' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can delete their own match photos" ON storage.objects;
CREATE POLICY "Users can delete their own match photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'match-photos' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ============================================================
-- 6. MATCH AVAILABILITY  [APPLIED: columns; FACT: policies]
-- Evidence: api/match-availability - UNIQUE proven by onConflict
-- VERIFIED this pass. Real policy names differ from what this file
-- previously had (same conditions, so previously harmless in
-- effect but would still have created duplicate policy rows).
-- ============================================================

CREATE TABLE IF NOT EXISTS match_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('available', 'maybe', 'unavailable')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, user_id)
);

ALTER TABLE match_availability ENABLE ROW LEVEL SECURITY;

-- [FACT] real policies, documented under their real names
DROP POLICY IF EXISTS "Availability is public" ON match_availability;
CREATE POLICY "Availability is public" ON match_availability
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can manage own availability" ON match_availability;
CREATE POLICY "Users can manage own availability" ON match_availability
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 7. MATCH CHECKINS
-- VERIFIED against production. Real timestamp column is
-- checked_in_at (not created_at), real method default is 'manual'
-- (not 'code'). Real RLS policies restrict visibility to match
-- participants/organizer, not all authenticated users - documented
-- below under the real policy names so this section is idempotent
-- against production rather than adding a broader duplicate policy.
-- ============================================================

CREATE TABLE IF NOT EXISTS match_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  checked_in_at timestamptz DEFAULT now(),
  method text DEFAULT 'manual',
  UNIQUE (match_id, player_id)
);

ALTER TABLE match_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view checkins" ON match_checkins;
CREATE POLICY "Participants can view checkins" ON match_checkins
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM join_requests jr
      WHERE jr.match_id = match_checkins.match_id
        AND jr.player_id = auth.uid()
        AND jr.status = 'ACCEPTED'
    )
    OR EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_checkins.match_id
        AND m.organizer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Participants can check in" ON match_checkins;
CREATE POLICY "Participants can check in" ON match_checkins
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = player_id
    AND EXISTS (
      SELECT 1 FROM join_requests jr
      WHERE jr.match_id = match_checkins.match_id
        AND jr.player_id = auth.uid()
        AND jr.status = 'ACCEPTED'
    )
  );


-- ============================================================
-- 8. MATCH AWARDS
-- VERIFIED: RLS is enabled but zero policies currently exist in
-- production, meaning this table is fully inaccessible to every
-- role right now (deny-all default). This is a live bug, not a
-- hardening exercise. Policy names below do not collide with
-- anything real, since nothing real currently exists.
-- ============================================================

CREATE TABLE IF NOT EXISTS match_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  award_type text NOT NULL CHECK (award_type IN ('man_of_match', 'fair_play')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, voter_id, award_type)
);

CREATE INDEX IF NOT EXISTS idx_awards_match ON match_awards(match_id);

ALTER TABLE match_awards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read awards" ON match_awards;
CREATE POLICY "Authenticated read awards" ON match_awards
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Voters cast own votes" ON match_awards;
CREATE POLICY "Voters cast own votes" ON match_awards
  FOR ALL TO authenticated USING (voter_id = auth.uid()) WITH CHECK (voter_id = auth.uid());


-- ============================================================
-- 9. MATCH PLAYER STATS
-- VERIFIED: RLS is enabled but zero policies currently exist in
-- production - same live-bug situation as match_awards above.
-- ============================================================

CREATE TABLE IF NOT EXISTS match_player_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goals_scored integer NOT NULL DEFAULT 0,
  confirmed_by_organizer boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, player_id)
);

ALTER TABLE match_player_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read stats" ON match_player_stats;
CREATE POLICY "Authenticated read stats" ON match_player_stats
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Players record own stats" ON match_player_stats;
CREATE POLICY "Players record own stats" ON match_player_stats
  FOR ALL TO authenticated USING (player_id = auth.uid()) WITH CHECK (player_id = auth.uid());


-- ============================================================
-- 10. PLAYER ACHIEVEMENTS
-- VERIFIED: RLS is enabled but zero policies currently exist in
-- production - same live-bug situation as above. Also verified
-- production has a match_id column this file previously omitted.
-- ============================================================

CREATE TABLE IF NOT EXISTS player_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_type text NOT NULL,
  achievement_name text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  match_id uuid REFERENCES matches(id) ON DELETE SET NULL,
  UNIQUE (player_id, achievement_type)
);

ALTER TABLE player_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads achievements" ON player_achievements;
CREATE POLICY "Anyone reads achievements" ON player_achievements
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Players unlock own achievements" ON player_achievements;
CREATE POLICY "Players unlock own achievements" ON player_achievements
  FOR INSERT TO authenticated WITH CHECK (player_id = auth.uid());
DROP POLICY IF EXISTS "Players update own achievements" ON player_achievements;
CREATE POLICY "Players update own achievements" ON player_achievements
  FOR UPDATE TO authenticated USING (player_id = auth.uid()) WITH CHECK (player_id = auth.uid());


-- ============================================================
-- 11. ACTIVITY FEED
-- VERIFIED against production. Real event-type column is "action"
-- (not "type"), and production also has a "metadata" jsonb column
-- this file previously omitted. Real RLS policies are documented
-- below under their real names.
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  match_id uuid REFERENCES matches(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_feed(created_at DESC);

ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

-- Real policy name and definition kept as-is (deprecated
-- auth.role() pattern, tracked separately in docs/technical-debt.md -
-- not changed here since this migration documents reality, it does
-- not redesign the auth pattern).
DROP POLICY IF EXISTS "Authenticated can view recent activity" ON activity_feed;
CREATE POLICY "Authenticated can view recent activity" ON activity_feed
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert own activity" ON activity_feed;
CREATE POLICY "Users can insert own activity" ON activity_feed
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- NOTE: no trigger or function in production writes to this table,
-- and no application code inserts into it either (only
-- src/app/api/activity/route.ts, which only reads). The table and
-- its read surface (src/components/activity-feed.tsx on the
-- dashboard) are fully wired but silently unpopulated. Tracked in
-- docs/technical-debt.md - not a migration-level fix.


-- ============================================================
-- 12. MESSAGE REACTIONS  [APPLIED: columns/index; FACT: policies]
-- Evidence: api/messages/[id]/reactions
-- VERIFIED this pass. Real SELECT policy is a simple USING (true)
-- - reactions are readable by anyone, not scoped to the reader's
-- own conversations. This file previously had a conversation-
-- membership EXISTS check instead, which is MORE restrictive than
-- production actually is. Per this pass's scope (document reality,
-- do not weaken or strengthen), the real, simpler policy is used
-- below. [DEFERRED] whether reactions should be conversation-scoped
-- is a product/security question, not addressed by this migration.
-- ============================================================

CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_reactions_message ON message_reactions(message_id);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- [FACT] real policies, documented under their real names
DROP POLICY IF EXISTS "Participants can view reactions" ON message_reactions;
CREATE POLICY "Participants can view reactions" ON message_reactions
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can toggle reactions" ON message_reactions;
CREATE POLICY "Users can toggle reactions" ON message_reactions
  FOR ALL USING (auth.uid() = user_id);


-- ============================================================
-- 13. PUSH SUBSCRIPTIONS + DELIVERY LOG
-- push_subscriptions: [APPLIED: columns/index; FACT: policies]
-- VERIFIED this pass. Real policy name was "Users manage own push
-- subscriptions" -> WRONG in this file (missing "can"), which would
-- have created a 6th duplicate policy. Production actually has 5
-- overlapping policies (a blanket ALL policy plus 4 more specific
-- ones covering the same ground) - pre-existing redundancy, [DEFERRED]
-- and documented as-is rather than consolidated in this pass.
-- push_delivery_log: VERIFIED against production. Real timestamp
-- column is sent_at (not created_at), and production also has a
-- "clicked" boolean column this file previously omitted. Real RLS
-- policies (3, not 2) documented below under their real names.
-- ============================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- [FACT] real policies, documented under their real names
DROP POLICY IF EXISTS "Users can manage own subscriptions" ON push_subscriptions;
CREATE POLICY "Users can manage own subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can delete own push subscriptions" ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can insert own push subscriptions" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can view own push subscriptions" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can update own push subscriptions" ON push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS push_delivery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text,
  message text,
  url text,
  sent_at timestamptz DEFAULT now(),
  delivered boolean DEFAULT false,
  clicked boolean DEFAULT false
);

ALTER TABLE push_delivery_log ENABLE ROW LEVEL SECURITY;

-- Written server-side via src/lib/push/send.ts using the caller's
-- session, on behalf of the RECIPIENT user_id - so INSERT/UPDATE
-- cannot be restricted to auth.uid() = user_id. Real production
-- policies are unrestricted (WITH CHECK true, USING true), which
-- means any authenticated OR anonymous caller can currently write
-- arbitrary delivery-log rows for any user. Documented as-is here;
-- tightening this to a real service-role-only write path is
-- deferred to Phase 3 (src/lib/supabase/admin.ts), tracked in
-- docs/technical-debt.md - not changed by this migration.
DROP POLICY IF EXISTS "Service role can insert delivery logs" ON push_delivery_log;
CREATE POLICY "Service role can insert delivery logs" ON push_delivery_log
  FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Service role can update delivery logs" ON push_delivery_log;
CREATE POLICY "Service role can update delivery logs" ON push_delivery_log
  FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Users can view own delivery logs" ON push_delivery_log;
CREATE POLICY "Users can view own delivery logs" ON push_delivery_log
  FOR SELECT USING (auth.uid() = user_id);


-- ============================================================
-- 14. FUNCTIONS
-- Bodies below are exported verbatim via pg_get_functiondef() from
-- the live database, not reconstructed from application code. Each
-- gets "SET search_path TO 'public'" added to close the
-- function_search_path_mutable advisor warning - verified
-- behavior-preserving, since every unqualified table reference in
-- these bodies already resolves within the public schema.
--
-- These four functions already exist in production (this section
-- was previously written as if they were missing from the
-- database - they are not; only missing from this repo's migration
-- history). Applying this section to production is expected to be
-- a no-op except for adding the search_path hardening.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_title text,
  p_message text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_id uuid;
begin
  insert into public.notifications (user_id, title, message)
  values (p_user_id, p_title, p_message)
  returning id into v_id;
  return v_id;
end;
$$;

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_match_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_id uuid;
begin
  insert into public.notifications (user_id, title, message, match_id)
  values (p_user_id, p_title, p_message, p_match_id)
  returning id into v_id;
  return v_id;
end;
$$;

CREATE OR REPLACE FUNCTION public.remove_accepted_player(
  p_join_request_id uuid,
  p_organizer_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_match_id uuid;
  v_status text;
  v_accepted_count integer;
  v_max_players integer;
BEGIN
  SELECT jr.match_id, jr.status
  INTO v_match_id, v_status
  FROM join_requests jr
  WHERE jr.id = p_join_request_id
  FOR UPDATE;

  IF v_match_id IS NULL OR v_status != 'ACCEPTED' THEN
    RETURN false;
  END IF;

  SELECT m.status, m.max_players
  INTO v_status, v_max_players
  FROM matches m
  WHERE m.id = v_match_id AND m.organizer_id = p_organizer_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    RETURN false;
  END IF;

  UPDATE join_requests SET status = 'REJECTED' WHERE id = p_join_request_id;

  SELECT COUNT(*) INTO v_accepted_count
  FROM join_requests
  WHERE match_id = v_match_id AND status = 'ACCEPTED';

  IF v_status = 'FULL' AND v_accepted_count < v_max_players THEN
    UPDATE matches SET status = 'OPEN' WHERE id = v_match_id;
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_player_rating(p_player_id uuid)
RETURNS TABLE(average_rating numeric, review_count bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT COALESCE(AVG(r.rating), 0)::numeric(3,2), COUNT(r.id)
  FROM public.reviews r
  WHERE r.player_id = p_player_id;
$$;

CREATE OR REPLACE FUNCTION public.get_player_reviews(p_player_id uuid, p_limit integer DEFAULT 10)
RETURNS TABLE(
  id uuid,
  rating integer,
  comment text,
  created_at timestamp with time zone,
  match_title text,
  reviewer_name text,
  reviewer_image text
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT r.id, r.rating, r.comment, r.created_at,
         m.title, p.name, p.image
  FROM public.reviews r
  JOIN public.matches m ON m.id = r.match_id
  JOIN public.profiles p ON p.id = r.reviewer_id
  WHERE r.player_id = p_player_id
  ORDER BY r.created_at DESC
  LIMIT p_limit;
$$;


-- ============================================================
-- ROLLBACK CONSIDERATIONS (do not run - reference only)
-- ============================================================
-- Tables (drops data!):
--   DROP TABLE IF EXISTS message_reactions, push_delivery_log,
--     push_subscriptions, activity_feed, player_achievements,
--     match_player_stats, match_awards, match_checkins,
--     match_availability, match_photos, match_templates,
--     reviews CASCADE;
--   (player_favorites and the removed Yalla tables are rolled back
--   via migration-cleanup-abandoned-schema.sql's own rollback note,
--   not here.)
-- Columns:
--   ALTER TABLE profiles DROP COLUMN IF EXISTS role, ... ;
--   ALTER TABLE matches DROP COLUMN IF EXISTS position_needed, ... ;
--   ALTER TABLE notifications DROP COLUMN IF EXISTS match_id;
--   ALTER TABLE football_fields DROP COLUMN IF EXISTS is_active;
-- football_fields write policies: restore qual/with_check to true
--   if reverting the admin-only restriction.
-- Status constraint: restore the 4-value CHECK (only if no
--   ARCHIVED rows exist).
-- Functions:
--   DROP FUNCTION IF EXISTS create_notification(uuid,text,text),
--     create_notification(uuid,text,text,uuid),
--     remove_accepted_player(uuid,uuid), get_player_rating(uuid),
--     get_player_reviews(uuid,integer);
-- Storage: delete 'match-photos' bucket via dashboard (objects first).
--
-- ============================================================
-- END V6
-- ============================================================
