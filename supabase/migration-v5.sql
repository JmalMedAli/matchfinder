-- ============================================================
-- MATCHFINDER MIGRATION V5 — Chat System (DMs + Group Chat)
-- Run after migration-v4.sql
-- ============================================================


-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('dm', 'group')),
  match_id uuid REFERENCES matches(id) ON DELETE SET NULL,
  creator_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  title text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_match ON conversations(match_id);


-- ============================================================
-- RPC: get_or_create_dm
-- ============================================================

CREATE OR REPLACE FUNCTION get_or_create_dm(creator uuid, target uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conv_id uuid;
BEGIN
  -- Check for existing DM between the two users
  SELECT cp1.conversation_id INTO conv_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  JOIN conversations c ON c.id = cp1.conversation_id
  WHERE c.type = 'dm'
    AND cp1.user_id = creator
    AND cp2.user_id = target
  LIMIT 1;

  IF conv_id IS NOT NULL THEN
    RETURN conv_id;
  END IF;

  -- Create new DM conversation
  INSERT INTO conversations (type, creator_id)
  VALUES ('dm', creator)
  RETURNING id INTO conv_id;

  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (conv_id, creator), (conv_id, target);

  RETURN conv_id;
END;
$$;


-- ============================================================
-- RPC: get_unread_counts
-- ============================================================

CREATE OR REPLACE FUNCTION get_unread_counts(uid uuid)
RETURNS TABLE (conversation_id uuid, unread_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    cp.conversation_id,
    COUNT(m.id) AS unread_count
  FROM conversation_participants cp
  JOIN messages m ON m.conversation_id = cp.conversation_id
    AND m.created_at > cp.last_read_at
    AND m.sender_id != uid
  WHERE cp.user_id = uid
  GROUP BY cp.conversation_id;
$$;


-- ============================================================
-- TRIGGERS
-- ============================================================

-- 1) Auto-create group conversation + add organizer when match is created
CREATE OR REPLACE FUNCTION fn_on_match_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conv_id uuid;
BEGIN
  INSERT INTO conversations (type, match_id, creator_id, title)
  VALUES ('group', NEW.id, NEW.organizer_id, NEW.title)
  RETURNING id INTO conv_id;

  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (conv_id, NEW.organizer_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_match_created ON matches;
CREATE TRIGGER on_match_created
  AFTER INSERT ON matches
  FOR EACH ROW
  EXECUTE FUNCTION fn_on_match_created();


-- 2) Auto-add player to group conversation on ACCEPTED join request
CREATE OR REPLACE FUNCTION fn_on_join_request_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conv_id uuid;
BEGIN
  IF NEW.status = 'ACCEPTED' AND (OLD.status IS NULL OR OLD.status != 'ACCEPTED') THEN
    SELECT c.id INTO conv_id
    FROM conversations c
    WHERE c.type = 'group' AND c.match_id = NEW.match_id
    LIMIT 1;

    IF conv_id IS NOT NULL THEN
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES (conv_id, NEW.player_id)
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_join_request_accepted ON join_requests;
CREATE TRIGGER on_join_request_accepted
  AFTER UPDATE ON join_requests
  FOR EACH ROW
  EXECUTE FUNCTION fn_on_join_request_accepted();


-- 3) Auto-add player to group conversation on direct INSERT with ACCEPTED status
CREATE OR REPLACE FUNCTION fn_on_join_request_inserted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conv_id uuid;
BEGIN
  IF NEW.status = 'ACCEPTED' THEN
    SELECT c.id INTO conv_id
    FROM conversations c
    WHERE c.type = 'group' AND c.match_id = NEW.match_id
    LIMIT 1;

    IF conv_id IS NOT NULL THEN
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES (conv_id, NEW.player_id)
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_join_request_inserted ON join_requests;
CREATE TRIGGER on_join_request_inserted
  AFTER INSERT ON join_requests
  FOR EACH ROW
  EXECUTE FUNCTION fn_on_join_request_inserted();


-- 4) Remove player from group conversation when join request is REJECTED or WITHDRAWN
CREATE OR REPLACE FUNCTION fn_on_join_request_removed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conv_id uuid;
BEGIN
  IF NEW.status = 'REJECTED' AND (OLD.status IS NULL OR OLD.status != 'REJECTED') THEN
    SELECT c.id INTO conv_id
    FROM conversations c
    WHERE c.type = 'group' AND c.match_id = NEW.match_id
    LIMIT 1;

    IF conv_id IS NOT NULL THEN
      DELETE FROM conversation_participants
      WHERE conversation_id = conv_id AND user_id = NEW.player_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_join_request_removed ON join_requests;
CREATE TRIGGER on_join_request_removed
  AFTER UPDATE ON join_requests
  FOR EACH ROW
  EXECUTE FUNCTION fn_on_join_request_removed();


-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Conversations: users can see conversations they participate in
CREATE POLICY "Users see own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- Conversations: authenticated users can create
CREATE POLICY "Authenticated create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

-- Conversation participants: users can see participants of own conversations
CREATE POLICY "Users see participants of own conversations"
  ON conversation_participants FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- Conversation participants: system adds participants (via triggers with SECURITY DEFINER)
-- Users can also add themselves to DMs
CREATE POLICY "Authenticated add participants"
  ON conversation_participants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Messages: users can see messages in their conversations
CREATE POLICY "Users see messages in own conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- Messages: users can send messages in their conversations
CREATE POLICY "Authenticated send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- Update last_read_at for current user
CREATE POLICY "Users update own last_read"
  ON conversation_participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ============================================================
-- REALTIME PUBLICATION
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;


-- ============================================================
-- END V5
-- ============================================================
