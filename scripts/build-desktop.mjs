// Assembles the desktop app's server bundle in desktop/server:
//   Next.js standalone output + static assets + public files + a Node runtime that matches the native SQLite module.
// Then run electron-builder (see package.json: desktop:dir / desktop:build).
import { cpSync, rmSync, existsSync, mkdirSync, statSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const DIST = '.next-desktop';
const OUT = path.join(root, 'desktop', 'server');
const run = (cmd, args, env = {}) => execFileSync(cmd, args, { stdio: 'inherit', cwd: root, env: { ...process.env, ...env }, shell: process.platform === 'win32' });
const size = d => { let n = 0; for (const e of readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); n += e.isDirectory() ? size(p) : statSync(p).size; } return n; };

console.log('1/4 building the app (standalone)…');
// Next.js rewrites next-env.d.ts to point at the custom dist folder; put it back so the repo stays clean.
const envDts = path.join(root, 'next-env.d.ts');
const envDtsBefore = existsSync(envDts) ? readFileSync(envDts) : null;
rmSync(path.join(root, DIST), { recursive: true, force: true });
try { run('npx', ['next', 'build'], { NEXT_DIST_DIR: DIST, NEXT_TELEMETRY_DISABLED: '1' }); }
finally { if (envDtsBefore) writeFileSync(envDts, envDtsBefore); }

console.log('2/4 assembling desktop/server…');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(path.join(root, DIST, 'standalone'), OUT, { recursive: true });
cpSync(path.join(root, DIST, 'static'), path.join(OUT, DIST, 'static'), { recursive: true });
if (existsSync(path.join(root, 'public'))) cpSync(path.join(root, 'public'), path.join(OUT, 'public'), { recursive: true });

// Never ship personal data or build junk, even if tracing picked it up.
for (const junk of ['data', '.env', '.env.local', 'backups', 'reports', '.git']) rmSync(path.join(OUT, junk), { recursive: true, force: true });

console.log('3/4 bundling the Node runtime that this build used (its ABI matches the SQLite module)…');
const nodeName = process.platform === 'win32' ? 'node.exe' : 'node';
cpSync(process.execPath, path.join(OUT, nodeName));

console.log('4/4 checking the native SQLite module…');
const native = path.join(OUT, 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');
if (!existsSync(native)) {
  const src = path.join(root, 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');
  if (!existsSync(src)) throw new Error('better_sqlite3.node was not found. Run "npm ci" with the same Node version as this build.');
  mkdirSync(path.dirname(native), { recursive: true });
  cpSync(src, native);
  console.log('   copied better_sqlite3.node from node_modules');
}
console.log(`done: desktop/server = ${(size(OUT) / 1048576).toFixed(0)} MB, Node ${process.version}`);
