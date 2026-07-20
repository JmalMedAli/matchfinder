-- Applied to production as admin_join_request_management via
-- mcp__supabase__apply_migration. Mirrored here per repo convention — this
-- file documents what's live, it was not itself run through the CLI.

-- Staff-gated equivalent of accept_join_request/remove_accepted_player,
-- which are locked to the real organizer's own auth.uid() (a prior fix for
-- an anon-exploitable identity-spoofing bug, see
-- migration-join-request-identity-fix.sql). Admin/moderator need their own
-- path to manage join requests on matches they don't organize, without
-- reopening that spoofing hole -- this checks is_staff() internally
-- (self-contained authorization, not relying on RLS alone) and preserves
-- the same capacity-checking / match-reopen guarantees as the player-facing
-- flow. Verified via rolled-back dry runs before applying: non-staff
-- blocked, accept respects capacity (including filling a match to FULL and
-- refusing to overfill it), and removing an accepted player reopens a FULL
-- match back to OPEN when there's room again. Regression-tested permanently
-- in tests/admin-join-requests.test.ts.
create or replace function public.admin_set_join_request_status(p_join_request_id uuid, p_status text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_match_id uuid;
  v_old_status text;
  v_match_status text;
  v_max_players integer;
  v_accepted_count integer;
begin
  if auth.uid() is null or not is_staff(auth.uid()) then
    return false;
  end if;
  if p_status not in ('PENDING','ACCEPTED','REJECTED') then
    return false;
  end if;

  select match_id, status into v_match_id, v_old_status from join_requests where id = p_join_request_id for update;
  if v_match_id is null then return false; end if;
  if v_old_status = p_status then return true; end if;

  select status, max_players into v_match_status, v_max_players from matches where id = v_match_id for update;

  if p_status = 'ACCEPTED' then
    select count(*) into v_accepted_count from join_requests where match_id = v_match_id and status = 'ACCEPTED';
    if v_accepted_count >= v_max_players then
      return false;
    end if;
    update join_requests set status = 'ACCEPTED' where id = p_join_request_id;
    if v_accepted_count + 1 >= v_max_players then
      update matches set status = 'FULL' where id = v_match_id;
    end if;
  elsif v_old_status = 'ACCEPTED' then
    update join_requests set status = p_status where id = p_join_request_id;
    select count(*) into v_accepted_count from join_requests where match_id = v_match_id and status = 'ACCEPTED';
    if v_match_status = 'FULL' and v_accepted_count < v_max_players then
      update matches set status = 'OPEN' where id = v_match_id;
    end if;
  else
    update join_requests set status = p_status where id = p_join_request_id;
  end if;

  return true;
end;
$$;
revoke execute on function public.admin_set_join_request_status(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_set_join_request_status(uuid, text) to authenticated;
