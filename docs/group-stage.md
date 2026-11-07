# Boys’ group stage

Each sport has an independent draw: two groups of three boys’ teams. Each pair
plays once, generating three fixtures per group. Girls retain their knockout draw.

## Database setup

Apply `prisma/sql/2026-11-07-boys-groups.sql` once against the configured Supabase
Postgres database. It adds `tournament_groups`, `tournament_group_teams`,
`matches.group_id`, and two service-role-only functions for atomic fixture creation
and qualification. The app accesses these tables through Supabase; their models
are also mirrored in `prisma/schema.prisma`. After applying the SQL, regenerate
the Prisma client with `npx prisma generate`.

The migration was applied and verified on 7 November 2026. A transaction that
always rolls back was used to test draws for all three sports, qualification,
result locks and duplicate protection without keeping verification fixtures.

The migration leaves existing fixtures and results unchanged. Creating groups for
a sport with existing boys’ fixtures is refused: use a new championship rather
than silently converting or deleting a historical bracket. The rollback also
refuses to discard existing group fixtures.

## Using the feature

1. Add six boys’ family teams to a championship.
2. Open **Dashboard → Matches**, select the championship and a sport.
3. Assign three different teams to each group, or shuffle and review the draw.
4. Create the groups, then schedule the six fixtures in **Schedule**.
5. Record results using the existing consoles or **Record Results**.
6. Once every group match is played, review qualifiers and confirm qualification.

Qualification creates A1 vs B2 and B1 vs A2 plus a shared final. It locks group
results so later corrections cannot invalidate an ongoing knockout bracket.
Repeated finalization is rejected. A snapshot check rejects finalization if
results changed while they were being reviewed.

Public standings and fixtures appear at **Groups & Bracket**. They refresh every
15 seconds. Football shows MP, W, L, GD, Pts and Last 3. Basketball and volleyball
show MP, W, L and Last 3. Result badges can be tapped to reveal the opponent and
score. Each team only has two group fixtures, so one Last 3 slot remains empty.

## Ranking and shootouts

All wins earn three standings points, including shootouts. Rank by points (the
same ordering as wins), then score difference, then wins in a head-to-head
mini-table among teams still tied. Differences use football goals, basketball
points, and volleyball sets. Ties still unresolved require an explicit official
order before qualification; the API permits only genuinely tied teams to move.
That official order is stored and survives reloads.

Football draws require a decisive shootout. The full-time score remains drawn,
shootout goals never affect GD, and the winner receives a full win. Match cards
and group fixtures show “Won on penalties” with the shootout score; form badges
carry a P marker for both the winner and loser. Basketball must continue into
overtime and volleyball into a deciding set rather than recording a draw.

Basketball no longer collects attempts or makes for three-point shots. +3 still
adds three total points. Existing three-point values remain in storage and are
preserved when an existing score row is edited, but are no longer displayed.

## Verification

```sh
node --test tests/group-stage.test.cjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm run build -- --no-lint
```

Database integration requires a working Supabase connection and the migration.
Run `node tests/group-stage.database.cjs` for the database checks; its verification
records are always rolled back, including when an assertion fails.
New group writes and scoring paths verify admin access on the server, including
the scoring consoles outside the dashboard middleware gate.
