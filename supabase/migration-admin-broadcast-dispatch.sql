-- Lets the (currently unauthenticated, see docs/technical-debt.md's cron-auth
-- note) cron route atomically claim and mark-sent any due scheduled
-- broadcasts, bypassing the admin-only RLS on broadcast_notifications via
-- SECURITY DEFINER — same pattern already used by create_notification etc.
-- It can only ever dispatch content an admin already authored and scheduled,
-- so exposing it to anon carries the same low, already-accepted risk as this
-- codebase's other SECURITY DEFINER RPCs.
create or replace function public.admin_dispatch_scheduled_broadcasts()
returns table(id uuid, title text, message text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.broadcast_notifications b
  set sent_at = now()
  where b.scheduled_for is not null
    and b.scheduled_for <= now()
    and b.sent_at is null
  returning b.id, b.title, b.message;
end;
$$;

grant execute on function public.admin_dispatch_scheduled_broadcasts() to authenticated, anon;
