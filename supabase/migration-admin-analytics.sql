-- Admin Overview/Analytics aggregation helpers.
-- SQL-side aggregation per AGENTS.md Principle 7 ("aggregate in SQL, not JS"
-- for new/modified endpoints) — PostgREST has no native GROUP BY, so these
-- ship as SECURITY DEFINER functions the admin stats/analytics routes call
-- via .rpc(). Both are read-only (`stable`), safe to expose to `authenticated`
-- since the calling routes are already gated by requireAdmin().

create or replace function public.admin_growth_series(weeks integer default 8)
returns table(week_start date, user_count bigint, match_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  with weeks_series as (
    select generate_series(
      date_trunc('week', now()) - ((weeks - 1) || ' weeks')::interval,
      date_trunc('week', now()),
      '1 week'::interval
    )::date as week_start
  )
  select
    ws.week_start,
    (select count(*) from public.profiles p where date_trunc('week', p.created_at) = ws.week_start) as user_count,
    (select count(*) from public.matches m where date_trunc('week', m.created_at) = ws.week_start) as match_count
  from weeks_series ws
  order by ws.week_start;
$$;

grant execute on function public.admin_growth_series(integer) to authenticated;

create or replace function public.admin_popular_cities(result_limit integer default 5)
returns table(city text, user_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select p.city, count(*) as user_count
  from public.profiles p
  where p.city is not null
  group by p.city
  order by user_count desc
  limit result_limit;
$$;

grant execute on function public.admin_popular_cities(integer) to authenticated;
