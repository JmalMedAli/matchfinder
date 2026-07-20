# MatchFinder — Project Map

Inventory of what exists: features, routes, API surface, schema. Update per-feature (see AGENTS.md workflow step 9).
**How agents work** → `AGENTS.md` (single source of truth). **What's currently broken** → `docs/technical-debt.md`.

**Last refreshed:** 2026-07-20 (pre-launch audit remediation: cron auth, durable rate limiting, moderator role tier, admin audit log, block/mute, chat RLS recursion fix, schema-drift backfill, join-request identity-spoofing fix, Stage E test infrastructure + CI).

## Tech Stack
- **Framework:** Next.js 16 (App Router, Turbopack) — all pages `"use client"` except the admin auth-gate layouts (server components, auth-only, no data fetching); App Router used as a file router
- **React:** 19 · **Styling:** Tailwind CSS 4 + shadcn/ui (base-nova style, Base UI primitives) + Framer Motion
- **Database + Auth:** Supabase (Postgres + Auth + Realtime + Storage; Google OAuth, Email, Phone OTP)
- **State:** TanStack Query 5 (server state) + Zustand 5 (UI-only) + Supabase Realtime (invalidation events)
- **Notifications:** in-app (RPC) + web push (`web-push` + `public/sw.js`) + email (Resend) via unified `src/lib/notify.ts`
- **Maps:** Leaflet / react-leaflet · **Sharing:** qrcode.react · **Deploy:** Vercel

## Directory Structure
```
src/
├── app/
│   ├── page.tsx, login/, register/, auth/callback/    # public + auth
│   ├── player/[id]/                                   # public player profile
│   ├── dashboard/                                     # authenticated shell (sidebar + mobile bottom nav)
│   │   ├── page.tsx                                   # home: greeting, quick actions, calendar, leaderboard, activity, popular fields
│   │   ├── matches/ (page, new/, [id]/, [id]/edit/)   # list · create · detail · edit
│   │   ├── nearby/, my-matches/, archived/            # discovery · player's requests · archived matches
│   │   ├── fields/ (page, [id]/)                      # fields discovery: list, map, detail
│   │   ├── conversations/ (page, [id]/)               # chat: DMs + per-match group chats, block/unblock in DM header
│   │   ├── notifications/, profile/ (+edit/)          # notifications · profile hub
│   │   └── admin/ (layout + 10 sections)               # overview/users/matches/fields/reports/reviews/notifications/analytics/audit/settings
│   │       ├── layout.tsx                              # staff gate (admin OR moderator)
│   │       ├── settings/layout.tsx, notifications/layout.tsx  # nested full-admin-only gates
│   └── api/                                           # route files — see API table
├── components/          # ~60 feature components + components/ui/ (16 shadcn primitives) + components/admin/, block-button.tsx
├── hooks/               # 28 domain hooks (use-matches, use-messages, use-blocks, use-push-notifications, use-realtime…)
├── lib/                 # supabase/{client,server,middleware}, notify, email, push/send, geo, rate-limit (durable, RPC-backed), logger, utils, api/{helpers,admin}
├── stores/ui-store.ts   # Zustand (sidebar state only)
└── types/               # chat, football-field, profile
tests/                   # Vitest integration tests (real Postgres, no mocks) — see Testing & CI
.github/workflows/ci.yml # typecheck + build + tests on push/PR
docs/technical-debt.md   # living debt register
supabase/                # migration.sql + v3 (fields) + v4 (profile) + v5 (chat) + admin-panel + admin-analytics
                          # + admin-top-organizers + admin-broadcast-dispatch + security-hardening
                          # + blocking-and-chat-rls-fix + schema-drift-backfill — see Setup for run order
public/sw.js             # push service worker
```

