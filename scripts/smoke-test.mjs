// End-to-end smoke test: boots the production server on a throwaway database and exercises the API.
// Run after `npm run build`:  npm test
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';

const PORT = 4899;
const BASE = `http://127.0.0.1:${PORT}`;
const dir = mkdtempSync(join(tmpdir(), 'iron-standard-test-'));
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(PORT)], {
  env: { ...process.env, DB_PATH: join(dir, 'test.db'), NEXT_TELEMETRY_DISABLED: '1' }, stdio: 'ignore'
});
const stop = () => { server.kill(); try { rmSync(dir, { recursive: true, force: true }); } catch {} };
process.on('exit', stop);

const call = async (path, body, method = 'POST') => {
  const r = await fetch(BASE + path, body === undefined ? undefined : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json().catch(() => ({})) };
};
const state = () => fetch(BASE + '/api/state').then(r => r.json());

async function waitUp() {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE + '/api/state')).ok) return; } catch {} await new Promise(r => setTimeout(r, 500)); }
  throw new Error('server did not start');
}

// Mock AI provider (OpenAI-compatible + Anthropic shapes) so the integration is tested without a real service.
const MOCK_PORT = 4898;
const seen = [];
const FENCE = '`'.repeat(3);
const REPLY = ['VERDICT', 'Solid session.', '', 'NEXT SESSION', '- Push-ups: slow the lowering.', '', FENCE + 'picks',
  '[{"exercise_id":"pushupA","weight":null,"reps":"2 x 12","note":"slow tempo"},{"exercise_id":"not-real","weight":50,"reps":"3 x 8","note":"x"},{"exercise_id":"pushupA","weight":9999,"reps":"","note":"too heavy"}]',
  FENCE].join('\n');
