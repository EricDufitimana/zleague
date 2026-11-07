// Run explicitly against a configured database: node tests/group-stage.database.cjs
// All verification records are held in one transaction that always rolls back.
require('dotenv').config();
require('dotenv').config({ path: '.env.local', override: true });
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { PrismaClient } = require('@prisma/client');
const sourcePath = path.resolve(__dirname, '../src/lib/group-stage.ts');
const subject = new Module(sourcePath, module);
subject._compile(ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, sourcePath);
const { qualificationOrder, calculateStandings } = subject.exports;
const db = new PrismaClient();
const championshipId = -2026110701n;
const rollback = new Error('Verification completed; roll back all records.');

async function expectDatabaseError(tx, run, message) {
  await tx.$executeRawUnsafe('SAVEPOINT expected_failure');
  let failure;
  try { await run(); } catch (error) { failure = error; }
  await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT expected_failure');
  await tx.$executeRawUnsafe('RELEASE SAVEPOINT expected_failure');
  assert.ok(failure, 'The invalid operation should have been rejected.');
  assert.match(failure.message, message);
}

async function main() {
  const existing = await db.$queryRawUnsafe('SELECT id FROM championships WHERE id=$1', championshipId);
  assert.equal(existing.length, 0, 'Verification ID is already in use; no test writes were made.');
  try {
    await db.$transaction(async tx => {
      const families = await tx.$queryRawUnsafe("SELECT id FROM families WHERE gender='male' AND is_active ORDER BY id LIMIT 6");
      assert.equal(families.length, 6, 'Six active boys families are required for this verification.');
      await tx.$executeRawUnsafe("INSERT INTO championships(id,name,status) VALUES ($1,'Group-stage verification (rolled back)','ongoing')", championshipId);
      const ids = families.map((_, i) => -20261107010n - BigInt(i));
      for (let i = 0; i < families.length; i++) {
        await tx.$executeRawUnsafe(`INSERT INTO teams(id,championship_id,name,grade,gender)
          SELECT $1::bigint,$2::bigint,name,grade,gender FROM families WHERE id=$3::bigint`, ids[i], championshipId, families[i].id);
      }
      const a = ids.slice(0, 3).join(','), b = ids.slice(3).join(',');
      const draw = (sport, first = a, second = b) => tx.$executeRawUnsafe(`SELECT public.create_boys_groups(
        $1::bigint,$2::public.sport_type,string_to_array($3,',')::bigint[],string_to_array($4,',')::bigint[])`, championshipId, sport, first, second);
      await expectDatabaseError(tx, () => draw('football', a, a), /six different/i);
      for (const sport of ['football', 'basketball', 'volleyball']) {
        await draw(sport);
        const groups = await tx.$queryRawUnsafe('SELECT * FROM tournament_groups WHERE championship_id=$1 AND sport_type=$2::public.sport_type ORDER BY name', championshipId, sport);
        assert.equal(groups.length, 2);
        for (const group of groups) {
          const fixtures = await tx.$queryRawUnsafe('SELECT * FROM matches WHERE group_id=$1 ORDER BY id', group.id);
          assert.equal(fixtures.length, 3);
          assert.ok(fixtures.every(m => m.next_match_id === null && m.boys_stage_groups === null));
          const appearances = new Map();
          for (const fixture of fixtures) for (const id of [fixture.team_a_id, fixture.team_b_id]) appearances.set(id.toString(), (appearances.get(id.toString()) || 0) + 1);
          assert.deepEqual([...appearances.values()], [2, 2, 2]);
        }
        await expectDatabaseError(tx, () => draw(sport), /already has boys fixtures/i);
      }
      const footballGroups = await tx.$queryRawUnsafe("SELECT * FROM tournament_groups WHERE championship_id=$1 AND sport_type='football' ORDER BY name", championshipId);
      const matches = await tx.$queryRawUnsafe("SELECT * FROM matches WHERE championship_id=$1 AND sport_type='football' ORDER BY id", championshipId);
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        await tx.$executeRawUnsafe(`UPDATE matches SET status='played',winner_id=team_a_id,team_a_score=1,
          team_b_score=$2::int,penalty_score=$3::jsonb WHERE id=$1::bigint`, match.id, i === 0 ? 1 : 0,
          i === 0 ? JSON.stringify({ team_a: 4, team_b: 3 }) : null);
      }
      const results = await tx.$queryRawUnsafe("SELECT * FROM matches WHERE championship_id=$1 AND sport_type='football' ORDER BY id", championshipId);
      const normalized = results.map(m => ({ ...m, id: Number(m.id), team_a_id: Number(m.team_a_id), team_b_id: Number(m.team_b_id),
        winner_id: Number(m.winner_id), team_a_score: Number(m.team_a_score), team_b_score: Number(m.team_b_score),
        created_at: m.created_at.toISOString(), match_time: m.match_time?.toISOString() }));
      const orders = [];
      for (const group of footballGroups) {
        const teams = await tx.$queryRawUnsafe('SELECT t.id,t.name FROM teams t JOIN tournament_group_teams g ON g.team_id=t.id WHERE g.group_id=$1', group.id);
        const data = { ...group, teams: teams.map(t => ({ ...t, id: Number(t.id) })), matches: normalized.filter(m => m.group_id === group.id) };
        const standings = calculateStandings(data.teams, data.matches);
        assert.equal(standings[0].points, 6);
        assert.equal(standings[0].mp, 2);
        if (group.name === 'A') {
          assert.equal(standings[0].difference, 1, 'Shootout goals must not affect GD.');
          assert.ok(standings[0].form.some(r => r.penalties));
        }
        orders.push(qualificationOrder(data));
      }
      const snapshot = normalized.map(m => ({ id: m.id, status: m.status, winner_id: m.winner_id, team_a_score: m.team_a_score, team_b_score: m.team_b_score }));
      const seeds = [orders[0][0], orders[1][1], orders[1][0], orders[0][1]].join(',');
      const finalize = snapshot => tx.$executeRawUnsafe(`SELECT public.finalize_boys_groups($1::bigint,'football',
        string_to_array($2,',')::bigint[],$3::jsonb)`, championshipId, seeds, JSON.stringify(snapshot));
      await expectDatabaseError(tx, () => finalize([]), /changed or are incomplete/i);
      await finalize(snapshot);
      const finalGroups = await tx.$queryRawUnsafe("SELECT * FROM tournament_groups WHERE championship_id=$1 AND sport_type='football' ORDER BY name", championshipId);
      assert.ok(finalGroups.every(g => g.finalized));
      assert.deepEqual(finalGroups.map(g => g.qualification_order.map(Number)), orders);
      const knockout = await tx.$queryRawUnsafe("SELECT * FROM matches WHERE championship_id=$1 AND group_id IS NULL ORDER BY id", championshipId);
      assert.equal(knockout.length, 3);
      const final = knockout.find(m => m.boys_stage_groups === 'finals');
      assert.ok(final);
      assert.ok(knockout.filter(m => m.boys_stage_groups === 'semi-finals').every(m => m.next_match_id === final.id));
      await expectDatabaseError(tx, () => finalize(snapshot), /already finalized/i);
      await expectDatabaseError(tx, () => tx.$executeRawUnsafe('UPDATE matches SET team_a_score=99 WHERE id=$1', results[0].id), /results are locked/i);
      await expectDatabaseError(tx, () => tx.$executeRawUnsafe('DELETE FROM matches WHERE id=$1', results[0].id), /results are locked/i);
      const privileges = await tx.$queryRawUnsafe(`SELECT
        has_function_privilege('anon','public.create_boys_groups(bigint,public.sport_type,bigint[],bigint[])','EXECUTE') AS anonymous_draw,
        has_function_privilege('authenticated','public.finalize_boys_groups(bigint,public.sport_type,bigint[],jsonb)','EXECUTE') AS user_finalize,
        has_function_privilege('service_role','public.create_boys_groups(bigint,public.sport_type,bigint[],bigint[])','EXECUTE') AS server_draw`);
      assert.deepEqual(privileges[0], { anonymous_draw: false, user_finalize: false, server_draw: true });
      throw rollback;
    }, { timeout: 120000, maxWait: 15000 });
  } catch (error) { if (error !== rollback) throw error; }
  const leftover = await db.$queryRawUnsafe('SELECT id FROM championships WHERE id=$1', championshipId);
  assert.equal(leftover.length, 0);
  console.log('Database integration passed: all-sport draws, fixture counts, shootout GD, qualification, stale-result protection, result locks, RPC privileges, and full verification rollback.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