## Database Schema
**Covered by migrations in `supabase/`** (the database can now be rebuilt from this directory alone — the last schema-drift items were backfilled 2026-07-20):
- **profiles** — identity, position, city, bio, contact fields + `show_*` privacy toggles, `role` (`user`/`moderator`/`admin`), `status` (`active`/`suspended`/`banned`); auto-created on signup (trigger). Role changes require the true admin; status changes (suspend/ban) allowed for any staff (admin or moderator) — enforced by `trg_prevent_self_role_escalation` regardless of RLS wording.
- **matches** — title, description, date, location, `football_field_id` FK, max_players, status (OPEN/FULL/CLOSED/COMPLETED/ARCHIVED), organizer_id, `position_needed`, `price_per_person`, `motm_player_id`, `fair_play_player_id`
- **join_requests** — PENDING/ACCEPTED/REJECTED (+ waitlist logic in code), UNIQUE(match_id, player_id); INSERT refused between a blocked organizer/player pair (two near-duplicate INSERT policies, both updated identically — see technical-debt.md)
- **notifications** — title, message, read, user_id, match_id
- **football_fields** — name, address, city, lat/lng, image, `rating`/`review_count` (kept in sync by trigger, see `field_reviews`); seeded with 12 fields across 6 Banlieue Sud Tunis cities
- **conversations / conversation_participants / messages** — chat: DMs + auto-managed per-match group chats via triggers; DM creation and message send both refuse a blocked pair (`get_or_create_dm`, `is_dm_blocked`)
- **blocked_users** — one player blocking another (`blocker_id`, `blocked_id`, unique pair); enforced at the DB layer in `get_or_create_dm`, the `messages` INSERT policy, and both `join_requests` INSERT policies — not just app-level
- **player_favorites** — one player favoriting another, UNIQUE(user_id, player_id)
- **reviews** — strictly player-to-player peer rating (`CHECK (reviewer_id <> player_id)` — players can never rate themselves; organizer rating flows through here too, reviewer → organizer, skipped when reviewer is the organizer). `profiles.avg_rating` kept in sync by trigger, scoped to ratings *received*.
- **match_reviews** — a player's own experience report for a match (overall rating + comment), one per (match, reviewer). Not a player rating.
- **field_reviews** — a player's rating of a venue, one canonical review per (field, reviewer), optional `match_id` provenance. Feeds `football_fields.rating`/`review_count` via trigger.
- **match_awards** — MOTM / fair-play votes, `CHECK (voter_id <> recipient_id)` (no self-voting)
- **match_player_stats** — per-match goals scored, `confirmed_by_organizer`
- **player_achievements** — unlocked badges (first_match, first_goal, matches_10/25, motm_5, hat_trick, community_favorite, reliable_player, top_organizer)
- **reports** — player-filed reports (`user`/`match`/`review`/`field` target types), `pending`/`reviewed`/`dismissed`/`actioned`; reporter sees own, staff sees/resolves all
- **app_settings** — single-row config (`id boolean primary key default true` singleton pattern): `maintenance_mode`, `support_email`, `default_search_radius_km`, `default_max_players`, `default_price_per_person`; publicly readable, admin-writable
- **broadcast_notifications** — admin-authored announcements (title, message, `scheduled_for`, `sent_at`), fanned out via `notifyUsers()`; admin-only RLS
- **admin_audit_log** — every staff mutation to `profiles`/`matches`/`football_fields`/`reports`/`reviews`/`match_reviews`/`field_reviews`/`broadcast_notifications`/`app_settings`, recorded automatically by a `SECURITY DEFINER` trigger (`log_staff_change`) from the actual committed old/new row data — **no app code and no client session can write an entry**, including staff's own browser (no INSERT policy exists for any client role). `ip_address`/`user_agent`/`reason` columns exist but are unpopulated (tracked in technical-debt.md). Staff-readable via `GET /api/admin/audit`.
- **rate_limit_buckets / rate_limit_policies** — durable, per-user rate limiting (replaces the old in-memory implementation, which reset on every serverless cold start). `check_rate_limit(scope)` derives the bucket key from `auth.uid()` and looks up the threshold from `rate_limit_policies` — both are server-side, never caller-supplied, so a direct RPC call can only affect the caller's own bucket at the real configured limit.
- **match_templates, match_photos, match_availability, match_checkins, activity_feed, message_reactions, push_subscriptions, push_delivery_log** — backfilled from live schema 2026-07-20 (`migration-schema-drift-backfill.sql`); see each table's RLS for real behavior. `push_delivery_log`'s two "service role" policies are actually permissive-for-any-authenticated-session (see technical-debt.md).
- **Functions/triggers:** `handle_new_user`, `update_updated_at`, `accept_join_request` / `remove_accepted_player` (atomic capacity; both now verify `auth.uid() = p_organizer_id` and are `authenticated`-only — previously callable by `anon` with no identity check at all, see technical-debt.md Resolved), `create_notification`, `get_or_create_dm` (verifies caller identity + refuses a blocked pair), `get_unread_counts`, `sync_player_avg_rating` (DELETE-safe), `sync_field_rating`, chat-membership triggers, `is_admin()`, `is_staff()`, `is_conversation_participant()`, `is_dm_blocked()`, `prevent_self_role_escalation` (role: admin-only; status: staff), `log_staff_change` (audit trigger), `check_rate_limit()`, `cleanup_rate_limit_buckets()`, `admin_growth_series`, `admin_popular_cities`, `admin_top_organizers`, `admin_dispatch_scheduled_broadcasts`

