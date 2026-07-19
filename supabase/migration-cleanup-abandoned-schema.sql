-- MatchFinder cleanup: remove the abandoned "Yalla" app's schema
-- footprint and add MatchFinder's own player_favorites table.
--
-- Confirmed via Supabase migration history (20260713171056,
-- "create_yalla_tables") that saved_trips, wishlist,
-- following_creators, saved_videos, community_bookmarks,
-- community_likes, and favorites were created together for a
-- separate application. Verified zero MatchFinder references
-- (source code, migrations, functions, triggers, foreign keys)
-- and zero rows in all seven tables before this migration.

-- 1. Create MatchFinder's player_favorites table
CREATE TABLE IF NOT EXISTS player_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, player_id)
);

-- 2. Enable RLS
ALTER TABLE player_favorites ENABLE ROW LEVEL SECURITY;

-- 3. Policies: authenticated users manage only their own rows
CREATE POLICY "Users view own favorites" ON player_favorites
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own favorites" ON player_favorites
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own favorites" ON player_favorites
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 4. Drop abandoned application tables
DROP TABLE IF EXISTS saved_trips;
DROP TABLE IF EXISTS wishlist;
DROP TABLE IF EXISTS following_creators;
DROP TABLE IF EXISTS saved_videos;
DROP TABLE IF EXISTS community_bookmarks;
DROP TABLE IF EXISTS community_likes;
DROP TABLE IF EXISTS favorites;