const mock = http.createServer((req, res) => {
  let b = ''; req.on('data', d => b += d); req.on('end', () => {
    const body = b ? JSON.parse(b) : {}; seen.push({ url: req.url, headers: req.headers, body });
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/v1/chat/completions') return res.end(JSON.stringify({ choices: [{ message: { content: body.max_tokens === 20 ? 'OK' : '<think>hidden reasoning</think>' + String.fromCharCode(10) + REPLY } }] }));
    if (req.url === '/v1/messages') return res.end(JSON.stringify({ content: [{ type: 'text', text: body.max_tokens === 20 ? 'OK' : REPLY }] }));
    res.statusCode = 404; res.end('{}');
  });
}).listen(MOCK_PORT, '127.0.0.1');
const raw = (path, { method = 'POST', headers = {}, body = '{}' } = {}) => new Promise((resolve, reject) => {
  const r = http.request({ host: '127.0.0.1', port: PORT, path, method, headers: { 'Content-Type': 'application/json', ...headers } }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, text: d })); });
  r.on('error', reject); r.end(method === 'GET' ? undefined : body);
});

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('fresh install is not onboarded and has a neutral starter program', async () => {
  const s = await state();
  assert.equal(s.profile.onboarded, false);
  assert.ok(s.program.sessions.fullA);
  assert.equal(s.profile.startWeight, null);
});
test('onboarding saves profile and honours program choice once', async () => {
  const r = await call('/api/profile', { profile: { units: 'metric', startWeight: 90, goalWeight: 80, kcal: 2200, protein: 150, limitations: 'sore knee' }, programChoice: 'empty' });
  assert.equal(r.status, 200);
  let s = await state();
  assert.equal(s.profile.onboarded, false); // not yet marked onboarded (client sets it); program already chosen
  await call('/api/profile', { profile: { onboarded: true } });
  await call('/api/profile', { profile: {}, programChoice: 'starter' }); // must be ignored after onboarding
  s = await state();
  assert.equal(s.profile.onboarded, true);
  assert.equal(s.profile.units, 'metric');
  assert.ok(!s.program.sessions.fullA, 'program must not be overwritten after onboarding');
});
test('per-set logging validates and persists', async () => {
  const day = '2026-01-05';
  assert.equal((await call('/api/sets', { day, exercise_id: 'walk', sets: [{ weight: 10, reps: 5, pain: 11 }] })).status, 400);
  assert.equal((await call('/api/sets', { day, exercise_id: 'walk', sets: [{ weight: 10, reps: 5, pain: 2, notes: 'ok' }] })).status, 200);
  const s = await state();
  assert.equal(s.sets.length, 1);
  assert.equal(s.sets[0].pain, 2);
});
test('session confirm, trainer note, and report', async () => {
  const day = '2026-01-05';
  assert.equal((await call('/api/session', { day, general_note: 'felt good', confirmed: true })).status, 200);
  assert.equal((await call('/api/trainer-note', { day, author: 'Test coach', body: 'Nice work.' })).status, 200);
  const r = await call('/api/report', { day });
  assert.equal(r.status, 200);
  assert.match(r.json.text, /90 -> 80 kg/);
  assert.match(r.json.text, /sore knee/);
  assert.match(r.json.text, /Test coach/);
});
test('program editor saves, validates, preserves ids, and reports removed exercises', async () => {
  const day7 = (a, b) => ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((d, i) => ({ day: d, session: i % 2 ? b : a }));
  const prog = {
    sessions: {
      chestA: { id: 'chestA', title: 'Chest', subtitle: '', description: '', exercises: [{ id: 'pushupA', name: 'Push-ups', sets: 99, reps: '10', category: 'strength', description: '', equipment: [], works: ['Chest', '  ', 'Triceps'], benefit: '  builds pressing  ' }] },
      rest: { id: 'rest', title: 'Rest', subtitle: '', description: '', exercises: [] }
    },
    week: day7('chestA', 'rest')
  };
  assert.equal((await call('/api/program', { program: prog })).status, 200);
  const s = await state();
  const ex = s.program.sessions.chestA.exercises[0];
  assert.equal(ex.id, 'pushupA', 'mixed-case ids must be preserved');
  assert.equal(ex.sets, 20, 'sets are clamped');
  assert.equal(ex.category, 'STRENGTH');
  assert.deepEqual(ex.works, ['Chest', 'Triceps']);
  assert.equal(ex.benefit, 'builds pressing');
  const dup = structuredClone(prog); dup.sessions.rest.exercises = [{ id: 'pushupA', name: 'X', sets: 1, reps: '1', category: 'CORE', description: '' }];
  assert.equal((await call('/api/program', { program: dup })).status, 400, 'duplicate exercise ids rejected');
  assert.equal((await call('/api/program', { program: { sessions: {}, week: [] } })).status, 400);
  assert.equal((await state()).program.sessions.chestA.exercises[0].id, 'pushupA', 'rejected saves change nothing');
  // logs for an exercise no longer in the program still reach the trainer report
  await call('/api/sets', { day: '2026-01-06', exercise_id: 'removedMove', sets: [{ weight: 5, reps: 5, pain: 0, notes: 'kept' }] });
  const r = await call('/api/report', { day: '2026-01-06' });
  assert.match(r.json.text, /removedMove \[not in the current program/);
});
test('export, import (merge + replace), backup, restore', async () => {
  assert.equal((await call('/api/recommendation', { exercise_id: 'pushupA', weight: 35, reps: '3 x 8-12', note: 'n', author: 'Coach' })).status, 200);
  assert.equal((await call('/api/recommendation', { exercise_id: 'pushupA', weight: -5 })).status, 400);
  const exp = await (await fetch(BASE + '/api/export')).json();
  assert.equal(exp.recommendations.length, 1);
  assert.equal(exp.format, 'iron-standard-export');
  assert.ok(exp.set_log.length >= 1 && exp.trainer_notes.length >= 1);
  const csv = await (await fetch(BASE + '/api/export?format=csv')).text();
  assert.match(csv.split('\n')[0], /^date,exercise,exercise_id,set,weight_kg,reps,pain_0_10,note$/);
  const before = await state();
  // merge twice is idempotent (no duplicate trainer notes or sets)
  assert.equal((await call('/api/import', { data: exp, mode: 'merge' })).status, 200);
  const r2 = await call('/api/import', { data: exp, mode: 'merge' });
  assert.equal(r2.status, 200);
  assert.equal(r2.json.counts.trainer_notes, 0, 'duplicate notes are not re-added');
  assert.ok(r2.json.backup && /pre-import/.test(r2.json.backup), 'a safety backup is taken first');
  const afterMerge = await state();
  assert.equal(afterMerge.sets.length, before.sets.length);
  assert.equal(afterMerge.notes.length, before.notes.length);
  // a bad file is rejected and changes nothing
  const bad = structuredClone(exp); bad.set_log.push({ day: 'not-a-date', exercise_id: 'x', set_no: 1 });
  assert.equal((await call('/api/import', { data: bad, mode: 'replace' })).status, 400);
  assert.equal((await call('/api/import', { data: { format: 'something-else' }, mode: 'replace' })).status, 400);
  assert.equal((await state()).sets.length, before.sets.length);
  // backup, wipe via replace-import of an empty export, then restore
  const b = await call('/api/backup', {});
  assert.equal(b.status, 200);
  const empty = { format: 'iron-standard-export', version: 1 };
  assert.equal((await call('/api/import', { data: empty, mode: 'replace' })).status, 200);
  assert.equal((await state()).sets.length, 0, 'replace removed the data');
  const rr = await call('/api/backup/restore', { name: b.json.name });
  assert.equal(rr.status, 200);
  const restored = await state();
  assert.equal(restored.sets.length, before.sets.length);
  assert.equal(restored.notes.length, before.notes.length);
  assert.equal(restored.profile.units, 'metric');
  assert.equal(restored.recommendations.length, 1, 'trainer picks survive backup/restore');
  assert.equal(restored.program.sessions.chestA.exercises[0].id, 'pushupA');
});
test('backup names cannot escape the backups folder', async () => {
  assert.equal((await call('/api/backup/restore', { name: '../test.db' })).status, 400);
  assert.equal((await call('/api/backup/restore', { name: 'iron-standard-x/../../y.db' })).status, 400);
  assert.equal((await fetch(BASE + '/api/backup/..%2F..%2Fetc%2Fpasswd')).status, 400);
  assert.equal((await fetch(BASE + '/api/backup/iron-standard-nope.db')).status, 404);
});
test('request guard blocks other hosts, cross-site and non-JSON writes', async () => {
  assert.equal((await raw('/api/state', { method: 'GET', headers: { Host: 'evil.example.com' } })).status, 403, 'DNS rebinding host');
  assert.equal((await raw('/api/session', { headers: { Origin: 'https://evil.example.com' }, body: '{"day":"2026-01-05"}' })).status, 403, 'cross-origin');
  assert.equal((await raw('/api/session', { headers: { 'Sec-Fetch-Site': 'cross-site' }, body: '{"day":"2026-01-05"}' })).status, 403, 'cross-site');
  assert.equal((await raw('/api/session', { headers: { 'Content-Type': 'text/plain' }, body: '{"day":"2026-01-05"}' })).status, 415, 'simple-request CSRF');
  assert.equal((await raw('/api/state', { method: 'GET' })).status, 200, 'normal local requests still work');
});
test('AI trainer: key is write-only, reply saved as an AI-labelled note, picks are proposals only', async () => {
  assert.equal((await state()).notes.filter(n => /AI trainer/.test(n.author)).length, 0);
  assert.equal((await call('/api/ai/ask', { day: '2026-01-05' })).status, 502, 'not configured -> clear error');
  assert.equal((await call('/api/ai/config', { provider: 'openai', baseUrl: 'ftp://nope' })).status, 400);
  assert.equal((await call('/api/ai/config', { provider: 'openai', baseUrl: `http://127.0.0.1:${MOCK_PORT}/v1`, model: 'test-model', apiKey: 'sk-test-SECRET-123' })).status, 200);
  const cfgText = await (await fetch(BASE + '/api/ai/config')).text();
  assert.ok(!cfgText.includes('SECRET'), 'API key must never be returned');
  assert.match(cfgText, /"hasKey":true/);
  assert.equal((await call('/api/ai/test', {})).status, 200);
  const before = await state();
  const r = await call('/api/ai/ask', { day: '2026-01-05' });
  assert.equal(r.status, 200);
  assert.equal(r.json.proposals.length, 1, 'invalid ids and absurd weights are dropped');
  assert.equal(r.json.proposals[0].exercise_id, 'pushupA');
  const sent = seen.filter(s => s.url === '/v1/chat/completions').pop();
  assert.match(sent.body.messages[1].content, /TRAINER EVALUATION REQUEST/, 'the report is what gets sent');
  assert.equal(sent.headers.authorization, 'Bearer sk-test-SECRET-123');
  const after = await state();
  const note = after.notes.find(n => /AI trainer/.test(n.author));
  assert.ok(note && note.author.includes('test-model') && !note.body.includes('```picks') && !note.body.includes('hidden reasoning'), 'saved as an AI-labelled note without the machine block or inlined reasoning');
  assert.equal(after.sets.length, before.sets.length, 'history untouched');
  assert.deepEqual(after.profile, before.profile, 'goals/profile untouched');
  assert.deepEqual(after.recommendations, before.recommendations, 'picks are NOT applied automatically');
  // Anthropic shape
  assert.equal((await call('/api/ai/config', { provider: 'anthropic', baseUrl: `http://127.0.0.1:${MOCK_PORT}`, model: 'claude-test' })).status, 200);
  assert.equal((await call('/api/ai/ask', { day: '2026-01-05' })).status, 200);
  assert.equal(seen.filter(s => s.url === '/v1/messages').pop().headers['x-api-key'], 'sk-test-SECRET-123');
  // The key must not leak through exports
  assert.ok(!(await (await fetch(BASE + '/api/export')).text()).includes('SECRET'), 'export must not contain the key');
  assert.equal((await call('/api/ai/config', { provider: 'none', clearKey: true })).status, 200);
  assert.match(await (await fetch(BASE + '/api/ai/config')).text(), /"hasKey":false/);
});
test('invalid dates and notes are rejected', async () => {
  assert.equal((await call('/api/session', { day: 'nope' })).status, 400);
  assert.equal((await call('/api/trainer-note', { day: '2026-01-05', body: '   ' })).status, 400);
});

let failed = 0;
try {
  await waitUp();
  for (const [name, fn] of tests) {
    try { await fn(); console.log('  ok   ' + name); } catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message); }
  }
} catch (e) { failed++; console.error(e.message); }
stop();
mock.close();
console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