## Pages
| Path | Purpose | Auth |
|------|---------|------|
| `/` | Landing (hero video, how-it-works, features, social proof, CTA) | No |
| `/login`, `/register` | Email / Phone OTP / Google OAuth (split layout) | No |
| `/player/[id]` | Public player profile (report, block) | No |
| `/dashboard` | Home hub: calendar, sections, leaderboard, activity feed, popular fields | Yes |
| `/dashboard/matches` (+`/new`, `/[id]`, `/[id]/edit`) | Match CRUD, detail with join/manage/check-in/awards/review | Yes |
| `/dashboard/nearby` | Geolocation discovery, distance filters, city fallback | Yes |
| `/dashboard/my-matches` | Accepted / pending / rejected + withdraw | Yes |
| `/dashboard/archived` | Archived matches | Yes |
| `/dashboard/fields` (+`/[id]`) | Fields discovery: list, map view, field detail with matches | Yes |
| `/dashboard/conversations` (+`/[id]`) | Chat list + thread (DMs, group, reactions, typing, block/unblock in DM header) | Yes |
| `/dashboard/notifications` | Notification list, mark read, preferences | Yes |
| `/dashboard/profile` (+`/edit`) | Profile hub + edit (avatar, privacy toggles) | Yes |
| `/dashboard/admin` (+`/users`, `/users/[id]`, `/matches`, `/fields`, `/reports`, `/reviews`, `/analytics`, `/audit`) | Admin panel, staff-accessible sections. Gated by `src/app/dashboard/admin/layout.tsx` (`profiles.role` in `admin`/`moderator`, admin additionally requires `user.id === ADMIN_USER_ID`) | Staff |
| `/dashboard/admin/notifications`, `/dashboard/admin/settings` | Full-admin-only sections — each has its own nested `layout.tsx` redirecting moderators back to `/dashboard/admin` | Admin only |

