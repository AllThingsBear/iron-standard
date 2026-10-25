// Launch test for the packaged desktop app (Windows). Works on release/win-unpacked or on an installed copy.
//   node scripts/desktop-smoke.mjs "<folder containing IRON STANDARD.exe>"
// It uses a throwaway data/settings folder, so it never touches a real installation's data.
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';

const dir = process.argv[2];
if (!dir) { console.error('usage: node scripts/desktop-smoke.mjs <app folder>'); process.exit(2); }
const exe = join(dir, 'IRON STANDARD.exe');
assert.ok(existsSync(exe), `not found: ${exe}`);
assert.ok(existsSync(join(dir, 'resources', 'server', 'node_modules', 'next', 'package.json')), 'packaged server is missing node_modules/next');

const tmp = mkdtempSync(join(tmpdir(), 'iron-desktop-smoke-'));
const portFile = join(tmp, 'port.txt');
const get = (port, path) => new Promise((res, rej) => http.get({ host: '127.0.0.1', port, path, timeout: 5000 }, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => res({ status: r.statusCode, body: b })); }).on('error', rej));
const post = (port, path, obj) => new Promise((res, rej) => { const d = JSON.stringify(obj); const r = http.request({ host: '127.0.0.1', port, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(d) } }, x => { let b = ''; x.on('data', c => b += c); x.on('end', () => res({ status: x.statusCode, body: b })); }); r.on('error', rej); r.end(d); });
const sleep = ms => new Promise(r => setTimeout(r, ms));

let app, failed = false;
try {
  app = spawn(exe, [`--user-data-dir=${join(tmp, 'ud')}`], { env: { ...process.env, IRON_STANDARD_DATA_DIR: join(tmp, 'data'), IRON_STANDARD_PORT_FILE: portFile }, stdio: 'ignore' });
  let port = 0;
  for (let i = 0; i < 90 && !port; i++) { await sleep(1000); if (existsSync(portFile)) port = Number(readFileSync(portFile, 'utf8')); if (app.exitCode !== null) break; }
  assert.ok(port, 'the app never reported a port (it exited or the server failed to start). Check ' + join(tmp, 'ud', 'logs', 'server.log') + (existsSync(join(tmp, 'ud', 'logs', 'server.log')) ? '\n' + readFileSync(join(tmp, 'ud', 'logs', 'server.log'), 'utf8').slice(-600) : ''));
  const state = await get(port, '/api/state');
  assert.equal(state.status, 200); assert.equal(JSON.parse(state.body).profile.onboarded, false);
  assert.equal((await get(port, '/')).status, 200);
  assert.match((await get(port, '/')).body, /IRON STANDARD/);
  assert.equal((await get(port, '/figures/pushup.svg')).status, 200, 'public files are served');
  const css = (await get(port, '/')).body.match(/\/_next\/static\/[^"']+\.css/)?.[0]; assert.ok(css, 'page links a stylesheet');
  assert.equal((await get(port, css)).status, 200, 'static assets are served');
  assert.equal((await post(port, '/api/profile', { profile: { onboarded: true, units: 'metric', goalWeight: 80 } })).status, 200);
  assert.equal(JSON.parse((await get(port, '/api/state')).body).profile.goalWeight, 80, 'database writes work (native SQLite module loads)');
  assert.ok(existsSync(join(tmp, 'data', 'iron-standard.db')), 'database lives in the data folder, not the install folder');
  console.log(`  ok   desktop app starts, serves the app and persists data (port ${port})`);
  // graceful close must also stop the bundled server
  spawnSync('taskkill', ['/pid', String(app.pid)], { windowsHide: true }); // WM_CLOSE like the window's X button
  for (let i = 0; i < 20 && app.exitCode === null; i++) await sleep(500);
  await sleep(1500);
  let still = true; try { await get(port, '/api/state'); } catch { still = false; }
  assert.equal(still, false, 'the server must stop when the app closes');
  console.log('  ok   closing the app stops the local server');
} catch (e) { failed = true; console.error('  FAIL ' + e.message); }
finally { try { if (app && app.exitCode === null) spawnSync('taskkill', ['/pid', String(app.pid), '/T', '/F'], { windowsHide: true }); } catch {} await sleep(500); try { rmSync(tmp, { recursive: true, force: true }); } catch {} }
console.log(failed ? '\ndesktop smoke test FAILED' : '\ndesktop smoke test passed');
process.exit(failed ? 1 : 0);
