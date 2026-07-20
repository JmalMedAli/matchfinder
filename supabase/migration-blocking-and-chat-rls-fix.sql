-- Applied to production as three migrations via mcp__supabase__apply_migration:
--   stage_c_blocking_and_chat_rls_fix
--   stage_c_get_or_create_dm_identity_fix (corrective follow-up)
--   stage_c_block_rate_limit_policy
-- Mirrored here per repo convention — this file documents what's live, it
-- was not itself run through the CLI.

-- ============================================================
-- 1) blocked_users
-- ============================================================
create table if not exists public.blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists blocked_users_blocker_idx on public.blocked_users (blocker_id);
create index if not exists blocked_users_blocked_idx on public.blocked_users (blocked_id);
alter table public.blocked_users enable row level security;
create policy "Users can view their own blocks" on public.blocked_users for select using (auth.uid() = blocker_id);
create policy "Users can create their own blocks" on public.blocked_users for insert with check (auth.uid() = blocker_id);
create policy "Users can delete their own blocks" on public.blocked_users for delete using (auth.uid() = blocker_id);

-- ============================================================
-- 2) CRITICAL pre-existing bug fix: chat RLS infinite recursion.
--
-- conversation_participants' own SELECT policy filters rows via a subquery
-- on itself (`conversation_id IN (SELECT ... FROM conversation_participants
-- WHERE user_id = auth.uid())`). That self-reference is safe in isolation,
-- but conversations' and messages' policies ALSO reference
-- conversation_participants from their own policies. Nesting a table's
-- self-referential RLS inside another table's RLS check is a genuine
-- Postgres infinite-recursion trap.
--
-- Confirmed by testing directly against production (SET ROLE authenticated,
-- not the postgres/bypass-RLS role every prior execute_sql call in this
-- project's history used): a bare `select * from conversation_participants`
-- recursed, as did every SELECT/INSERT touching conversations or messages.
-- `messages` had zero rows in production. As far as can be determined, chat
-- had never successfully sent a message under real RLS -- this was invisible
-- because all prior manual testing ran with RLS bypassed.
--
-- Fixed the same way is_admin()/is_staff() already break equivalent cycles
-- for their own tables: a SECURITY DEFINER helper whose internal read
-- bypasses RLS entirely (owned by a privileged role), so referencing it from
-- another table's policy can't re-trigger the self-reference.
-- ============================================================
create or replace function public.is_conversation_participant(p_conversation_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from conversation_participants where conversation_id = p_conversation_id and user_id = p_user_id);
$$;
revoke execute on function public.is_conversation_participant(uuid, uuid) from public, anon;
grant execute on function public.is_conversation_participant(uuid, uuid) to authenticated;

alter policy "Users see participants of own conversations" on public.conversation_participants
using (public.is_conversation_participant(conversation_id, auth.uid()));
alter policy "Users see own conversations" on public.conversations
using (public.is_conversation_participant(id, auth.uid()));
alter policy "Users see messages in own conversations" on public.messages
using (public.is_conversation_participant(conversation_id, auth.uid()));

-- ============================================================
-- 3) get_or_create_dm: refuse creating a DM between a blocked pair, verify
-- caller identity, add the SET search_path this function was missing.
--
-- This already reflects the fixed, deployed design (auth.uid() = creator
-- enforced) rather than the vulnerable intermediate version: the original
-- function took creator/target as fully caller-supplied parameters with no
-- check that auth.uid() = creator, so any authenticated caller could pass an
-- arbitrary creator id and insert themselves into a DM with an unwilling
-- victim (bypassing consent, though not the block check itself, since that
-- still evaluates the real ids involved). The app route
-- (src/app/api/conversations/route.ts) already always passes creator:
-- user.id, so this tightening changes no legitimate behavior.
-- ============================================================
create or replace function public.get_or_create_dm(creator uuid, target uuid)
returns uuid language plpgsql security definer set search_path = public as $$
DECLARE conv_id uuid;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> creator THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF EXISTS (SELECT 1 FROM blocked_users WHERE (blocker_id = creator AND blocked_id = target) OR (blocker_id = target AND blocked_id = creator)) THEN
    RAISE EXCEPTION 'blocked';
  END IF;
  SELECT cp1.conversation_id INTO conv_id FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  JOIN conversations c ON c.id = cp1.conversation_id
  WHERE c.type = 'dm' AND cp1.user_id = creator AND cp2.user_id = target LIMIT 1;
  IF conv_id IS NOT NULL THEN RETURN conv_id; END IF;
  INSERT INTO conversations (type, creator_id) VALUES ('dm', creator) RETURNING id INTO conv_id;
  INSERT INTO conversation_participants (conversation_id, user_id) VALUES (conv_id, creator), (conv_id, target);
  RETURN conv_id;
END;
$$;
revoke execute on function public.get_or_create_dm(uuid, uuid) from public, anon;
grant execute on function public.get_or_create_dm(uuid, uuid) to authenticated;

-- ============================================================
-- 4) messages: refuse sending into a DM where either party blocked the other
-- ============================================================
create or replace function public.is_dm_blocked(p_conversation_id uuid, p_sender_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from conversations c
    join conversation_participants cp on cp.conversation_id = c.id and cp.user_id <> p_sender_id
    join blocked_users b on (b.blocker_id = p_sender_id and b.blocked_id = cp.user_id)
                          or (b.blocker_id = cp.user_id and b.blocked_id = p_sender_id)
    where c.id = p_conversation_id and c.type = 'dm'
  );
$$;
revoke execute on function public.is_dm_blocked(uuid, uuid) from public, anon;
grant execute on function public.is_dm_blocked(uuid, uuid) to authenticated;

alter policy "Authenticated send messages" on public.messages
with check (
  sender_id = auth.uid()
  and public.is_conversation_participant(conversation_id, auth.uid())
  and not public.is_dm_blocked(conversation_id, auth.uid())
);

-- ============================================================
-- 5) join_requests: refuse a request between a blocked organizer/player pair
--    (both pre-existing near-duplicate INSERT policies updated identically --
--    the duplication itself is pre-existing debt, not addressed here)
-- ============================================================
alter policy "Create join requests" on public.join_requests
with check (
  auth.uid() = player_id and not exists (
    select 1 from matches m join blocked_users b
      on (b.blocker_id = join_requests.player_id and b.blocked_id = m.organizer_id)
      or (b.blocker_id = m.organizer_id and b.blocked_id = join_requests.player_id)
    where m.id = join_requests.match_id
  )
);
alter policy "Players can insert own join requests" on public.join_requests
with check (
  auth.uid() = player_id and not exists (
    select 1 from matches m join blocked_users b
      on (b.blocker_id = join_requests.player_id and b.blocked_id = m.organizer_id)
      or (b.blocker_id = m.organizer_id and b.blocked_id = join_requests.player_id)
    where m.id = join_requests.match_id
  )
);

-- ============================================================
-- 6) rate limit policy for the new POST /api/blocks endpoint
-- ============================================================
insert into public.rate_limit_policies (scope, max_requests, window_seconds) values ('block-user', 20, 60) on conflict (scope) do nothing;

-- Every statement above was exercised end-to-end against production inside a
-- rolled-back transaction (real SET ROLE authenticated + request.jwt.claims,
-- not the postgres/bypass-RLS role) before being applied for real: block
-- insert, DM creation blocked/unblocked, message send blocked/unblocked,
-- join request blocked/unblocked, identity-spoofing rejected, and the three
-- previously-recursing SELECTs confirmed no longer recursing.
