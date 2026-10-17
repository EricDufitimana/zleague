# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Next.js dev server (http://localhost:3000)
npm run build    # runs `prisma generate` then `next build`
npm run start    # serve the production build
npm run lint     # next lint (eslint flat config)
npx prisma generate   # regenerate the client after editing prisma/schema.prisma
npx prisma db pull    # schema is managed in Supabase; pull changes down rather than migrating
```

There is no test framework configured. `test-supabase.js`, `test-middleware.js` and
`inspect-schema.js` at the repo root are throwaway `node <file>` connectivity/inspection
scripts, not a test suite.

### Database workflow

`prisma/` has **no migrations directory** — the Postgres schema lives in Supabase and
`schema.prisma` is a hand-maintained mirror of it. Changing a model here does not change
the database. Apply DDL in Supabase (or `supabase/`) first, then update `schema.prisma`
and run `prisma generate`. Hand-written migrations that have been applied are kept in
`prisma/sql/` with a matching `.rollback.sql`.

Known drift between `schema.prisma` and the live database:

- `matches.penalty_score` and `users.role` are read in app code but absent from the schema.
- `volleyball_scores` exists only as a Supabase table, queried through the REST client.
- `players.grade` uses a `grade_type` enum whose labels include `Ingabe`, a typo-looking
  fourth value that the data genuinely uses for EY players.

### Families

Families are **data, not code**. They live in the `families` table (name, grade, gender,
`is_active`, `sort_order`) and are managed from `/dashboard/families`. Do not hardcode
family names anywhere — fetch them from `/api/families` (or `fetchFamilies()` in
`src/lib/grades.ts`).

`teams.name` and `players.family` are `text` columns with foreign keys onto
`families.name` using **`ON UPDATE CASCADE`**, so renaming a family rewrites every team
and player row that referenced it in the same statement — that is the whole mechanism
behind the rename feature, and there is no follow-up write to do. `ON DELETE` is
`RESTRICT`: a family still in use cannot be deleted, only deactivated, which is what keeps
finished championships readable. Both columns used to be the `family_type` enum, which is
why renaming previously needed `ALTER TYPE`. That enum still exists, unused, so
`prisma/sql/2026-10-17-families-table.rollback.sql` stays viable.

`src/lib/grades.ts` now holds only the structural parts: the grade ladder, labels,
`NEXT_GRADE`, badge colours and the EY team-stats-only rule.

### The yearly promotion

Families move up one grade each year: `ey → s4 → s5 → s6 → alumni`. Promotion is now two
updates — `families.grade` (the roster going forward) and `teams.grade` scoped to
**ongoing** championships, so ended ones keep the grades their games were played at. See
`prisma/sql/2026-10-15-promote-grades.sql` for the applied example; note the `grade` enum
needs any new value added in its own statement, because PostgreSQL cannot use a freshly
added enum label in the transaction that added it.

`players.grade` (`grade_type`: Ishami/Ijabo/Ingabo/**Ingabe**) is a separate taxonomy that
is display-only and is *not* promoted. Its real pairing is S6→Ishami, S5→Ijabo, S4→Ingabo,
EY→Ingabe — the inverse of what `api/players/route.ts` used to claim.

## Architecture

Next.js 15 App Router + React 18 + TypeScript, Supabase (Postgres + Auth + Realtime),
Prisma, TanStack Query, Tailwind v4 with shadcn/ui ("new-york", `@/components/ui`).
`output: "standalone"` in `next.config.ts`. Path alias `@/*` → `src/*`.

Domain: an inter-family school sports championship (ZLeague). Championships contain teams
(one per family × `TeamGrade` × gender), matches are played in basketball, football
or volleyball, and winners advance through gender-specific bracket stages
(`BoysStages`: preliminary → semi-finals → finals; `GirlsStages` adds quarter-finals).

### Two data-access paths — know which one you are in

This is the single most important thing to understand before editing:

1. **Supabase JS client** (`@supabase/supabase-js`, `@supabase/ssr`) — used by every
   `src/app/api/*/route.ts` handler, by client components, and by the Realtime hooks.
   API routes almost always construct a **service-role** client inline
   (`createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)`), which bypasses RLS,
   so authorization is the route's own responsibility.
2. **Prisma** (`src/lib/prisma.ts`) — used *only* by the server actions in `src/actions/`.
   Prisma IDs are `BigInt`; actions take string ids, wrap them in `BigInt(...)`, and must
   serialize results back before returning them to the client (see the `serializeBigInt`
   helper repeated in the livescore actions).

New write paths that need transactional/atomic increment semantics belong in
`src/actions/` with Prisma; simple CRUD and anything realtime-adjacent follows the
existing Supabase-in-the-route-handler pattern.

### Auth and the admin gate

`src/middleware.ts` → `src/utils/supabase/middleware.ts` runs on every non-static request.
It refreshes the Supabase session (never insert code between `createServerClient` and
`supabase.auth.getUser()`), and for any `/dashboard/*` path it looks the user up in the
`users` table with a service-role client and redirects to `/` unless `users.role === 'admin'`.
That row check — not just "is signed in" — is the whole admin authorization model; there
are no other guards on dashboard pages or on the API routes they call.

Three Supabase client factories exist and are not interchangeable:
`src/utils/supabase/client.ts` (browser, anon key), `src/utils/supabase/server.ts`
(cookie-backed server client, plus `createAdminClient()` for service-role), and
`src/lib/supabase.js` (legacy plain anon client). Note the server/middleware clients use
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` while the browser client uses
`NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### Route groups

- `src/app/(site)/` — public pages (`/`, `/bracket`, `/leaders`, `/predictors`) under
  `Navbar`; the layout is a client component that sets the page title from the pathname.
- `src/app/(live-score)/live-score/[matchId]` (basketball) and
  `.../live-score/football/[matchId]` — the live scoring consoles.
- `src/app/dashboard/` — admin area behind the middleware gate, wrapped in the
  shadcn `SidebarProvider` + `SportsSidebar` + `SportsHeader` shell.
- `src/app/api/` — REST handlers; `src/actions/` — `"use server"` mutations.

### Live scoring: optimistic queue + Realtime, and how they interact

Live basketball/football scoring is the most intricate subsystem. Per match:

- `useRealtimeBasketballScores` / `useRealtimeFootballScores` own the
  `["basketball-scores", matchId]` and `["match-scores", matchId]` query caches and
  subscribe to Supabase Realtime for invalidation.
- `useMutationQueue` serializes stat increments: each tap is pushed to an in-memory queue
  that is **mirrored to `localStorage`** (key `basketball-mutation-queue`, per match) so it
  survives reloads, applies an optimistic cache delta immediately, and drains one item at a
  time through the `updateBasketballScore` server action. It pauses on `offline`, resumes on
  `online`, and retries network errors up to 10 times.
- While the queue is draining it writes `['queue-status', matchId]` with
  `blockRealtime: true`; the realtime hooks check that flag and **suppress invalidation**,
  otherwise a server echo would clobber in-flight optimistic increments.

If you touch either side, preserve that `blockRealtime` handshake — dropping it
reintroduces score flicker and lost taps. Score updates are additive deltas (`+1 point`),
not absolute values.

### Bracket progression

`src/app/api/matches/route.ts` owns tournament advancement: on a result it computes the
next stage from `TOURNAMENT_STATUSES` (male vs female ladders differ), then finds or
creates the next-round match and links it via `next_match_id`, counting existing feeders so
each next-round match takes exactly two and finals stay singular. The public bracket page
renders this with `@sportsgram/brackets`.

### UI conventions

shadcn/ui components in `src/components/ui/` are generated — prefer `npx shadcn@latest add`
over hand-writing them. Feature components are grouped by area
(`dashboard/`, `sports/`, `navigation/`, `layout/`, `shared/`). Tailwind v4 is configured
through `@tailwindcss/postcss` and `src/app/globals.css`; `tailwind.config.ts` is a small
legacy file that only wires up HeroUI theming and the custom `grade-1..4` / `redish` colors
(HeroUI itself is installed but not currently imported anywhere). Toasts come from `sonner`
via the `<Toaster />` in the root layout. Server state is TanStack Query only — the provider
defaults to a 1-minute `staleTime` and `refetchOnWindowFocus: false`.

## Notes

- `src/app/dashboard/testing/` and `src/components/dashboard/` (Project*/TimeTracker/etc.)
  are leftover scaffolding from a template, not part of the product.
- Several pages are very large (`dashboard/record/page.tsx` ~3.4k lines,
  `live-score/[matchId]/page.tsx` ~1.7k) — read the relevant section rather than the file.
- `test-supabase.js` and `inspect-schema.js` contain hardcoded Supabase URLs and keys,
  including a service-role key. Do not copy that pattern; these should be rotated and the
  files removed.
- `ImprovedWheel` owns its canvas, its animation frame and its spin state. Drive it through
  the `WheelHandle` ref (`spin()` / `reset()`), never by toggling a parent `isSpinning`
  flag — the prop arrives a render late, which previously let repeated clicks start
  competing animation loops. `draw()` resizes its own backing store, so changes in
  `devicePixelRatio` (moving monitors, page zoom) cannot leave the wheel clipped.
