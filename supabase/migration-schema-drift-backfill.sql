-- Documentation-only migration. Every statement is IF NOT EXISTS / guarded,
-- so this is a no-op against production -- it exists purely so the schema
-- (8 tables + 4 `matches` columns that predated any migration file in this
-- repo) is reconstructable from the repo, per docs/technical-debt.md's
-- schema-drift register. Captured directly from the live database via
-- list_tables/execute_sql (verbose column/FK/policy/index introspection),
-- not guessed. No application code changes; applied to production as
-- schema_drift_backfill.

-- ============================================================
-- matches: 4 columns that predated any migration file
-- ============================================================
alter table public.matches add column if not exists position_needed text;
alter table public.matches add column if not exists price_per_person numeric;
alter table public.matches add column if not exists motm_player_id uuid references public.profiles(id);
alter table public.matches add column if not exists fair_play_player_id uuid references public.profiles(id);

-- ============================================================
-- match_templates — a player's saved match presets, reused on /dashboard/matches/new
-- ============================================================
create table if not exists public.match_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  name text not null,
  title text not null,
  description text,
  location text,
  football_field_id uuid references public.football_fields(id),
  max_players integer default 14,
  position_needed text,
  created_at timestamptz default now()
);
alter table public.match_templates enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'match_templates' and policyname = 'Users can manage own templates') then
    create policy "Users can manage own templates" on public.match_templates for all using (auth.uid() = user_id);
  end if;
end $$;

-- ============================================================
-- match_photos — post-match photo gallery, one per accepted participant upload
-- ============================================================
create table if not exists public.match_photos (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id),
  user_id uuid not null references public.profiles(id),
  storage_path text not null,
  caption text,
  created_at timestamptz default now()
);
create index if not exists idx_match_photos_match_id on public.match_photos (match_id);
alter table public.match_photos enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'match_photos' and policyname = 'Photos are public') then
    create policy "Photos are public" on public.match_photos for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'match_photos' and policyname = 'Participants can upload photos') then
    create policy "Participants can upload photos" on public.match_photos for insert
      with check (auth.uid() = user_id and exists (
        select 1 from join_requests jr where jr.match_id = match_photos.match_id and jr.player_id = auth.uid() and jr.status = 'ACCEPTED'
      ));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'match_photos' and policyname = 'Users can delete own photos') then
    create policy "Users can delete own photos" on public.match_photos for delete using (auth.uid() = user_id);
  end if;
end $$;

-- ============================================================
-- match_availability — pre-match "in/maybe/out" poll per player
-- ============================================================
create table if not exists public.match_availability (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id),
  user_id uuid not null references public.profiles(id),
  status text not null default 'available' check (status in ('available', 'maybe', 'unavailable')),
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (match_id, user_id)
);
create index if not exists idx_match_availability_match on public.match_availability (match_id);
alter table public.match_availability enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'match_availability' and policyname = 'Availability is public') then
    create policy "Availability is public" on public.match_availability for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'match_availability' and policyname = 'Users can manage own availability') then
    create policy "Users can manage own availability" on public.match_availability for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- ============================================================
-- match_checkins — post-match-day check-in, gates the review/awards flow
-- ============================================================
create table if not exists public.match_checkins (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id),
  player_id uuid not null references public.profiles(id),
  checked_in_at timestamptz default now(),
  method text default 'manual',
  unique (match_id, player_id)
);
alter table public.match_checkins enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'match_checkins' and policyname = 'Participants can view checkins') then
    create policy "Participants can view checkins" on public.match_checkins for select using (
      exists (select 1 from join_requests jr where jr.match_id = match_checkins.match_id and jr.player_id = auth.uid() and jr.status = 'ACCEPTED')
      or exists (select 1 from matches m where m.id = match_checkins.match_id and m.organizer_id = auth.uid())
    );
  end if;
  if not exists (select 1 from pg_policies where tablename = 'match_checkins' and policyname = 'Participants can check in') then
    create policy "Participants can check in" on public.match_checkins for insert
      with check (auth.uid() = player_id and exists (
        select 1 from join_requests jr where jr.match_id = match_checkins.match_id and jr.player_id = auth.uid() and jr.status = 'ACCEPTED'
      ));
  end if;
