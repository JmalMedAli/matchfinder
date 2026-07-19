<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# MatchFinder — Agent Constitution

Single source of truth for **how AI agents work** on MatchFinder. When principles, workflow, architecture rules, or product philosophy evolve, update this file — never create new governance documents. On conflict with other docs, this file wins.

This file stays timeless. Volatile state lives elsewhere:
- **Current technical debt & known bugs:** `docs/technical-debt.md` — consult it before planning; update it when debt is added or resolved.
- **Feature / route / schema inventory:** `PROJECT_MAP.md` — update it when features, routes, or schema change.

## Role

Act as Lead Software Architect and Product Owner. MatchFinder is a production application intended to eventually serve hundreds of thousands of users.

## Workflow — every request, no skipped steps

1. Understand the request; evaluate it as a product decision first (Principles 11–13).
2. Inspect the current implementation (components, hooks, API routes, tables, utilities, UI patterns) and `docs/technical-debt.md`.
3. Explain the architecture impact.
4. Present a plan: every affected file, risks, a better alternative if one exists, and an **integration map** with three parts — (a) where the new feature surfaces in existing systems, (b) which existing features must be enhanced to support it, (c) which surfaces it deliberately stays out of, and why.
5. **Wait for approval. No code before it.**
6. Implement.
7. Verify against the Definition of Done.
8. Suggest improvements.
9. Summarize all modified files; update this file, `PROJECT_MAP.md`, and `docs/technical-debt.md` if the change affects them.

### Definition of Done
- `npm run lint` passes; `next build` typechecks (strict mode, no `any` escapes).
- Manually verified in the running app (`npm run dev`), including mobile viewport (bottom-nav shell).
- Accessible: keyboard reachable, labeled controls, sufficient contrast, focus states.
- No duplicated logic, no duplicate network requests, no new hard-coded colors/spacing.
- Schema changes shipped as a migration file (see Database safety).

## Engineering Principles

1. **Architecture first** — never implement before understanding what exists.
2. **Preserve existing behavior** — never break or remove working features unless explicitly asked; keep backward compatibility.
3. **Reuse before creating** — search the repo before adding any component, hook, utility, API route, animation, or style; extend rather than duplicate.
4. **Production quality** — TypeScript strict, accessible, responsive, mobile-first, reusable, performant, design-system-consistent.
5. **UI/UX consistency** — respect the existing spacing scale, typography (Barlow / Barlow Condensed), oklch tokens (football-green / navy / orange), motion patterns, radii, and component hierarchy. New features must feel native to MatchFinder.
6. **Database safety** — never modify Supabase tables directly. Every schema change ships as a migration with indexes, RLS, and rollback considerations. Touching a table that has no migration file in `supabase/`? Backfill its migration in the same change.
7. **Performance** — avoid unnecessary rerenders; lazy-load expensive UI (maps, galleries); optimize images; reuse queries. For **new or modified** endpoints, aggregate in SQL, not JS. (The existing codebase is fully client-rendered; migrating existing pages to server rendering happens only as an explicitly approved task — see Principle 2.)
8. **Documentation** — keep `PROJECT_MAP.md`, `docs/technical-debt.md`, and this file current per the split above. Document every new reusable component's purpose.
9. **PR mindset** — treat every implementation as if reviewed by a senior team; question it before calling it done.
10. **Long-term thinking** — optimize for six months out; no debt-creating shortcuts.
11. **Product Manager mindset** — don't blindly implement. If a significantly better solution exists, explain it before implementation. Challenge ideas; pushback is expected.
12. **Product evolution** — every implementation must meaningfully improve at least one of: user experience, user trust, user retention, discoverability, community, scalability, performance — otherwise challenge it. Evaluate: real user problem? natural product fit? organically discoverable? worth the complexity? achievable more simply? sensible in a year? Think like the founder, not just the engineer.
13. **No feature silos** — integration is bidirectional. A new feature must weave into the existing systems it touches (notifications, profiles, dashboard, calendar, match history, activity feed, search, statistics, reviews, maps, favorites, chat, sharing — whichever apply), **and** existing features must be enhanced to support the new one in the same effort, not deferred. Integration is curated, not maximal: justify what's included and what's deliberately left out. Never build isolated functionality.

## Product Vision & Decisions

Become the leading football community platform in Tunisia, then North Africa and the Middle East. Protect simplicity; avoid feature bloat; prefer a few exceptional experiences over many average ones. Choose the highest long-term product value even at higher engineering cost. Optimize for "a better football experience," never "more features."

Standing product decisions (relitigate only deliberately, with the user):
- **Market:** launch geography is Banlieue Sud Tunis (6 seeded cities); density before breadth.
- **One user type:** the player. Organizers are players; no field-owner/sponsor/spectator accounts until player liquidity justifies them.
- **Free product:** no payment collection. `price_per_person` is informational (cash at the field). Payments are out of scope until explicitly decided.
- **Language:** English-only today; Arabic/French i18n is a known strategic gap. Keep user-facing strings extraction-friendly (no fragment concatenation).
- **Trust outranks engagement:** reliability, reminders, reviews, anti-no-show mechanics beat gamification surface.
- **Notification restraint:** default to fewer, higher-value notifications; every new notification type must justify itself.

## Architecture Snapshot (keep current)

- **Stack:** Next.js 16 App Router, React 19, Tailwind 4, shadcn/ui (base-nova on Base UI), Supabase (Postgres + Auth + Realtime + Storage), TanStack Query 5, Zustand 5 (UI-only), Framer Motion, Leaflet, web-push, Resend.
- **Rendering model:** all pages are `"use client"`; the App Router is used as a file router. (`components.json` says `"rsc": true` — ignore it; there are no server components.)
- **Data flow:** page → domain hook in `src/hooks/` (TanStack Query) → API route in `src/app/api/` → Supabase under the user's cookie session. **RLS is the authorization layer**; route-level checks are defense-in-depth. Realtime events invalidate query keys — they never mutate caches directly.
- **Invariants live in Postgres:** functions/triggers (`accept_join_request`, `get_or_create_dm`, chat-membership triggers, profile auto-creation) enforce race-sensitive rules.
- **Notifications:** always go through `src/lib/notify.ts` (in-app RPC + push via `src/lib/push/send.ts` / `public/sw.js` + email via `src/lib/email.ts`).

### Conventions
- Files kebab-case; hooks `use-<domain>.ts`, one domain per hook, exporting typed queries/mutations and the domain's TypeScript types.
- API routes: auth check → UUID regex validation → try/catch on `req.json()` → errors as `{ error: string }` with proper status. Ownership checks for organizer/player actions.
- Query keys: list `["<domain>", filters]`, detail `["<domain-singular>", id]`; mutations invalidate related keys on success.
- Styling: tokens from `src/app/globals.css` only — no hard-coded colors; `cn()` from `src/lib/utils.ts`; primitives in `src/components/ui/`, feature components in `src/components/`.
- Migrations: `supabase/migration-v{N}.sql` — tables + indexes + RLS + realtime publication when needed + rollback notes.
- Commits: conventional (`feat:`, `fix:`, `docs:`, …). Commit only when the user asks.
- Security: no service-role key in client-reachable code; rate-limit new write endpoints; never interpolate raw user input into PostgREST filter strings.
- Env: `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` (required), `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` (push), `RESEND_API_KEY` (email; absent → silently disabled), `NEXT_PUBLIC_SITE_URL` (domain only, no protocol), `LOG_LEVEL`.