## API Endpoints
| Area | Routes |
|------|--------|
| Matches | `GET/POST /api/matches` · `GET/PATCH/DELETE /api/matches/[id]` · `GET /api/matches/featured` · `GET /api/matches/calendar` |
| Post-match | `/api/matches/[id]/checkin` · `/awards` · `/stats` · `/post-review` |
| Join requests | `POST /api/join-requests` · `PATCH/DELETE /api/join-requests/[id]` · `GET …/mine` · `GET …/incoming` |
| Notifications | `GET /api/notifications` · `PATCH …/read` · `…/remind` |
| Push | `POST /api/push/subscribe` · `…/unsubscribe` · `GET …/vapid-key` |
| Chat | `GET/POST /api/conversations` · `PATCH …/[id]/read` · `GET/POST /api/messages` · `…/[id]/reactions` |
| Fields | `GET /api/fields` · `GET /api/fields/[id]` |
| Players | `GET /api/players/search` · `GET /api/players/[id]/stats` |
| Community | `/api/reviews` · `/api/favorites` · `/api/leaderboard` · `/api/achievements` · `/api/activity` |
| Blocking | `GET/POST /api/blocks` (toggle) — see technical-debt.md re: DB-layer enforcement points |
| Tools | `/api/match-templates` (+`[id]`) · `/api/match-availability` · `/api/match-photos` |
| Reporting | `POST /api/reports` (player-facing) |
| Admin — staff-accessible (`requireStaff()`, `src/lib/api/admin.ts`) | `GET /api/admin/stats` · `GET /api/admin/me` · `GET /api/admin/users` (+`[id]` GET, status-only PATCH) · `GET /api/admin/matches` (+`[id]` PATCH/DELETE) · `GET/POST /api/admin/fields` (+`[id]` GET/PATCH/DELETE) · `GET /api/admin/reports` (+`[id]` PATCH) · `GET /api/admin/reviews` (+`[id]` DELETE, `?type=`) · `GET /api/admin/analytics` · `GET /api/admin/audit` (read-only; entries are trigger-written, no matching write route exists) |
| Admin — full-admin-only (`requireAdmin()`) | `[id]` PATCH's `role` field on `/api/admin/users` · `DELETE /api/admin/users/[id]` · `GET/POST /api/admin/notifications/broadcast` · `GET/PATCH /api/admin/settings` |
| System | `GET /api/cron/match-reminder` · `GET /api/cron/broadcast-dispatch` — both now require `Authorization: Bearer $CRON_SECRET` |

Route conventions (auth → UUID validation → JSON error shape) are defined in `AGENTS.md`. Admin routes use `requireStaff()` or `requireAdmin()` instead of `requireAuth()` depending on section sensitivity — see the table above for the split.

## Feature Inventory
- **Auth & profiles:** email/phone-OTP/Google auth; profiles with avatar upload, position, city, bio, per-field contact privacy; public player pages; player search
- **Matches:** CRUD with field selector, price-per-person (informational), position-needed, past-date validation; templates; featured matches; archive/delete; bulk actions; share via WhatsApp/SMS/copy/QR
- **Join lifecycle:** request → accept/reject (atomic capacity) → withdraw → re-request; waitlist with auto-promote; organizer can remove players; refused between a blocked pair
- **Discovery:** nearby (geolocation + Haversine, distance pills, city fallback), fields directory with map view + popular fields, home calendar with day detail sheet
- **Chat:** DMs + auto-managed per-match group chats, reactions, typing indicator, unread counts, realtime, block/unblock in the DM header
- **Trust & safety:** player-filed reports (user/match/review/field) feeding the staff Reports queue; block/mute between players, enforced at the database layer (DM creation, message send, join requests all refuse a blocked pair — not just hidden in the UI)
- **Notifications:** in-app realtime (toast + badge) + web push (service worker, subscription mgmt, preferences) + email (Resend); match reminders (client hook + cron route, now secret-gated); MOTM/fair-play award + achievement unlock (in-app + push only, no email — `skipEmail: true`, per notification-restraint principle); admin broadcast announcements (immediate or scheduled)
- **Post-match:** check-in, own-match review (overall rating + field rating + comment, `match_reviews`/`field_reviews`), peer player ratings (`reviews` — players can never rate themselves, enforced by a DB constraint), goals scored, MOTM + fair-play awards (no self-voting), achievements, leaderboard, photo gallery
- **Community:** activity feed, leaderboard, public profiles, sharing
- **Onboarding:** dismissible nudge on dashboard home prompting missing position/city (`src/components/onboarding-nudge.tsx`), not a gate
- **Admin Panel:** staff-gated (`profiles.role` in `admin`/`moderator`; the `admin` role additionally requires `user.id === ADMIN_USER_ID`), enforced server-side in `dashboard/admin/layout.tsx` + `requireStaff()`/`requireAdmin()` on every `/api/admin/**` route. 10 sections: Overview, Users (moderators can suspend/ban; only the admin can change roles or hard-delete), Matches, Fields, Reports, Reviews, Notifications (admin-only — mass messaging), Analytics, **Audit Log** (every staff mutation, trigger-written, tamper-proof), Settings (admin-only — maintenance mode actually enforced app-wide, support email, match/search defaults)
- **Platform:** dark mode, mobile-first shell (bottom nav), Framer Motion design language, installable PWA (`src/app/manifest.ts` + generated icons)