end $$;

-- ============================================================
-- activity_feed — dashboard-home social feed of recent player actions
-- ============================================================
create table if not exists public.activity_feed (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  action text not null,
  match_id uuid references public.matches(id),
  target_user_id uuid references public.profiles(id),
  metadata jsonb,
  created_at timestamptz default now()
);
alter table public.activity_feed enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'activity_feed' and policyname = 'Authenticated can view recent activity') then
    create policy "Authenticated can view recent activity" on public.activity_feed for select using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'activity_feed' and policyname = 'Users can insert own activity') then
    create policy "Users can insert own activity" on public.activity_feed for insert with check (auth.uid() = user_id);
  end if;
end $$;

-- ============================================================
-- message_reactions — emoji reactions on chat messages
-- ============================================================
create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id),
  user_id uuid not null references public.profiles(id),
  emoji text not null,
  created_at timestamptz default now(),
  unique (message_id, user_id, emoji)
);
alter table public.message_reactions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'message_reactions' and policyname = 'Participants can view reactions') then
    create policy "Participants can view reactions" on public.message_reactions for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'message_reactions' and policyname = 'Users can toggle reactions') then
    create policy "Users can toggle reactions" on public.message_reactions for all using (auth.uid() = user_id);
  end if;
end $$;

-- ============================================================
-- push_subscriptions — web push endpoint registrations
-- ============================================================
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz default now(),
  unique (user_id, endpoint)
);
create unique index if not exists idx_push_subscriptions_endpoint on public.push_subscriptions (endpoint);
alter table public.push_subscriptions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'push_subscriptions' and policyname = 'Users can view own push subscriptions') then
    create policy "Users can view own push subscriptions" on public.push_subscriptions for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'push_subscriptions' and policyname = 'Users can insert own push subscriptions') then
    create policy "Users can insert own push subscriptions" on public.push_subscriptions for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'push_subscriptions' and policyname = 'Users can update own push subscriptions') then
    create policy "Users can update own push subscriptions" on public.push_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'push_subscriptions' and policyname = 'Users can delete own push subscriptions') then
    create policy "Users can delete own push subscriptions" on public.push_subscriptions for delete using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'push_subscriptions' and policyname = 'Users can manage own subscriptions') then
    create policy "Users can manage own subscriptions" on public.push_subscriptions for all using (auth.uid() = user_id);
  end if;
end $$;

-- ============================================================
-- push_delivery_log — per-notification push delivery/click tracking
-- ============================================================
create table if not exists public.push_delivery_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  title text not null,
  message text not null,
  url text,
  sent_at timestamptz default now(),
  delivered boolean default false,
  clicked boolean default false
);
create index if not exists idx_push_delivery_log_user_sent on public.push_delivery_log (user_id, sent_at desc);
alter table public.push_delivery_log enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'push_delivery_log' and policyname = 'Users can view own delivery logs') then
    create policy "Users can view own delivery logs" on public.push_delivery_log for select using (auth.uid() = user_id);
  end if;
  -- "Service role" in these two names is historical -- the app has no
  -- service-role client (see AGENTS.md), so in practice these are writable
  -- by any authenticated session. Recorded as-is rather than silently
  -- narrowed, since narrowing here is a behavior change, not documentation.
  if not exists (select 1 from pg_policies where tablename = 'push_delivery_log' and policyname = 'Service role can insert delivery logs') then
    create policy "Service role can insert delivery logs" on public.push_delivery_log for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'push_delivery_log' and policyname = 'Service role can update delivery logs') then
    create policy "Service role can update delivery logs" on public.push_delivery_log for update using (true) with check (true);
  end if;
end $$;
