-- Applied to production as two migrations via mcp__supabase__apply_migration:
--   stage_b_security_hardening
--   stage_b_rate_limit_policy_fix (corrective follow-up, see note at the end)
-- Mirrored here per repo convention — this file documents what's live, it
-- was not itself run through the CLI.

-- ============================================================
-- 1) Durable rate limiting
-- ============================================================
-- Replaces the in-memory Map in src/lib/rate-limit.ts, which reset on every
-- serverless cold start and didn't share state across instances.
create table if not exists public.rate_limit_buckets (
  key text primary key,
  count integer not null default 0,
  reset_at timestamptz not null
);
create index if not exists rate_limit_buckets_reset_at_idx on public.rate_limit_buckets (reset_at);
alter table public.rate_limit_buckets enable row level security;
-- No policies: only the SECURITY DEFINER functions below touch this table.

create table if not exists public.rate_limit_policies (
  scope text primary key,
  max_requests integer not null,
  window_seconds integer not null
);
alter table public.rate_limit_policies enable row level security;
create policy "Authenticated can read rate limit policies" on public.rate_limit_policies
  for select using (auth.role() = 'authenticated');
-- No write policies: only migrations manage this table.

insert into public.rate_limit_policies (scope, max_requests, window_seconds) values
  ('join-request', 5, 60), ('push-subscribe', 5, 60), ('report', 10, 60),
  ('admin-user-patch', 30, 60), ('admin-user-delete', 10, 60),
  ('admin-review-delete', 30, 60), ('admin-report-patch', 30, 60),
  ('admin-field-create', 20, 60), ('admin-field-patch', 30, 60), ('admin-field-delete', 20, 60),
  ('admin-match-patch', 30, 60), ('admin-match-delete', 10, 60), ('admin-broadcast', 5, 60)
on conflict (scope) do nothing;

-- Key is always derived from auth.uid() (never caller-supplied); limits are
-- looked up from rate_limit_policies (never caller-supplied). A direct RPC
-- caller can only affect their own bucket, at the real configured threshold —
-- see the corrective-migration note at the end of this file for why this
-- matters.
create or replace function public.check_rate_limit(p_scope text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_key text;
  v_max integer;
  v_window integer;
  v_now timestamptz := now();
  v_count integer;
begin
  if v_uid is null then
    return false;
  end if;

  select max_requests, window_seconds into v_max, v_window
  from public.rate_limit_policies where scope = p_scope;

  if v_max is null then
    return false; -- unknown scope: fail closed
  end if;

  v_key := p_scope || ':' || v_uid::text;

  insert into public.rate_limit_buckets (key, count, reset_at)
  values (v_key, 1, v_now + make_interval(secs => v_window))
  on conflict (key) do update
    set count = case when rate_limit_buckets.reset_at <= v_now then 1 else rate_limit_buckets.count + 1 end,
        reset_at = case when rate_limit_buckets.reset_at <= v_now then v_now + make_interval(secs => v_window) else rate_limit_buckets.reset_at end
  returning count into v_count;

  -- Opportunistic cleanup: cheap safety net independent of whether the
  -- dedicated cron route below is ever scheduled by ops.
  if random() < 0.005 then
    delete from public.rate_limit_buckets
    where key in (select key from public.rate_limit_buckets where reset_at < v_now - interval '1 hour' limit 500);
  end if;

  return v_count <= v_max;
end;
$$;
revoke execute on function public.check_rate_limit(text) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text) to authenticated;

-- Deterministic, observable cleanup via the same external-cron pattern the
-- app already uses (/api/cron/match-reminder, /api/cron/broadcast-dispatch).
-- Granted to anon since real cron callers have no session (same pattern as
-- admin_dispatch_scheduled_broadcasts).
create or replace function public.cleanup_rate_limit_buckets()
returns integer language plpgsql security definer set search_path = public as $$
declare v_deleted integer;
begin
  delete from public.rate_limit_buckets where reset_at < now() - interval '1 hour';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;
revoke execute on function public.cleanup_rate_limit_buckets() from public, anon, authenticated;
grant execute on function public.cleanup_rate_limit_buckets() to anon;

-- ============================================================
-- 2) Moderator role tier
-- ============================================================
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role = any (array['user','moderator','admin']));

create or replace function public.is_staff(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = uid and p.role in ('admin','moderator'));
$$;

-- Role changes still require true admin; status changes (suspend/ban) now
-- allowed for staff (admin or moderator). Verified correct for combined
-- role+status updates in a single statement via a rolled-back dry run
-- against production before this was applied for real.
create or replace function public.prevent_self_role_escalation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not is_admin(auth.uid()) then
    new.role := old.role;
  end if;
  if new.status is distinct from old.status and auth.uid() is not null and not is_staff(auth.uid()) then
    new.status := old.status;
  end if;
  return new;
end;
$$;

