# MatchFinder — Technical Debt Register

Living document. Consult before planning any feature (per AGENTS.md workflow step 2). Update whenever debt is added or resolved — mark items resolved with a date rather than deleting them, so history stays auditable.

**Last full audit:** 2026-07-19

## 1. Schema drift — tables/columns used in code with no migration file *(highest priority)*

The database cannot be rebuilt from `supabase/` alone. RLS for these tables is unreviewable in-repo. **Rule:** any change touching one of these must backfill its migration (schema + indexes + RLS) in the same change.

- [ ] `reviews`
- [ ] `favorites`
- [ ] `match_templates`
- [ ] `match_photos`
- [ ] `match_availability`
- [ ] `match_checkins`
- [ ] `match_awards`
- [ ] `match_player_stats`
- [ ] `player_achievements`
- [ ] `activity_feed`
- [ ] `message_reactions`
- [ ] `push_subscriptions`
- [ ] `push_delivery_log`
- [ ] `profiles.role` column (admin gating)
- [ ] `matches` columns beyond migration.sql: `position_needed`, `price_per_person`, `motm_player_id`, `fair_play_player_id`; WAITLIST status handling

## 2. Testing & CI

- [ ] Zero automated tests (~30 API routes with stateful lifecycles: join requests, waitlist promotion, post-match flow).
- [ ] No CI pipeline (lint/typecheck/build not enforced on commits).

## 3. Broken / risky endpoints

- [ ] `src/app/api/cron/match-reminder/route.ts`: no auth secret (anyone can trigger push sends), no "already reminded" tracking (repeat calls re-send), uses cookie-session client so a real cron caller has no session and likely no-ops under RLS.
- [ ] Rate limiting (`src/lib/rate-limit.ts`) is in-memory per-instance — ineffective on Vercel serverless; covers only 2 routes (`join-requests` POST, `push/subscribe`).
- [ ] Matches search interpolates raw user input into a PostgREST `.or(ilike…)` filter string (`src/app/api/matches/route.ts`) — commas/parentheses can break or alter the filter.

## 4. Known bugs

- [ ] `src/lib/email.ts`: builds `https://${NEXT_PUBLIC_SITE_URL}` (breaks if var includes protocol); interpolates title/message into HTML unescaped; indigo/purple template contradicts the green design system.
- [ ] `public/sw.js` references `/icon-192.png` — file does not exist in `public/`.
- [ ] No PWA manifest despite service worker + push (app not installable).
- [ ] Fonts double-loaded: Google Fonts `@import` in `globals.css` **and** `next/font` in `layout.tsx`.

## 5. Code structure

- [ ] Route boilerplate duplicated across ~32 route files: `UUID_RE`, `jsonError()`, `requireAuth()`, `PROFILE_SELECT` — should live in a shared `src/lib/api` helper.
- [ ] Monolith pages: `dashboard/matches/[id]/page.tsx` (822 lines), `dashboard/page.tsx` (679), `dashboard/fields/[id]/page.tsx` (538).
- [ ] JS-side aggregation on whole tables in `leaderboard`, `admin/stats` routes; dashboard fetches 50 matches and filters client-side.

## 6. Documentation

- [ ] `PROJECT_MAP.md` accurate through Phase 7 only (~20 feature commits undocumented: chat, reviews, waitlist, templates, gamification, push, calendar, fields discovery). Update per-feature going forward; backfill as an explicit task.

## Resolved

*(move items here with date when fixed)*
