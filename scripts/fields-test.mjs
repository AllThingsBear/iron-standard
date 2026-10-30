// Server-side checks for per-exercise log fields and optional bonus exercises. Run after `npm run build`:  node scripts/fields-test.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const PORT = 4896;
const BASE = `http://127.0.0.1:${PORT}`;
const dir = mkdtempSync(join(tmpdir(), 'iron-standard-fields-'));
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(PORT)], {
  env: { ...process.env, DB_PATH: join(dir, 'test.db'), NEXT_TELEMETRY_DISABLED: '1' }, stdio: 'ignore'
});
const stop = () => { server.kill(); try { rmSync(dir, { recursive: true, force: true }); } catch {} };
process.on('exit', stop);
const call = async (path, body) => {
  const r = await fetch(BASE + path, body === undefined ? undefined : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json().catch(() => ({})) };
};
const state = () => fetch(BASE + '/api/state').then(r => r.json());
const wait = async () => { for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE + '/api/state')).ok) return; } catch {} await new Promise(r => setTimeout(r, 500)); } throw new Error('server did not start'); };

const ex = (id, name, reps, extra = {}) => ({ id, name, sets: 1, reps, category: 'STRENGTH', description: '', equipment: [], ...extra });
const DAY = '2026-01-07'; // a Wednesday: the program below schedules the walk on every day so the report finds it
const tests = [];
const test = (n, f) => tests.push([n, f]);

test('track and optional are validated and saved; junk values are dropped', async () => {
  const program = {
    sessions: {
      s1: { id: 's1', title: 'Test', subtitle: '', description: '', exercises: [
        ex('walk', 'Comfortable walk', '20-35 min', { equipment: ['bodyweight'] }),
        ex('push', 'Standard push-ups', '8-15', { equipment: ['bodyweight'] }),
        ex('carry', 'Farmer carries', '20-30 sec', { equipment: ['dumbbells'], track: 'weight_time' }),
        ex('curl', 'Hammer curls', '10-12', { equipment: ['dumbbells'], optional: true }),
        ex('junk', 'Odd', '10', { track: 'banana', optional: 'yes' })
      ] }
    },
    week: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => ({ day, session: 's1' }))
  };
  assert.equal((await call('/api/program', { program })).status, 200);
  const e = Object.fromEntries((await state()).program.sessions.s1.exercises.map(x => [x.id, x]));
  assert.equal(e.carry.track, 'weight_time');
  assert.equal(e.curl.optional, true);
  assert.equal(e.junk.track, undefined, 'unknown track values are dropped');
  assert.equal(e.junk.optional, undefined, 'optional must be exactly true');
  assert.equal(e.walk.optional, undefined);
});

test('the trainer report describes each set in its own units', async () => {
  await call('/api/sets', { day: DAY, exercise_id: 'walk', sets: [{ weight: '', reps: 35, pain: 0, notes: 'easy' }] });
  await call('/api/sets', { day: DAY, exercise_id: 'push', sets: [{ weight: '', reps: 12, pain: 2, notes: 'wrist' }] });
  await call('/api/sets', { day: DAY, exercise_id: 'carry', sets: [{ weight: 30, reps: 45, pain: 0, notes: '' }] });
  await call('/api/sets', { day: DAY, exercise_id: 'curl', sets: [{ weight: 20, reps: 12, pain: 0, notes: '' }] });
  const text = (await call('/api/report', { day: DAY })).json.text;
  assert.match(text, /set 1: 35 min, pain 0\/10/);
  assert.match(text, /set 1: 12 reps, pain 2\/10/);
  assert.match(text, /set 1: 30 lb for 45 s, pain 0\/10/);
  assert.match(text, /Hammer curls \[plan 1x10-12\] \[OPTIONAL BONUS\]/);
  assert.match(text, /set 1: 20 lb x 12 reps/);
  assert.doesNotMatch(text, /- lb x/, 'no more "- lb x" for walks and bodyweight moves');
  assert.match(text, /Exercises tagged OPTIONAL BONUS/, 'the brief explains optional exercises');
});

let failed = 0;
try {
  await wait();
  for (const [name, fn] of tests) { try { await fn(); console.log('  ok   ' + name); } catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message); } }
} catch (e) { failed++; console.error(e.message); }
stop();
console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
