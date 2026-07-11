# MatchFinder — Project Map

## Tech Stack
- **Framework:** Next.js 16 (App Router, Turbopack)
- **React:** 19
- **Styling:** Tailwind CSS 4 + shadcn/ui (Base UI)
- **Database + Auth:** Supabase (Postgres + Auth + Realtime, Google + Email/Phone OTP)
- **State:** Zustand 5 (client) + TanStack Query 5 (server) + Supabase Realtime (live events)
- **Deploy:** Vercel

## Directory Structure
```
src/
├── app/
│   ├── auth/callback/route.ts      # Supabase OAuth callback
│   ├── dashboard/                   # Authenticated route group (no URL prefix)
│   │   ├── layout.tsx               # Dashboard layout: auth guard + userId + realtime notifications
│   │   ├── page.tsx                 # Dashboard home (upcoming matches + create)
│   │   ├── matches/
│   │   │   ├── page.tsx             # Matches list (URL-persisted filters + search + pagination)
│   │   │   ├── new/page.tsx         # Create match form
│   │   │   └── [id]/
│   │   │       ├── page.tsx         # Match detail (view, join, manage + field card + Google Maps)
│   │   │       └── edit/page.tsx    # Edit match form (field selector)
│   │   ├── nearby/page.tsx          # Nearby Matches (geolocation, distance sort, filters)
│   │   ├── my-matches/page.tsx      # Player's accepted/pending/rejected + withdraw
│   │   └── notifications/page.tsx   # Notifications list + mark all as read
│   │   └── profile/page.tsx         # Profile edit (image upload, fields, privacy toggles)
│   ├── api/
│   │   ├── matches/
│   │   │   ├── route.ts             # GET (list+filter) + POST (create, footballFieldId)
│   │   │   └── [id]/route.ts        # GET (joins football_fields) + PATCH + DELETE
│   │   ├── join-requests/
│   │   │   ├── route.ts             # POST (create/re-request after rejection, prevent duplicate pending)
│   │   │   ├── [id]/route.ts        # PATCH (accept/reject) + DELETE (withdraw pending)
│   │   │   └── mine/route.ts        # GET (player's own requests)
│   │   └── notifications/
│   │       ├── route.ts             # GET (list)
│   │       └── read/route.ts        # PATCH (mark as read)
│   ├── login/page.tsx               # Email/Phone tabs + Google OAuth
│   ├── register/page.tsx            # Email/Phone tabs + Google OAuth
│   ├── page.tsx                     # Landing page
│   └── layout.tsx                   # Root layout (QueryProvider + Toaster)
├── components/
│   ├── ui/                          # shadcn/ui components (textarea, sonner with local theme hook)
│   ├── match-card.tsx               # Match list card
│   ├── nearby-match-card.tsx        # Nearby match card (distance, slots, travel time)
│   ├── distance-filter.tsx          # Distance filter pills (3/5/10/20km)
│   ├── city-fallback.tsx            # City selector for denied location
│   ├── profile-form.tsx             # Profile edit form (image upload, fields, privacy toggles)
│   ├── match-form.tsx               # Create form (field selector, textarea, past-date validation)
│   ├── football-field-selector.tsx  # Airbnb-style field search → list → select → confirm
│   ├── phone-auth.tsx               # Phone OTP send + verify
│   ├── nav-sidebar.tsx              # Dashboard nav (profile loading skeleton, unread badge, connection status)
│   ├── connection-status.tsx        # Realtime connection indicator (green dot = Live)
│   └── query-provider.tsx           # TanStack Query provider
├── hooks/
│   ├── use-matches.ts               # Match CRUD queries/mutations (football_field_id, football_fields join)
│   ├── use-join-requests.ts         # Join request queries/mutations + withdraw
│   ├── use-notifications.ts         # Notification queries/mutations
│   ├── use-football-fields.ts       # Football field queries (search + single)
│   ├── use-geolocation.ts           # Browser geolocation with permission states + retry
│   ├── use-profile.ts               # Profile query + update mutation + avatar upload
│   ├── use-realtime.ts              # Core Supabase Realtime channel management
│   ├── use-realtime-notifications.ts # Realtime notification subscription + toast + badge
│   └── use-realtime-join-requests.ts # Realtime join request subscription per match
├── types/
│   ├── football-field.ts            # FootballField type definition
│   └── profile.ts                   # Profile type, privacy filter, constants
├── stores/
│   └── ui-store.ts                  # Zustand UI state
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # Browser Supabase client (singleton, validates env)
│   │   ├── server.ts                # Server Supabase client with cookies
│   │   └── middleware.ts            # Auth guard for middleware
│   ├── logger.ts                    # Async fire-and-forget logger
│   ├── geo.ts                       # Haversine distance, travel time estimation, constants
│   └── utils.ts                     # cn() utility
├── middleware.ts                     # Next.js middleware (session refresh + auth redirect)
└── index.ts                         # Re-exports
supabase/
├── migration.sql                    # SQL schema v2: hardened RLS + atomic capacity + updated_at trigger
├── migration-v3.sql                 # Football fields table + seed data + RLS + matches column
└── migration-v4.sql                 # Profile fields + privacy settings + avatars storage bucket
```

