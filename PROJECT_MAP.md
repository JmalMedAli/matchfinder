# MatchFinder — Project Map

Inventory of what exists: features, routes, API surface, schema. Update per-feature (see AGENTS.md workflow step 9).
**How agents work** → `AGENTS.md` (single source of truth). **What's currently broken** → `docs/technical-debt.md`.

**Last refreshed:** 2026-07-19 (backfilled everything after Phase 7 from git history + code audit).

## Tech Stack
- **Framework:** Next.js 16 (App Router, Turbopack) — all pages `"use client"`; App Router used as a file router, no RSC data fetching
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
│   │   ├── conversations/ (page, [id]/)               # chat: DMs + per-match group chats
│   │   ├── notifications/, profile/ (+edit/), admin/  # notifications · profile hub · admin stats
│   └── api/                                           # 32 route files — see API table
├── components/          # ~60 feature components + components/ui/ (13 shadcn primitives)
├── hooks/               # 27 domain hooks (use-matches, use-messages, use-push-notifications, use-realtime…)
├── lib/                 # supabase/{client,server,middleware}, notify, email, push/send, geo, rate-limit, logger, utils
├── stores/ui-store.ts   # Zustand (sidebar state only)
└── types/               # chat, football-field, profile
docs/technical-debt.md   # living debt register
supabase/                # migration.sql + v3 (fields) + v4 (profile) + v5 (chat) — INCOMPLETE, see below
public/sw.js             # push service worker
```

## Database Schema
**Covered by migrations in `supabase/`:**
- **profiles** — identity, position, city, bio, contact fields + `show_*` privacy toggles; auto-created on signup (trigger)
- **matches** — title, description, date, location, `football_field_id` FK, max_players, status (OPEN/FULL/CLOSED/COMPLETED/ARCHIVED), organizer_id
- **join_requests** — PENDING/ACCEPTED/REJECTED (+ waitlist logic in code), UNIQUE(match_id, player_id)
- **notifications** — title, message, read, user_id, match_id
- **football_fields** — name, address, city, lat/lng, image; seeded with 12 fields across 6 Banlieue Sud Tunis cities
- **conversations / conversation_participants / messages** — chat (v5): DMs + auto-managed per-match group chats via triggers
- **Functions/triggers:** `handle_new_user`, `update_updated_at`, `accept_join_request` (atomic capacity), `remove_accepted_player`, `create_notification`, `get_or_create_dm`, `get_unread_counts`, chat-membership triggers

**⚠ Used in code but NOT yet in `supabase/` migrations** (backfill when touched — tracked in `docs/technical-debt.md`):
`reviews`, `favorites`, `match_templates`, `match_photos`, `match_availability`, `match_checkins`, `match_awards`, `match_player_stats`, `player_achievements`, `activity_feed`, `message_reactions`, `push_subscriptions`, `push_delivery_log`, `profiles.role`, and matches columns `position_needed`, `price_per_person`, `motm_player_id`, `fair_play_player_id`.

## Pages
| Path | Purpose | Auth |
|------|---------|------|
| `/` | Landing (hero video, how-it-works, features, social proof, CTA) | No |
| `/login`, `/register` | Email / Phone OTP / Google OAuth (split layout) | No |
| `/player/[id]` | Public player profile | No |
| `/dashboard` | Home hub: calendar, sections, leaderboard, activity feed, popular fields | Yes |
| `/dashboard/matches` (+`/new`, `/[id]`, `/[id]/edit`) | Match CRUD, detail with join/manage/check-in/awards/review | Yes |
| `/dashboard/nearby` | Geolocation discovery, distance filters, city fallback | Yes |
| `/dashboard/my-matches` | Accepted / pending / rejected + withdraw | Yes |
| `/dashboard/archived` | Archived matches | Yes |
| `/dashboard/fields` (+`/[id]`) | Fields discovery: list, map view, field detail with matches | Yes |
| `/dashboard/conversations` (+`/[id]`) | Chat list + thread (DMs, group, reactions, typing) | Yes |
| `/dashboard/notifications` | Notification list, mark read, preferences | Yes |
| `/dashboard/profile` (+`/edit`) | Profile hub + edit (avatar, privacy toggles) | Yes |
| `/dashboard/admin` | Admin stats (requires `profiles.role = 'admin'`) | Yes |

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
| Tools | `/api/match-templates` (+`[id]`) · `/api/match-availability` · `/api/match-photos` |
| System | `GET /api/admin/stats` · `GET /api/cron/match-reminder` (⚠ see debt register) |

Route conventions (auth → UUID validation → JSON error shape) are defined in `AGENTS.md`.

## Feature Inventory
- **Auth & profiles:** email/phone-OTP/Google auth; profiles with avatar upload, position, city, bio, per-field contact privacy; public player pages; player search
- **Matches:** CRUD with field selector, price-per-person (informational), position-needed, past-date validation; templates; featured matches; archive/delete; bulk actions; share via WhatsApp/SMS/copy/QR
- **Join lifecycle:** request → accept/reject (atomic capacity) → withdraw → re-request; waitlist with auto-promote; organizer can remove players
- **Discovery:** nearby (geolocation + Haversine, distance pills, city fallback), fields directory with map view + popular fields, home calendar with day detail sheet
- **Chat:** DMs + auto-managed per-match group chats, reactions, typing indicator, unread counts, realtime
- **Notifications:** in-app realtime (toast + badge) + web push (service worker, subscription mgmt, preferences) + email (Resend); match reminders (client hook + cron route)
- **Post-match:** check-in, reviews/ratings, player stats, MOTM + fair-play awards, achievements, leaderboard, photo gallery
- **Community:** activity feed, leaderboard, public profiles, sharing
- **Platform:** dark mode, mobile-first shell (bottom nav), admin panel, Framer Motion design language

## Realtime
`useRealtimeChannel` (core lifecycle hook) → subscriptions on `notifications` (INSERT → toast/badge), `join_requests` (per match), `messages` (per conversation), typing broadcast. All events **invalidate TanStack Query keys** — never mutate caches directly.

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=        # required
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # required
NEXT_PUBLIC_VAPID_PUBLIC_KEY=    # web push
VAPID_PRIVATE_KEY=               # web push
RESEND_API_KEY=                  # email (absent → email silently disabled)
NEXT_PUBLIC_SITE_URL=            # domain only, no protocol
LOG_LEVEL=debug
```

## Setup
1. Create a Supabase project; run `supabase/migration.sql`, then `-v3`, `-v4`, `-v5` in order.
   ⚠ This does **not** produce the full production schema — see the drift list above / `docs/technical-debt.md`.
2. Enable providers: Google OAuth, Phone OTP (Authentication → Providers).
3. Enable Realtime on: `notifications`, `join_requests`, `matches` (v5 adds `messages`, `conversation_participants`).
4. Create Storage bucket `avatars` (v4) — public read, authenticated upload.
5. Set env vars in `.env`; add OAuth redirect `http://localhost:3000/auth/callback` in Supabase.
6. `npm install && npm run dev`.

## History
Development history (Phases 1–7 hardening/UX/realtime/fields/nearby/profile/redesign, then chat, reviews, waitlist, gamification, mobile V2, push, calendar, fields discovery) is tracked in git: `git log --oneline`. This file describes the **current** state only.
