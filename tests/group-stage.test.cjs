const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');
const filename = path.resolve(__dirname, '../src/lib/group-stage.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const subject = new Module(filename, module);
subject._compile(compiled, filename);
const { calculateStandings, qualificationOrder, validateGroupAssignments, validateDecisiveResult } = subject.exports;
const teams = [{ id: 1, name: 'Alpha' }, { id: 2, name: 'Beta' }, { id: 3, name: 'Gamma' }];
function match(id, a, b, aScore, bScore, winner, extra = {}) {
  return { id, team_a_id: a, team_b_id: b, team_a_score: aScore, team_b_score: bScore, winner_id: winner,
    status: 'played', sport_type: 'football', created_at: `2026-11-0${id}T10:00:00Z`, ...extra };
}
function group(matches) { return { id: 1, name: 'A', championship_id: 1, sport_type: 'football', finalized: false, teams, matches }; }

test('single round robin standings award three points per win and ignore unfinished fixtures', () => {
  const results = [match(1, 1, 2, 2, 0, 1), match(2, 1, 3, 1, 0, 1), match(3, 2, 3, 3, 0, 2), match(4, 1, 2, 9, 0, 1, { status: 'live' })];
  const rows = calculateStandings(teams, results);
  assert.deepEqual(rows.map(r => [r.team.id, r.mp, r.wins, r.losses, r.difference, r.points]), [[1, 2, 2, 0, 3, 6], [2, 2, 1, 1, 1, 3], [3, 2, 0, 2, -4, 0]]);
  assert.deepEqual(qualificationOrder(group(results.slice(0, 3))), [1, 2, 3]);
});
test('penalty win gives a full win and zero additional goal difference', () => {
  const rows = calculateStandings(teams, [match(1, 1, 2, 1, 1, 2, { penalty_score: { team_a: 3, team_b: 4 } })]);
  assert.equal(rows[0].team.id, 2); assert.equal(rows[0].points, 3); assert.equal(rows[0].difference, 0);
  assert.equal(rows[0].form[0].penalties, true); assert.match(rows[0].form[0].label, /Won 1–1.*on penalties/);
  assert.equal(rows.find(r => r.team.id === 1).losses, 1);
});
test('form shows the latest three, oldest to newest, independent of fetch order', () => {
  const rows = calculateStandings(teams, [4, 1, 3, 2].map(id => match(id, 1, 2, 1, 0, 1)));
  assert.deepEqual(rows[0].form.map(r => r.matchId), [2, 3, 4]);
});
test('circular ties require an explicit official ranking', () => {
  const g = group([match(1, 1, 2, 1, 0, 1), match(2, 2, 3, 1, 0, 2), match(3, 3, 1, 1, 0, 3)]);
  assert.ok(calculateStandings(teams, g.matches).every(r => r.tied));
  assert.throws(() => qualificationOrder(g), /Resolve the tied ranking/);
  assert.deepEqual(qualificationOrder(g, [3, 1, 2]), [3, 1, 2]);
});
test('head-to-head breaks equal wins and equal goal difference', () => {
  const results = [match(1, 1, 2, 3, 0, 1), match(2, 1, 3, 0, 1, 3), match(3, 2, 3, 5, 0, 2)];
  const rows = calculateStandings(teams, results);
  assert.deepEqual(rows.map(r => r.team.id), [1, 2, 3]);
  assert.equal(rows[0].difference, rows[1].difference);
  assert.equal(rows[0].points, rows[1].points);
  assert.equal(rows[0].tied, false);
});
test('qualification rejects incomplete groups and arbitrary changes to clear rankings', () => {
  const results = [match(1, 1, 2, 2, 0, 1), match(2, 1, 3, 1, 0, 1), match(3, 2, 3, 3, 0, 2)];
  assert.throws(() => qualificationOrder(group(results.slice(0, 2))), /Finish all three/);
  assert.throws(() => qualificationOrder(group(results), [2, 1, 3]), /Only teams still tied/);
  assert.throws(() => qualificationOrder(group(results), [1, 1, 2]), /exactly once/);
});
test('draw rejects duplicate, ineligible or incorrectly sized groups', () => {
  assert.doesNotThrow(() => validateGroupAssignments([1, 2, 3], [4, 5, 6], [1, 2, 3, 4, 5, 6]));
  for (const [a, b] of [[[1, 2, 3], [1, 5, 6]], [[1, 2], [4, 5, 6]], [[1, 2, 3], [4, 5, 7]]]) {
    assert.throws(() => validateGroupAssignments(a, b, [1, 2, 3, 4, 5, 6]));
  }
});
test('all sports require decisive results and football shootouts must agree with the winner', () => {
  const football = { sport_type: 'football', team_a_id: 1, team_b_id: 2 };
  assert.doesNotThrow(() => validateDecisiveResult(football, 1, 1, 2, { team_a: 3, team_b: 4 }));
  assert.throws(() => validateDecisiveResult(football, 1, 1, 1, null), /shootout/);
  assert.throws(() => validateDecisiveResult(football, 1, 1, 1, { team_a: 3, team_b: 4 }), /winner/);
  assert.throws(() => validateDecisiveResult(football, 2, 1, 2, null), /winner/);
  assert.throws(() => validateDecisiveResult(football, 2, 1, 1, { team_a: 3, team_b: 4 }), /only/);
  assert.throws(() => validateDecisiveResult(football, -1, 0, 2, null), /non-negative/);
  for (const sport_type of ['basketball', 'volleyball']) assert.throws(() => validateDecisiveResult({ ...football, sport_type }, 2, 2, 1, null), /cannot finish tied/);
});