## Database Schema (Supabase SQL)
- **profiles** — id (UUID, PK), name, email, image, position, city, bio, phone, whatsapp, facebook, instagram, show_phone, show_whatsapp, show_facebook, show_instagram, created_at, updated_at
- **matches** — id (UUID), title, description, date, location, football_field_id (FK → football_fields, nullable), max_players (2–100), status (OPEN/FULL/CLOSED/COMPLETED), organizer_id (FK → profiles), created_at, updated_at
- **join_requests** — id (UUID), status (PENDING/ACCEPTED/REJECTED), message, match_id (FK → matches), player_id (FK → profiles), created_at, updated_at; UNIQUE (match_id, player_id)
- **notifications** — id (UUID), title, message, read, user_id (FK → profiles), created_at, updated_at
- **football_fields** — id (UUID), name, address, city, latitude, longitude, image_url, created_at
- **RLS** enabled on all tables; notification INSERT restricted to `auth.uid() = user_id`
- **Triggers:** auto-creates a profile row on auth.users insert; auto-updates `updated_at` on all tables
- **Functions:** `create_notification()` (security definer), `accept_join_request()` (atomic capacity check)
- **Seed data:** 12 football fields across 6 cities in Banlieue Sud Tunis

## Routes
| Page | Path | Auth |
|------|------|------|
| Landing | `/` | No |
| Login | `/login` | No |
| Register | `/register` | No |
| Dashboard | `/dashboard` | Yes |
| **Nearby Matches** | **`/dashboard/nearby`** | **Yes** |
| Matches list | `/dashboard/matches` | Yes |
| Create match | `/dashboard/matches/new` | Yes |
| Match detail | `/dashboard/matches/[id]` | Yes |
| Edit match | `/dashboard/matches/[id]/edit` | Yes |
| My matches | `/dashboard/my-matches` | Yes |
| Notifications | `/dashboard/notifications` | Yes |
| **My Profile** | **`/dashboard/profile`** | **Yes** |

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/matches` | List matches (filter: status, search, page) |
| POST | `/api/matches` | Create match (footballFieldId, past-date validation) |
| GET | `/api/matches/[id]` | Get match detail (joins football_fields) |
| PATCH | `/api/matches/[id]` | Update match (organizer only, footballFieldId) |
| DELETE | `/api/matches/[id]` | Delete match (organizer only) |
| POST | `/api/join-requests` | Send join request / re-request after rejection |
| PATCH | `/api/join-requests/[id]` | Accept/reject (organizer only) |
| DELETE | `/api/join-requests/[id]` | Withdraw pending request (player only) |
| GET | `/api/join-requests/mine` | Player's own requests |
| GET | `/api/notifications` | List notifications |
| PATCH | `/api/notifications/read` | Mark as read |

All API routes have: UUID validation, try/catch on `req.json()`, proper auth checks.

## Realtime Architecture
```
Supabase Realtime → useRealtimeChannel (core hook)
    ↓
├── useRealtimeNotifications (notifications table INSERT)
│   ├── Shows toast notification
│   ├── Invalidates ["notifications"] query
│   └── Updates unread badge via onUnreadCountChange callback
│
└── useRealtimeJoinRequests (join_requests table per match_id)
    ├── Invalidates ["match", id] query → match detail auto-updates
    ├── Invalidates ["matches"] query → list auto-updates
    └── Invalidates ["join-requests"] query → my-matches auto-updates
```

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=           # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Supabase anon/public key
LOG_LEVEL=debug
```

## Setup Required
1. Create a Supabase project at https://supabase.com
2. Run `supabase/migration.sql` in the Supabase SQL Editor (drop existing tables first)
3. Run `supabase/migration-v3.sql` (football fields)
4. Enable Google OAuth provider in the Supabase dashboard (Authentication → Providers)
5. Enable Phone OTP provider in the Supabase dashboard (Authentication → Providers → Phone)
6. Enable Realtime on tables: `notifications`, `join_requests`, `matches` (Database → Replication)
7. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env`
8. Add OAuth redirect URL in Supabase: `http://localhost:3000/auth/callback`

