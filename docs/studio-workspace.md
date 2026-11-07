# Studio public pages and league operations

The approved Studio palette is applied to `/`, `/bracket`, `/leaders` and
`/predictors`: warm cream, navy, orange, lavender and yellow, with locally bundled
Host Grotesk and Archivo. The public layout has no palette switch or sample data.
The `/tests` routes retain those controls for future design review. The shared
sport mark uses Lucide’s volleyball drawing for consistent, clean seams.

The shared sign-in/register dialog uses the Studio theme. Registration fields,
Google OAuth, pending metadata and the existing callback routes are retained.
Forms provide native validation, an inline connection error, and keyboard focus
handling through the existing dialog component.

## Dashboard structure

`DashboardShell` replaces the generic sidebar/header shell. Its navigation is
grouped by the work admins do:

| Area | Route | Purpose |
| --- | --- | --- |
| Overview | `/dashboard` | Live games, fixtures needing dates, follow-up results and setup shortcuts |
| Match center | `/dashboard/schedule` | Filter, schedule, reschedule and review fixtures |
| Record results | `/dashboard/record` | Enter team totals, participating players and final results |
| Championships & teams | `/dashboard/create-championship` | Create a season and manage its teams |
| Groups & draws | `/dashboard/match` | Enter the boys’ group setup or girls’ knockout draw |
| Families | `/dashboard/families` | Maintain the shared family directory |

The championship picker is shared across the workspace. Selection travels in
`championship_id` query parameters and is remembered in sessionStorage. Dynamic
team/draw routes take their championship from the path. An ended-championship
notice makes archive context explicit.

The Overview counts only the selected championship. “Follow up” means a fixture
is still scheduled although its start time has passed; it does not assume the
match was played. Fixtures waiting for opponents are separate from fixtures that
are ready to schedule.

The Match center has views for all fixtures, dates needed, scheduled games, live
games, follow-up work, completed matches and unconfirmed opponents. Search,
sport/division filters and a date filter narrow that list. Scheduling uses the
browser’s displayed timezone and submits an ISO timestamp. An exact-time team
conflict is flagged before submission. Existing match writes and authorization
remain on the server.

Match links include `match_id`, so recording opens the selected fixture directly.
The result page reuses the selected championship and match query instead of
prefetching score breakdowns for every championship. The duplicated totals and
all-matches table are removed. Background refresh pauses on result entry so it
cannot reset a draft. Existing score validation, player selection and live-score
queue behavior are retained. Player selection uses an accessible modal; football
and basketball team panels sit side by side on wide screens.

New result forms start with participant selection instead of opening fields for
the entire roster. Reviewing a saved/live fixture restores the existing team and
player statistics from the score APIs. Responses for a previously selected
fixture are ignored, and failed restoration blocks editing until a retry
succeeds so an unloaded result cannot be overwritten with blank values.

Creating a championship now leads directly to adding teams, and the team page
links onward to the draw. The creation dialog explains the existing behavior
that starting a new championship ends the current one. Existing template routes
`/dashboard/team` and `/dashboard/testing` redirect into the real workspace.

## Predictions and validation

Public predictions use real fixtures and real authenticated submissions. The
server derives the submitting profile from the session, validates the chosen
opponent, checks that picks are open, and rejects an existing pick. `/tests`
continues to save test picks locally; they are never submitted automatically.

Validation includes TypeScript, lint checks for the new components, the
production Next build, 14 group-stage/prediction behavior tests, public-page
browser checks, and dashboard layout/interaction checks at 320, 390, 768, 1024
and 1440 pixels. Dashboard browser checks use a disposable local copy and
intercept mutations; they do not change league data or the workspace’s admin
middleware. The real anonymous dashboard gate and prediction rejection are
checked separately. OAuth is preserved but no real Google login is performed
during automated checks.

Review screenshots are under `artifacts/studio/`. The isolated Windows build
emits the existing Supabase Edge warning and a junction-related standalone-copy
warning; compilation, type validation and route generation pass.
