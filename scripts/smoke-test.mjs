// End-to-end smoke test: boots the production server on a throwaway database and exercises the API.
// Run after `npm run build`:  npm test
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
