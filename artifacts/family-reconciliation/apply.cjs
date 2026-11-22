const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createClient } = require('@supabase/supabase-js');
const base = __dirname;
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const save = (name, data) => fs.writeFileSync(path.join(base, name), JSON.stringify(data, null, 2));
async function roster() {
  const { data, error } = await client.from('players').select('*').order('id').range(0, 999);
  if (error) throw error;
  assert(data.length < 1000, 'Pagination required');
  return data;
}
async function main() {
  const plan = JSON.parse(fs.readFileSync(path.join(base, 'plan.json'), 'utf8'));
  const before = await roster();
  save('apply-before.json', before);
  for (const change of plan.changes) {
    const player = before.find(p => p.id === change.id);
    assert(player && player.family === change.before && player.first_name === change.first_name && player.last_name === change.last_name, `Player ${change.id} changed since review`);
  }
  const applied = [];
  try {
    for (const change of plan.changes) {
      const { data, error } = await client.from('players').update({ family: change.after })
        .eq('id', change.id).eq('family', change.before)
        .eq('first_name', change.first_name).eq('last_name', change.last_name).select('id,family');
      if (error) throw error;
      assert.equal(data.length, 1, `Update failed for ${change.id}`);
      applied.push(change);
      save('applied.json', applied);
    }
    const after = await roster();
    const expected = before.map(p => ({ ...p, family: plan.changes.find(c => c.id === p.id)?.after ?? p.family }));
    assert.deepEqual(after, expected, 'Unexpected roster differences');
    save('database-after.json', after);
    const report = { verified: true, changed: applied.length, totalPlayers: after.length,
      counts: Object.fromEntries(['Family 3', 'Family 4'].map(f => [f, after.filter(p => p.family === f).length])),
      unresolved: plan.unresolved };
    save('verification.json', report);
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    const rollback = [];
    for (const change of applied.reverse()) {
      const result = await client.from('players').update({ family: change.before }).eq('id', change.id).eq('family', change.after).select('id');
      rollback.push({ id: change.id, error: result.error, rows: result.data?.length });
    }
    save('rollback-result.json', rollback);
    throw error;
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