-- Widen moderation-target RLS from is_admin() to is_staff() to match the
-- route split (requireStaff() vs requireAdmin() in src/lib/api/admin.ts).
-- None of these policies had a WITH CHECK clause to preserve (verified
-- against the live policy definitions before this was applied).
alter policy "Admins can update any profile" on public.profiles using (is_staff());
alter policy "Admins can update any match" on public.matches using (is_staff());
alter policy "Admins can delete any match" on public.matches using (is_staff());
alter policy "Admins can insert football fields" on public.football_fields with check (is_staff());
alter policy "Admins can update football fields" on public.football_fields using (is_staff());
alter policy "Admins can delete football fields" on public.football_fields using (is_staff());
alter policy "Admins can view all reports" on public.reports using (is_staff());
alter policy "Admins can update reports" on public.reports using (is_staff());
alter policy "Admins can delete reviews" on public.reviews using (is_staff());
alter policy "Admins can delete match reviews" on public.match_reviews using (is_staff());
alter policy "Admins can delete field reviews" on public.field_reviews using (is_staff());
-- NOT widened (stay is_admin()-only): app_settings, broadcast_notifications,
-- and the role field specifically within Users PATCH (enforced in the trigger
-- above and again at the route layer in src/app/api/admin/users/[id]/route.ts).

-- ============================================================
-- 3) Admin audit log (trigger-based; no client-writable insert path)
-- ============================================================
-- Deliberately not an app-level logAdminAction() call some route could forget
-- to make: entries are derived from the actual committed change to the real
-- moderated tables, by a SECURITY DEFINER trigger. No RLS INSERT policy
-- exists for any client role, so no session -- including a legitimate staff
-- member's own browser -- can insert, alter, or delete an entry.
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  action text not null,
  target_type text,
  target_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_actor_idx on public.admin_audit_log (actor_id);
create index if not exists admin_audit_log_target_idx on public.admin_audit_log (target_type, target_id);
create index if not exists admin_audit_log_action_idx on public.admin_audit_log (action);
alter table public.admin_audit_log enable row level security;
create policy "Staff can view audit log" on public.admin_audit_log for select using (is_staff());
-- ip_address/user_agent/reason: columns reserved for a future fast-follow.
-- Nothing populates them yet -- no route captures a moderation reason today,
-- and reliably sourcing request IP/UA needs confirming this project's
-- PostgREST header-GUC exposure first, which was not asserted here.

create or replace function public.log_staff_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid();
begin
  if v_actor is null or not is_staff(v_actor) then
    return coalesce(new, old);
  end if;
  insert into public.admin_audit_log (actor_id, action, target_type, target_id, old_data, new_data)
  values (
    v_actor, TG_OP || '_' || TG_TABLE_NAME, TG_TABLE_NAME,
    (case when TG_OP = 'DELETE' then old.id else new.id end),
    case when TG_OP in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('UPDATE','INSERT') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;
revoke execute on function public.log_staff_change() from public, anon, authenticated;

create trigger trg_audit_profiles after update on public.profiles for each row
  when ((new.role is distinct from old.role or new.status is distinct from old.status) and is_staff())
  execute function public.log_staff_change();
create trigger trg_audit_matches after update or delete on public.matches for each row
  when (is_staff()) execute function public.log_staff_change();
create trigger trg_audit_fields after insert or update or delete on public.football_fields for each row
  when (is_staff()) execute function public.log_staff_change();
create trigger trg_audit_reports after update on public.reports for each row
  when (is_staff()) execute function public.log_staff_change();
create trigger trg_audit_reviews after delete on public.reviews for each row
  when (is_staff()) execute function public.log_staff_change();
create trigger trg_audit_match_reviews after delete on public.match_reviews for each row
  when (is_staff()) execute function public.log_staff_change();
create trigger trg_audit_field_reviews after delete on public.field_reviews for each row
  when (is_staff()) execute function public.log_staff_change();
create trigger trg_audit_broadcasts after insert on public.broadcast_notifications for each row
  when (is_staff()) execute function public.log_staff_change();
create trigger trg_audit_settings after update on public.app_settings for each row
  when (is_staff()) execute function public.log_staff_change();

-- ============================================================
-- Corrective follow-up (applied as stage_b_rate_limit_policy_fix)
-- ============================================================
-- get_advisors flagged that check_rate_limit was anon+authenticated
-- executable. The original 3-arg version (check_rate_limit(key, max, window))
-- took a caller-supplied key AND caller-supplied limit -- any authenticated
-- caller could hit the RPC directly via PostgREST and either target another
-- user's bucket key or pass an inflated max_requests to defeat their own
-- limit. This file already reflects the fixed, deployed design (key derived
-- from auth.uid(), limits looked up from rate_limit_policies) rather than the
-- vulnerable intermediate version -- the drop/recreate steps that actually
-- ran in production are omitted here since they'd just be noise against the
-- final state captured above.
--
-- Also: `revoke ... from public` alone does NOT remove Supabase's default
-- per-role privilege grants -- new functions get EXECUTE granted directly to
-- anon/authenticated/service_role (not just via PUBLIC) at creation time, so
-- those roles must be named explicitly in any revoke. All revokes above
-- already reflect this.