## Realtime
`useRealtimeChannel` (core lifecycle hook) → subscriptions on `notifications` (INSERT → toast/badge), `join_requests` (per match), `messages` (per conversation), typing broadcast. All events **invalidate TanStack Query keys** — never mutate caches directly.

## Testing & CI
`tests/**` — Vitest, run with `npm test`. Real integration tests against production Postgres via a direct pooler connection (no Supabase branch/local Docker stack available in this project's dev environment), isolated per-test via a throwaway `auth.users` row + `BEGIN...ROLLBACK` (`tests/helpers/`), with `SET ROLE authenticated` so RLS is actually enforced rather than bypassed. Covers `accept_join_request`/`remove_accepted_player` capacity + identity checks, `join_requests` RLS, `prevent_self_role_escalation`, `check_rate_limit`, chat RLS (recursion regression guard), and block enforcement. Needs `SUPABASE_TEST_DB_URL` in a local `.env.test` (gitignored) or as a GitHub Actions secret.

`.github/workflows/ci.yml` — typecheck + build + tests on push/PR; lint runs `continue-on-error` until the pre-existing lint debt (`docs/technical-debt.md`) is cleared.

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=        # required
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # required
NEXT_PUBLIC_VAPID_PUBLIC_KEY=    # web push
VAPID_PRIVATE_KEY=               # web push
RESEND_API_KEY=                  # email (absent → email silently disabled)
NEXT_PUBLIC_SITE_URL=            # domain only, no protocol (or with protocol — both now handled)
LOG_LEVEL=debug
ADMIN_USER_ID=                   # the one account permitted full-admin access (checked alongside profiles.role='admin')
CRON_SECRET=                     # shared secret required as `Authorization: Bearer <value>` on /api/cron/** routes
```

## Setup
1. Create a Supabase project; run, in order: `supabase/migration.sql`, `-v3`, `-v4`, `-v5`, `migration-admin-panel.sql`, `migration-admin-analytics.sql`, `migration-admin-top-organizers.sql`, `migration-admin-broadcast-dispatch.sql`, `migration-security-hardening.sql`, `migration-blocking-and-chat-rls-fix.sql`, `migration-schema-drift-backfill.sql`, `migration-join-request-identity-fix.sql`.
   This now produces the full production schema (last drift items backfilled 2026-07-20).
2. Enable providers: Google OAuth, Phone OTP (Authentication → Providers).
3. Enable Realtime on: `notifications`, `join_requests`, `matches`, `messages`, `conversation_participants`.
4. Create Storage bucket `avatars` (v4) — public read, authenticated upload.
5. Set env vars in `.env` (including `ADMIN_USER_ID` and `CRON_SECRET`); add OAuth redirect `http://localhost:3000/auth/callback` in Supabase; configure `CRON_SECRET` as the `Authorization: Bearer` header on whatever scheduler calls `/api/cron/**`.
6. `npm install && npm run dev`.

## History
Development history (Phases 1–7 hardening/UX/realtime/fields/nearby/profile/redesign, then chat, reviews, waitlist, gamification, mobile V2, push, calendar, fields discovery, Secure Admin Panel, pre-launch audit remediation) is tracked in git: `git log --oneline`. This file describes the **current** state only.
