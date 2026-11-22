const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const base = __dirname;
const serial = value => JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2);
const save = (name, value) => fs.writeFileSync(path.join(base, name), serial(value));
const norm = value => value.normalize('NFKD').toLowerCase().match(/[\p{L}\p{N}_]+/gu).sort().join(' ');
const families = ['Family 3', 'Family 4'];
// Retain existing player IDs with match statistics. Spreadsheet row identifies
// the complete name; row 50's Tony/Tonny identity was confirmed by the user.
const retainedBySourceRow = { 23: 508, 29: 510, 86: 511, 93: 513, 50: 514, 53: 515, 48: 516, 11: 517, 89: 530 };
async function main() {
  const source = JSON.parse(fs.readFileSync(path.join(base, 'plan.json'), 'utf8')).source_rosters;
  assert.equal(source.length, 48);
  const result = await db.$transaction(async tx => {
    const before = await tx.players.findMany({ orderBy: { id: 'asc' } });
    save('strict-transaction-before.json', before);
    const statisticsBefore = await tx.$queryRawUnsafe(`SELECT 'basketball' AS sport, to_jsonb(s) AS record FROM public.basketball_scores s UNION ALL SELECT 'football', to_jsonb(s) FROM public.football_scores s UNION ALL SELECT 'volleyball', to_jsonb(s) FROM public.volleyball_scores s`);
    save('strict-statistics-before.json', statisticsBefore);
    const selected = source.map(s => {
      const exact = before.filter(p => norm(p.first_name + ' ' + p.last_name) === norm(s.first_name + ' ' + s.last_name));
      const retained = retainedBySourceRow[s.row];
      const player = retained ? before.find(p => p.id === BigInt(retained)) : exact.find(p => p.family === s.family);
      assert(player, `Missing player at spreadsheet row ${s.row}`);
      return { source: s, player };
    });
    const selectedIds = new Set(selected.map(x => x.player.id.toString()));
    assert.equal(selectedIds.size, 48);
    const unassign = before.filter(p => families.includes(p.family) && !selectedIds.has(p.id.toString()));
    const changes = [];
    for (const p of unassign) {
      await tx.players.update({ where: { id: p.id }, data: { family: null } });
      changes.push({ id: p.id, name: p.first_name + ' ' + p.last_name, before: p.family, after: null, reason: 'Surplus duplicate or absent from authoritative roster' });
    }
    for (const { source: s, player: p } of selected) {
      if (p.family === s.family && p.first_name === s.first_name && p.last_name === s.last_name) continue;
      await tx.players.update({ where: { id: p.id }, data: { first_name: s.first_name, last_name: s.last_name, family: s.family } });
      changes.push({ id: p.id, before: p, after: { first_name: s.first_name, last_name: s.last_name, family: s.family }, reason: 'Authoritative spreadsheet identity and family' });
    }
    const after = await tx.players.findMany({ orderBy: { id: 'asc' } });
    assert.equal(after.length, before.length);
    for (const family of families) {
      const actual = after.filter(p => p.family === family).map(p => norm(p.first_name + ' ' + p.last_name)).sort();
      const expected = source.filter(p => p.family === family).map(p => norm(p.first_name + ' ' + p.last_name)).sort();
      assert.equal(actual.length, 24);
      assert.deepEqual(actual, expected);
    }
    const statisticsAfter = await tx.$queryRawUnsafe(`SELECT 'basketball' AS sport, to_jsonb(s) AS record FROM public.basketball_scores s UNION ALL SELECT 'football', to_jsonb(s) FROM public.football_scores s UNION ALL SELECT 'volleyball', to_jsonb(s) FROM public.volleyball_scores s`);
    const ordered = rows => rows.map(r => serial(r)).sort();
    assert.deepEqual(ordered(statisticsAfter), ordered(statisticsBefore));
    const touched = new Set(changes.map(c => c.id.toString()));
    assert.deepEqual(after.filter(p => !touched.has(p.id.toString())), before.filter(p => !touched.has(p.id.toString())));
    save('strict-after.json', after);
    return { verified: true, counts: { 'Family 3': 24, 'Family 4': 24 }, statisticsPreserved: true, unassignedRecords: unassign.length, changes };
  }, { timeout: 60000, isolationLevel: 'Serializable' });
  save('strict-result.json', result);
  console.log(serial({ verified: result.verified, counts: result.counts, statisticsPreserved: result.statisticsPreserved, unassignedRecords: result.unassignedRecords }));
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => db.$disconnect());