## Phase 1 Hardening (Applied)
- **Security:** notification INSERT RLS tightened to `auth.uid() = user_id`, `create_notification()` is security definer, capacity enforcement via atomic `accept_join_request()` RPC
- **DB:** `updated_at` auto-update trigger on all tables, `max_players` upper bound (100)
- **API robustness:** UUID validation + try/catch on `req.json()` in all routes
- **Code cleanup:** removed `prisma/schema.prisma`, `pg`, `next-themes`, duplicate Toaster, unused imports
- **Performance:** `NavContent` extracted to module scope to prevent React remount on every render
- **sonner.tsx:** replaced `next-themes` with local MutationObserver hook

## Phase 2 UX Improvements (Applied)
- **Profile loading:** skeleton pulse while profile loads, no more "User" flash
- **Withdraw requests:** DELETE endpoint + button on match detail + my-matches pending list
- **Re-request after rejection:** POST resets rejected request to PENDING, "Request again" button
- **Past-date validation:** API rejects past dates, forms set `min` on date input + client-side check
- **Description textarea:** shadcn/ui Textarea component for match descriptions
- **Unread badge:** NavSidebar shows unread notification count, refreshes on tab focus
- **Filters in URL:** matches list reads/writes filters to search params (shareable URLs)

## Phase 3 Realtime (Applied)
- **Core hook:** `useRealtimeChannel` — manages Supabase channel lifecycle, proper cleanup, deduplication
- **Realtime notifications:** subscribe to notifications INSERT → toast + badge + query invalidation
- **Realtime join requests:** subscribe to join_requests per match → match detail auto-updates
- **Dashboard layout:** lifts userId, mounts realtime notifications, passes unread callback to NavSidebar
- **Connection status:** green/red dot indicator in sidebar footer (Live/Offline)
- **TanStack Query integration:** all realtime events invalidate existing queries

## Phase 4 Football Fields (Applied)
- **Database:** `football_fields` table with name, address, city, latitude, longitude, image_url
- **Seed data:** 12 fields across 6 Banlieue Sud Tunis cities (Boumhel, Rades, Ezzahra, Hammam Lif, Megrine, Ben Arous)
- **Matches column:** `football_field_id` nullable FK on matches (backward compatible)
- **Field selector:** Airbnb-style search → list → select → confirm component
- **Match detail:** field card with image, name, address, city + Google Maps link
- **RLS:** authenticated users can view all fields, all authenticated can modify
- **API:** POST/PATCH accept `footballFieldId`, GET joins `football_fields`

## Phase 5 Nearby Matches (Applied)
- **Geolocation:** `useGeolocation` hook — browser permission request, loading/granted/denied/prompt states, retry
- **Distance calculation:** Haversine formula in `src/lib/geo.ts`, travel time estimation (~30km/h urban average)
- **Nearby page:** `/dashboard/nearby` — main feature, sorts all OPEN matches by distance from user
- **Distance filters:** 3km, 5km, 10km, 20km pill buttons (shown when location granted)
- **City fallback:** native select dropdown for 6 Banlieue Sud Tunis cities (shown when location denied/prompt)
- **Match cards:** distance badge (m/km), estimated travel time, remaining slots, date/time, city
- **API update:** matches GET now joins `football_fields` for latitude/longitude coordinates
- **Nav:** "Nearby Matches" added as second nav item (MapPin icon)
- **Performance:** TanStack Query `staleTime: 30s`, client-side sort/filter with `useMemo`, grid layout

## Phase 6 Profile Enhancement (Applied)
- **Database:** profiles table extended with position, city, bio, phone, whatsapp, facebook, instagram, show_phone, show_whatsapp, show_facebook, show_instagram
- **Storage:** Supabase Storage bucket `avatars` (public read, authenticated upload own folder)
- **Profile page:** `/dashboard/profile` — image upload with preview, name, position select, city select, bio textarea, contact fields with privacy toggles
- **Privacy model:** `filterPublicProfile()` — strips contact fields based on `show_*` booleans unless viewer is the profile owner
- **Match detail:** organizer shows position + privacy-aware contact links (Phone, WhatsApp, Facebook, Instagram)
- **Join requests:** player shows position + avatar image + privacy-aware contact links
- **Match card:** organizer shows position after name
- **API:** all match/join-request selects now include full profile fields
- **Types:** `MatchOrganizer` expanded with all profile fields; `filterPublicProfile()` utility in `src/types/profile.ts`
- **Nav:** "My Profile" added as last nav item (User icon)
