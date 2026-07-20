-- Applied to production as two migrations via mcp__supabase__apply_migration:
--   add_conversation_leave_policy
--   add_delete_endpoints_rate_limit_policies
-- Mirrored here per repo convention — this file documents what's live, it
-- was not itself run through the CLI.

-- Lets a user "delete" a conversation from their own list without touching
-- the other participant(s)' copy: deletes only the caller's own
-- conversation_participants row (a leave/hide), never the conversation or
-- messages themselves — a conversation is shared data, and one participant
-- deleting it shouldn't destroy the other's history without their consent.
-- Messaging that person again later starts a fresh conversation
-- (get_or_create_dm won't find an existing one, since the caller is no
-- longer a participant of the old one).
--
-- notifications already had a real "Users can delete own notifications"
-- DELETE policy (auth.uid() = user_id) from an earlier migration — these
-- rows are single-owner, so no equivalent leave/hide semantics were needed
-- there, just a route to use the policy that already existed.
create policy "Users can leave their own conversations" on public.conversation_participants
for delete using (user_id = auth.uid());

insert into public.rate_limit_policies (scope, max_requests, window_seconds) values
  ('delete-notifications', 20, 60),
  ('delete-conversation', 20, 60)
on conflict (scope) do nothing;
