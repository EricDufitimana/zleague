const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');
const filename = path.resolve(__dirname, '../src/lib/restore-match-scores.ts');
const subject = new Module(filename, module);
subject._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, filename);
const { restoreTeamScores } = subject.exports;

test('restores current player-only basketball results without mixing opponents', () => {
  const restored = restoreTeamScores([
    { team_id: 1, player_id: 11, points: 12, rebounds: 3, assists: 2 },
    { team_id: 1, player_id: 12, points: 8, rebounds: 4, assists: 1 },
    { team_id: 2, player_id: 21, points: 19, rebounds: 10, assists: 9 },
  ], 1, 'basketball', 20);
  assert.equal(restored.points, 20);
  assert.equal(restored.rebounds, 7);
  assert.equal(restored.assists, 3);
});

test('restores player-only football results and goalkeeper statistics', () => {
  const restored = restoreTeamScores([
    { team_id: 1, player_id: 11, goals: 2, assists: 1, shots_on_target: 4 },
    { team_id: 1, player_id: 12, goals: 0, saves: 3 },
  ], 1, 'football', 2);
  assert.equal(restored.goals, 2);
  assert.equal(restored.assists, 1);
  assert.equal(restored.saves, 3);
});

test('legacy team totals are not added to player statistics', () => {
  const restored = restoreTeamScores([
    { team_id: 1, player_id: null, goals: 2, assists: 1 },
    { team_id: 1, player_id: 11, goals: 2, assists: 1 },
  ], 1, 'football', 2);
  assert.equal(restored.goals, 2);
  assert.equal(restored.assists, 1);
});

test('a scoreless team or 0–0 shootout result can have no player rows', () => {
  assert.equal(restoreTeamScores([], 1, 'football', 0).goals, 0);
  assert.equal(restoreTeamScores([], 2, 'football', 0).goals, 0);
});

test('missing nonzero statistics block editing instead of silently loading zeros', () => {
  assert.throws(() => restoreTeamScores([], 1, 'football', 2), /missing/);
  assert.throws(() => restoreTeamScores([], 1, 'basketball'), /missing/);
});

test('preserves recorded totals when player data needs correction', () => {
  assert.equal(restoreTeamScores([{ team_id: 1, player_id: 11, goals: 1 }], 1, 'football', 2).goals, 2);
});
