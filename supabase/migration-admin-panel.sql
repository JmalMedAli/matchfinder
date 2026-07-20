-- Secure Admin Panel — foundation migration
-- Applied via Supabase MCP apply_migration on 2026-07-20.
--
-- Fixes a real pre-existing vulnerability: the only UPDATE policy on `profiles`
-- was `USING (auth.uid() = id)` with no WITH CHECK and no column protection, so
-- any authenticated user could self-promote via
--   supabase.from('profiles').update({ role: 'admin' }).eq('id', myId)
-- from the browser (profile updates go straight from the client per this app's
-- RLS-as-authorization architecture — see src/hooks/use-profile.ts). Closed by
-- the trigger below, which reverts role/status edits from any session that
-- isn't already an admin.
--
-- Also bootstraps `profiles.role='admin'` onto exactly one account, anchored on
-- the ADMIN_USER_ID env var value (dalijmal5@gmail.com), demoting the other
-- pre-existing admin row so "only one specific administrator account" holds
-- literally.

-- ============================================================
-- 1. is_admin() helper — reused by every admin RLS policy below
-- ============================================================

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p where p.id = uid and p.role = 'admin'
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated;

-- ============================================================
-- 2. profiles.status + self-escalation guard
-- ============================================================

alter table public.profiles
  add column status text not null default 'active'
  check (status in ('active', 'suspended', 'banned'));

create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is null for service-role/migration contexts (not reachable by
  -- browser users, who always carry their own JWT) — only gate real sessions.
  if (new.role is distinct from old.role or new.status is distinct from old.status)
     and auth.uid() is not null
     and not is_admin(auth.uid()) then
    new.role := old.role;
    new.status := old.status;
  end if;
  return new;
end;
$$;

create trigger trg_prevent_self_role_escalation
before update on public.profiles
for each row
execute function public.prevent_self_role_escalation();

create policy "Admins can update any profile"
on public.profiles for update
using (is_admin());

-- ============================================================
-- 3. Admin bypass policies on existing moderation targets
-- ============================================================

create policy "Admins can update any match"
on public.matches for update
using (is_admin());

create policy "Admins can delete any match"
on public.matches for delete
using (is_admin());

-- football_fields previously had `USING (true)` INSERT/UPDATE/DELETE policies
-- — i.e. ANY authenticated user could create/edit/delete a field. Tightened to
-- admin-only now that a real Fields admin surface exists to manage them.
drop policy if exists "Authenticated insert football fields" on public.football_fields;
drop policy if exists "Authenticated update football fields" on public.football_fields;
drop policy if exists "Authenticated delete football fields" on public.football_fields;

create policy "Admins can insert football fields"
on public.football_fields for insert
with check (is_admin());

create policy "Admins can update football fields"
on public.football_fields for update
using (is_admin());

create policy "Admins can delete football fields"
on public.football_fields for delete
using (is_admin());

create policy "Admins can delete reviews"
on public.reviews for delete
using (is_admin());

create policy "Admins can delete match reviews"
on public.match_reviews for delete
using (is_admin());

create policy "Admins can delete field reviews"
on public.field_reviews for delete
using (is_admin());

-- sync_player_avg_rating only fired on INSERT/UPDATE and referenced NEW
-- directly, so admin-deleted reviews left profiles.avg_rating stale. Made
-- DELETE-safe (mirrors the COALESCE(NEW, OLD) pattern already used by
-- sync_field_rating) and added to the trigger's event list.
create or replace function public.sync_player_avg_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid := coalesce(new.player_id, old.player_id);
  v_avg numeric;
begin
  select average_rating into v_avg from public.get_player_rating(v_player_id);
  update public.profiles set avg_rating = coalesce(v_avg, 0) where id = v_player_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_player_avg_rating on public.reviews;
create trigger trg_sync_player_avg_rating
after insert or update or delete on public.reviews
for each row
execute function public.sync_player_avg_rating();

-- ============================================================
-- 4. reports — player-filed reports, admin-moderated
-- ============================================================

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('user', 'match', 'review', 'field')),
  target_id uuid not null,
  reason text not null,
  description text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed', 'actioned')),
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index reports_status_idx on public.reports(status);
create index reports_target_idx on public.reports(target_type, target_id);
create index reports_reporter_idx on public.reports(reporter_id);

alter table public.reports enable row level security;

create policy "Users can insert own reports"
on public.reports for insert
with check (auth.uid() = reporter_id);

create policy "Users can view own reports"
on public.reports for select
using (auth.uid() = reporter_id);

create policy "Admins can view all reports"
on public.reports for select
using (is_admin());

create policy "Admins can update reports"
on public.reports for update
using (is_admin());

-- ============================================================
-- 5. app_settings — single-row config, admin-writable
-- ============================================================

create table public.app_settings (
  id boolean primary key default true,
  maintenance_mode boolean not null default false,
  support_email text,
  default_search_radius_km numeric not null default 15,
  default_max_players integer not null default 10,
  default_price_per_person numeric,
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id)
);

insert into public.app_settings (id) values (true);

create trigger trg_app_settings_updated_at
before update on public.app_settings
for each row
execute function public.update_updated_at();

alter table public.app_settings enable row level security;

create policy "Everyone can view settings"
on public.app_settings for select
using (true);

create policy "Admins can update settings"
on public.app_settings for update
using (is_admin());

-- ============================================================
-- 6. broadcast_notifications — admin-authored announcements
-- ============================================================

create table public.broadcast_notifications (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id) on delete set null,
  title text not null,
  message text not null,
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index broadcast_notifications_pending_idx
  on public.broadcast_notifications(scheduled_for)
  where sent_at is null;

alter table public.broadcast_notifications enable row level security;

create policy "Admins manage broadcasts"
on public.broadcast_notifications for all
using (is_admin())
with check (is_admin());

-- ============================================================
-- 7. One-time admin bootstrap — anchored on ADMIN_USER_ID
-- ============================================================

update public.profiles set role = 'admin' where id = '3c94ea4a-ae4d-4d1e-94a7-a8b6b9c0be0d';
update public.profiles set role = 'user' where role = 'admin' and id <> '3c94ea4a-ae4d-4d1e-94a7-a8b6b9c0be0d';
