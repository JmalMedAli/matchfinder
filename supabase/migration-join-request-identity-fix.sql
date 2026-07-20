-- Applied to production as two migrations via mcp__supabase__apply_migration:
--   fix_join_request_organizer_identity_spoofing
--   add_search_path_to_join_request_functions (corrective cleanup)
-- Mirrored here per repo convention — this file documents what's live, it
-- was not itself run through the CLI.
--
-- CRITICAL: found while writing Stage E's Vitest regression tests for
-- accept_join_request. Neither this function nor remove_accepted_player
-- verified auth.uid() = p_organizer_id, and both were callable by `anon`
-- (fully unauthenticated). Confirmed exploitable before fixing: an
-- unauthenticated caller who knew a join_request_id and the real organizer's
-- user id could accept any pending join request, or kick any accepted
-- player, for a match they don't organize — no account required. Same class
-- of bug as get_or_create_dm (Stage C), same fix.

create or replace function public.accept_join_request(p_join_request_id uuid, p_organizer_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
DECLARE
v_match_id uuid;
v_status text;
v_max_players integer;
v_count integer;
BEGIN
IF auth.uid() IS NULL OR auth.uid() <> p_organizer_id THEN
  RETURN false;
END IF;

SELECT match_id INTO v_match_id FROM join_requests WHERE id=p_join_request_id AND status='PENDING' FOR UPDATE;
IF v_match_id IS NULL THEN RETURN false; END IF;

SELECT status,max_players INTO v_status,v_max_players FROM matches WHERE id=v_match_id AND organizer_id=p_organizer_id FOR UPDATE;
IF v_status IS NULL OR v_status!='OPEN' THEN RETURN false; END IF;

SELECT COUNT(*) INTO v_count FROM join_requests WHERE match_id=v_match_id AND status='ACCEPTED';
IF v_count >= v_max_players THEN RETURN false; END IF;

UPDATE join_requests SET status='ACCEPTED' WHERE id=p_join_request_id;
IF v_count + 1 >= v_max_players THEN UPDATE matches SET status='FULL' WHERE id=v_match_id; END IF;

RETURN true;
END;
$$;
revoke execute on function public.accept_join_request(uuid, uuid) from public, anon;
grant execute on function public.accept_join_request(uuid, uuid) to authenticated;

create or replace function public.remove_accepted_player(p_join_request_id uuid, p_organizer_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
DECLARE
  v_match_id uuid;
  v_status text;
  v_accepted_count integer;
  v_max_players integer;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_organizer_id THEN
    RETURN false;
  END IF;

  SELECT jr.match_id, jr.status INTO v_match_id, v_status FROM join_requests jr WHERE jr.id = p_join_request_id FOR UPDATE;
  IF v_match_id IS NULL OR v_status != 'ACCEPTED' THEN RETURN false; END IF;

  SELECT m.status, m.max_players INTO v_status, v_max_players FROM matches m WHERE m.id = v_match_id AND m.organizer_id = p_organizer_id FOR UPDATE;
  IF v_status IS NULL THEN RETURN false; END IF;

  UPDATE join_requests SET status = 'REJECTED' WHERE id = p_join_request_id;

  SELECT COUNT(*) INTO v_accepted_count FROM join_requests WHERE match_id = v_match_id AND status = 'ACCEPTED';
  IF v_status = 'FULL' AND v_accepted_count < v_max_players THEN
    UPDATE matches SET status = 'OPEN' WHERE id = v_match_id;
  END IF;

  RETURN true;
END;
$$;
revoke execute on function public.remove_accepted_player(uuid, uuid) from public, anon;
grant execute on function public.remove_accepted_player(uuid, uuid) to authenticated;

-- Regression-tested end to end in tests/join-lifecycle.test.ts: anon is
-- rejected outright (permission denied), a wrong authenticated user's
-- spoofing attempt returns false without mutating anything, and the real
-- organizer still works for both accept and remove.
