-- Analytics page "Top organizers" — matches.organizer_id has no denormalized
-- count, and PostgREST has no GROUP BY, so this ships as an RPC like
-- admin_growth_series/admin_popular_cities (migration-admin-analytics.sql).
create or replace function public.admin_top_organizers(result_limit integer default 5)
returns table(organizer_id uuid, name text, match_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select m.organizer_id, p.name, count(*) as match_count
  from public.matches m
  join public.profiles p on p.id = m.organizer_id
  group by m.organizer_id, p.name
  order by match_count desc
  limit result_limit;
$$;

grant execute on function public.admin_top_organizers(integer) to authenticated;
