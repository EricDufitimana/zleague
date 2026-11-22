const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const serialize = value => JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2);
async function main() {
  const result = await db.$transaction(async tx => {
    await tx.$executeRawUnsafe('LOCK TABLE public.families, public.players, public.teams IN SHARE ROW EXCLUSIVE MODE');
    const families = await tx.families.findMany({ where: { name: { in: ['Family 3', 'Family 4', 'Andrew Rwigamba', 'Archimedes'] } } });
    assert.equal(families.length, 2, 'Unexpected source or destination families');
    assert(families.some(f => f.name === 'Family 3') && families.some(f => f.name === 'Family 4'));
    const players = await tx.players.findMany({ orderBy: { id: 'asc' } });
    const teams = await tx.teams.findMany({ orderBy: { id: 'asc' } });
    const statsQuery = `SELECT 'basketball' AS sport, to_jsonb(s) AS record FROM public.basketball_scores s UNION ALL SELECT 'football', to_jsonb(s) FROM public.football_scores s UNION ALL SELECT 'volleyball', to_jsonb(s) FROM public.volleyball_scores s`;
    const stats = await tx.$queryRawUnsafe(statsQuery);
    const before = { families, players, teams, statistics: stats };
    fs.writeFileSync(path.join(__dirname, 'swap-rename-before.json'), serialize(before));
    assert.equal(players.filter(p => p.family === 'Family 3').length, 24);
    assert.equal(players.filter(p => p.family === 'Family 4').length, 24);
    // Swap membership in one statement; the two family records remain in place.
    await tx.$executeRawUnsafe(`UPDATE public.players SET family = CASE family WHEN 'Family 3' THEN 'Family 4' WHEN 'Family 4' THEN 'Family 3' END WHERE family IN ('Family 3', 'Family 4')`);
    // Foreign keys cascade the new family names onto player and team records.
    await tx.families.update({ where: { name: 'Family 3' }, data: { name: 'Andrew Rwigamba' } });
    await tx.families.update({ where: { name: 'Family 4' }, data: { name: 'Archimedes' } });
    const afterPlayers = await tx.players.findMany({ orderBy: { id: 'asc' } });
    const memberNames = { 'Family 3': 'Archimedes', 'Family 4': 'Andrew Rwigamba' };
    assert.deepEqual(afterPlayers, players.map(p => ({ ...p, family: memberNames[p.family] || p.family })));
    const afterTeams = await tx.teams.findMany({ orderBy: { id: 'asc' } });
    const teamNames = { 'Family 3': 'Andrew Rwigamba', 'Family 4': 'Archimedes' };
    assert.deepEqual(afterTeams, teams.map(t => ({ ...t, name: teamNames[t.name] || t.name })));
    const afterFamilies = await tx.families.findMany({ where: { id: { in: families.map(f => f.id) } } });
    for (const original of families) {
      const actual = afterFamilies.find(f => f.id === original.id);
      assert.deepEqual(actual, { ...original, name: teamNames[original.name] });
    }
    const afterStats = await tx.$queryRawUnsafe(statsQuery);
    assert.deepEqual(afterStats.map(serialize).sort(), stats.map(serialize).sort());
    return { verified: true, families: afterFamilies, rosters: afterPlayers.filter(p => ['Andrew Rwigamba', 'Archimedes'].includes(p.family)), teamsRenamed: afterTeams.filter(t => ['Andrew Rwigamba', 'Archimedes'].includes(t.name)).length, statisticsPreserved: true };
  }, { timeout: 60000, isolationLevel: 'Serializable' });
  fs.writeFileSync(path.join(__dirname, 'swap-rename-result.json'), serialize(result));
  console.log(serialize({ verified: true, rosters: Object.fromEntries(['Andrew Rwigamba', 'Archimedes'].map(f => [f, result.rosters.filter(p => p.family === f).length])), teamsRenamed: result.teamsRenamed, statisticsPreserved: true }));
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => db.$disconnect());
