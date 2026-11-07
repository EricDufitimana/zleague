const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');
const filename = path.resolve(__dirname, '../src/app/api/predictions/route.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
function endpoint(options = {}) {
  const writes = [], lookups = [];
  const db = { from(table) {
    const builder = {
      inserted: null,
      select() { return this; }, eq(key, value) { lookups.push([table, key, value]); return this; },
      insert(value) { this.inserted = value; writes.push(value); return this; },
      limit() { return Promise.resolve({ data: options.existing ? [{ id: 1 }] : [], error: null }); },
      single() {
        if (table === 'users') return Promise.resolve({ data: options.noProfile ? null : { id: 7 }, error: null });
        if (table === 'matches') return Promise.resolve({ data: options.missingMatch ? null : { id: 10, status: 'scheduled', match_time: new Date(Date.now() + 86400000).toISOString(), team_a_id: 21, team_b_id: 22, championship: { status: 'ongoing' }, ...options.match }, error: null });
        return Promise.resolve({ data: { id: 100, ...this.inserted }, error: options.insertError || null });
      },
    }; return builder;
  } };
  const subject = new Module(filename, module);
  subject.require = name => name === 'next/server' ? { NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) } }
    : name === '@/utils/supabase/server' ? { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: options.anonymous ? null : { id: 'signed-in-auth-id' } } }) } }), createAdminClient: () => db }
    : require(name);
  subject._compile(compiled, filename);
  return { post: body => subject.exports.POST({ json: async () => body }), writes, lookups };
}
test('anonymous visitors cannot submit predictions', async () => { const api = endpoint({ anonymous: true }); assert.equal((await api.post({ match_id: 10, predicted_winner_id: 21, user_id: 7 })).status, 401); assert.equal(api.writes.length, 0); });
test('the prediction belongs to the authenticated profile, ignoring a supplied user id', async () => { const api = endpoint(); const result = await api.post({ match_id: 10, predicted_winner_id: 22, user_id: 999 }); assert.equal(result.status, 201); assert.deepEqual(api.writes, [{ match_id: 10, predicted_winner_id: 22, user_id: 7, is_correct: null }]); assert.ok(api.lookups.some(([table, key, value]) => table === 'users' && key === 'user_id' && value === 'signed-in-auth-id')); });
test('rejects a winner who is not playing and fixtures without both opponents', async () => { for (const options of [{}, { match: { team_b_id: null } }]) { const api = endpoint(options); assert.equal((await api.post({ match_id: 10, predicted_winner_id: options.match ? 21 : 99 })).status, 400); assert.equal(api.writes.length, 0); } });
test('rejects live, completed, started and ended-championship fixtures', async () => { for (const match of [{ status: 'live' }, { status: 'played' }, { match_time: new Date(Date.now() - 1000).toISOString() }, { championship: { status: 'ended' } }]) { const api = endpoint({ match }); assert.equal((await api.post({ match_id: 10, predicted_winner_id: 21 })).status, 409); assert.equal(api.writes.length, 0); } });
test('rejects an existing pick and reports a concurrent uniqueness conflict', async () => { const existing = endpoint({ existing: true }); assert.equal((await existing.post({ match_id: 10, predicted_winner_id: 21 })).status, 409); assert.equal(existing.writes.length, 0); const duplicate = endpoint({ insertError: { code: '23505' } }); assert.equal((await duplicate.post({ match_id: 10, predicted_winner_id: 21 })).status, 409); });
test('handles missing profiles, invalid ids and missing matches without writing', async () => { for (const [options, body, expected] of [[{ noProfile: true }, { match_id: 10, predicted_winner_id: 21 }, 403], [{}, { match_id: -1, predicted_winner_id: 21 }, 400], [{ missingMatch: true }, { match_id: 10, predicted_winner_id: 21 }, 404]]) { const api = endpoint(options); assert.equal((await api.post(body)).status, expected); assert.equal(api.writes.length, 0); } });
