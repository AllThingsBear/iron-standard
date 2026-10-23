// Generates original stick-figure exercise illustrations (public/figures/*.svg).
// Run: node scripts/gen-figures.mjs   (output is committed; no runtime dependency)
// Angles are absolute, in degrees, 0 = pointing down, 90 = pointing right (+x), 180 = up, 270 = left.
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'public/figures';
const W = 180, H = 215, GROUND = 192;
const C = { limb: '#cdb790', far: '#7f8576', hl: '#c7584a', ground: '#3d4337', prop: '#8b9470', propEdge: '#e2cfa8', box: '#2d322a', boxEdge: '#5a6150', text: '#7f8576' };
const BASE = { t: 180, ua: 0, fa: 6, th: 0, sh: 0, ft: 90, k: 1 };
const rad = a => (a * Math.PI) / 180;
const vec = (a, l) => [Math.sin(rad(a)) * l, Math.cos(rad(a)) * l];
const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
const f = n => n.toFixed(1);
const pts = a => a.map(q => `${f(q[0])},${f(q[1])}`).join(' ');

function rig(pose) {
  const p = { ...BASE, ...pose };
  const k = p.k;
  const L = { torso: 58 * k, neck: 10 * k, head: 10 * k, ua: 30 * k, fa: 28 * k, th: 40 * k, sh: 40 * k, foot: 9 * k };
  const hip = [0, 0];
  const sho = add(hip, vec(p.t, L.torso));
  const neck = add(sho, vec(p.t, L.neck));
  const headC = add(sho, vec(p.t, L.neck + L.head));
  const arm = (ua, fa, us = 1, fs = 1) => { const el = add(sho, vec(ua, L.ua * us)); return [sho, el, add(el, vec(fa, L.fa * fs))]; };
  const leg = (th, sh, ft) => { const kn = add(hip, vec(th, L.th)); const an = add(kn, vec(sh, L.sh)); return [hip, kn, an, add(an, vec(ft, L.foot))]; };
  const o = { hip, sho, neck, headC, headR: L.head, arm: arm(p.ua, p.fa, p.uas ?? 1, p.fas ?? 1), leg: leg(p.th, p.sh, p.ft) };
  if (p.ua2 != null) o.arm2 = arm(p.ua2, p.fa2 ?? p.ua2);
  if (p.th2 != null) o.leg2 = leg(p.th2, p.sh2 ?? p.th2, p.ft2 ?? p.ft);
  const [name, at] = p.anchor;
  const ref = { ankle: o.leg[2], hand: o.arm[2], hand2: (o.arm2 || o.arm)[2], hip, sho }[name];
  const d = [at[0] - ref[0], at[1] - ref[1]];
  const sh = v => (Array.isArray(v[0]) ? v.map(sh) : [v[0] + d[0], v[1] + d[1]]);
  for (const key of ['hip', 'sho', 'neck', 'headC', 'arm', 'arm2', 'leg', 'leg2']) if (o[key]) o[key] = sh(o[key]);
  return o;
}

const line = (a, w, color, op = 1) => `<polyline points="${pts(a)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}"/>`;
const dot = (c, r, fill, stroke) => `<circle cx="${f(c[0])}" cy="${f(c[1])}" r="${r}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="1.5"` : ''}/>`;
const mid = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function highlights(o, keys = []) {
  let s = '';
  for (const k of keys) {
    if (k === 'chest') s += line([mid(o.sho, o.hip, 0.05), mid(o.sho, o.hip, 0.4)], 17, C.hl, 0.55);
    if (k === 'shoulders') s += dot(o.sho, 11, C.hl).replace('/>', ' opacity="0.55"/>');
    if (k === 'glutes') s += dot(o.hip, 11, C.hl).replace('/>', ' opacity="0.55"/>');
    if (k === 'quads') { s += line([o.leg[0], o.leg[1]], 13, C.hl, 0.55); if (o.leg2) s += line([o.leg2[0], o.leg2[1]], 13, C.hl, 0.4); }
    if (k === 'calves') s += line([o.leg[1], o.leg[2]], 11, C.hl, 0.55);
    if (k === 'back') s += line([mid(o.sho, o.hip, 0.05), mid(o.sho, o.hip, 0.95)], 13, C.hl, 0.55);
    if (k === 'core') s += line([mid(o.sho, o.hip, 0.45), mid(o.sho, o.hip, 0.95)], 16, C.hl, 0.55);
    if (k === 'arms') s += line(o.arm, 10, C.hl, 0.55);
  }
  return s;
}

function frame(pose, spec, ground) {
  const o = rig(pose);
  let s = `<line x1="4" y1="${ground}" x2="${W - 4}" y2="${ground}" stroke="${C.ground}" stroke-width="2" stroke-dasharray="4 4"/>`;
  if (spec.boxAt === 'ankle') { const a = o.leg[2]; s += `<rect x="${f(a[0] - 22)}" y="${f(a[1] + 3)}" width="34" height="${f(ground - a[1] - 3)}" fill="${C.box}" stroke="${C.boxEdge}" stroke-width="1.5"/>`; }
  if (spec.boxAt === 'hand') { const h = o.arm[2]; s += `<rect x="${f(h[0] - 26)}" y="${f(h[1] + 3)}" width="40" height="${f(ground - h[1] - 3)}" fill="${C.box}" stroke="${C.boxEdge}" stroke-width="1.5"/>`; }
  if (spec.bench) s += `<rect x="${spec.bench[0]}" y="${spec.bench[1]}" width="${spec.bench[2]}" height="10" fill="${C.box}" stroke="${C.boxEdge}" stroke-width="1.5"/><rect x="${spec.bench[0] + 6}" y="${spec.bench[1] + 10}" width="5" height="${ground - spec.bench[1] - 10}" fill="${C.box}"/><rect x="${spec.bench[0] + spec.bench[2] - 11}" y="${spec.bench[1] + 10}" width="5" height="${ground - spec.bench[1] - 10}" fill="${C.box}"/>`;
  if (spec.pullbar) s += `<line x1="30" y1="${spec.pullbar}" x2="150" y2="${spec.pullbar}" stroke="${C.boxEdge}" stroke-width="5" stroke-linecap="round"/>`;
  s += highlights(o, spec.hl);
  if (o.arm2) s += line(o.arm2, 4, C.far);
  if (o.leg2) s += line(o.leg2, 4, C.far);
  s += line([o.hip, o.sho], 5, C.limb);
  s += line([o.sho, o.neck], 4, C.limb);
  s += `<circle cx="${f(o.headC[0])}" cy="${f(o.headC[1])}" r="${f(o.headR)}" fill="none" stroke="${C.limb}" stroke-width="4"/>`;
  s += line(o.leg, 4.5, C.limb);
  s += line(o.arm, 4.5, C.limb);
  if (spec.props === 'db') { s += dot(o.arm[2], 6, C.prop, C.propEdge); if (o.arm2) s += dot(o.arm2[2], 5, C.prop, C.propEdge); }
  if (spec.props === 'kb') s += `<circle cx="${f(o.arm[2][0])}" cy="${f(o.arm[2][1] + 7)}" r="8" fill="${C.prop}" stroke="${C.propEdge}" stroke-width="1.5"/>`;
  if (spec.props === 'bar') s += dot(o.sho, 9, C.prop, C.propEdge) + `<circle cx="${f(o.sho[0])}" cy="${f(o.sho[1])}" r="3" fill="${C.propEdge}"/>`;
  return s;
}

// Front-view figure (used for lateral raise): arms swing out to the sides.
function frontFrame(armDeg, spec) {
  const sh1 = [78, 56], sh2 = [102, 56], hip = [90, 112];
  const a = (s, dir) => [s, [s[0] + dir * Math.sin(rad(armDeg)) * 58, s[1] + Math.cos(rad(armDeg)) * 58]];
  const l = a(sh1, -1), r = a(sh2, 1);
  let s = `<line x1="4" y1="${GROUND}" x2="${W - 4}" y2="${GROUND}" stroke="${C.ground}" stroke-width="2" stroke-dasharray="4 4"/>`;
  for (const arm of [l, r]) s += line(arm, 10, C.hl, 0.35);
  s += dot(sh1, 11, C.hl).replace('/>', ' opacity="0.55"/>') + dot(sh2, 11, C.hl).replace('/>', ' opacity="0.55"/>');
  s += line([[90, 48], hip], 5, C.limb) + line([sh1, sh2], 5, C.limb);
  s += `<circle cx="90" cy="34" r="10" fill="none" stroke="${C.limb}" stroke-width="4"/>`;
  s += line([hip, [80, GROUND - 6]], 4.5, C.limb) + line([hip, [100, GROUND - 6]], 4.5, C.limb);
  for (const arm of [l, r]) { s += line(arm, 4.5, C.limb); s += dot(arm[1], 6, C.prop, C.propEdge); }
  return s;
}

const stand = (x = 90) => ['ankle', [x, GROUND - 2]];
const lying = ['sho', [42, 182]];
const GL = 186; // ground for lying poses

const lunge = { th: 80, sh: 0, th2: -35, sh2: -110, anchor: stand(112) };
const squatB = { t: 150, th: 88, sh: -25, anchor: stand() };

const EX = [
  { id: 'gobletsquat', hl: ['quads', 'glutes'], props: 'db', A: { ua: 15, fa: 155, anchor: stand() }, B: { ...squatB, ua: 15, fa: 155 } },
  { id: 'bodyweightsquat', hl: ['quads', 'glutes'], A: { ua: 90, fa: 90, anchor: stand() }, B: { ...squatB, ua: 90, fa: 90 } },
  { id: 'revlunge', hl: ['quads', 'glutes'], A: { th2: 0, sh2: 0, anchor: stand(112) }, B: lunge },
  { id: 'splitsquat', hl: ['quads', 'glutes'], A: { th: 40, sh: 0, th2: -30, sh2: -30, anchor: stand(112) }, B: lunge },
  { id: 'rdl', hl: ['glutes', 'back'], props: 'db', A: { ua: 0, fa: 0, anchor: stand() }, B: { t: 120, th: 8, sh: -4, ua: 0, fa: 0, anchor: stand() } },
  { id: 'barbellsquat', hl: ['quads', 'glutes'], props: 'bar', A: { ua: -20, fa: 170, anchor: stand() }, B: { ...squatB, ua: -20, fa: 170 } },
  { id: 'overheadpress', hl: ['shoulders', 'arms'], props: 'db', A: { ua: 25, fa: 170, anchor: stand() }, B: { ua: 175, fa: 180, anchor: stand() } },
  { id: 'curl', hl: ['arms'], props: 'db', A: { ua: 0, fa: 0, anchor: stand() }, B: { ua: 0, fa: 160, anchor: stand() } },
  { id: 'tricepext', hl: ['arms'], props: 'db', A: { ua: 180, fa: -20, anchor: stand() }, B: { ua: 180, fa: 180, anchor: stand() } },
  { id: 'row', hl: ['back', 'arms'], props: 'db', A: { t: 125, th: 20, sh: -10, ua: 0, fa: 0, anchor: stand() }, B: { t: 125, th: 20, sh: -10, ua: -135, fa: 20, anchor: stand() } },
  { id: 'kbswing', hl: ['glutes', 'back'], props: 'kb', A: { t: 120, th: 15, sh: -10, ua: 20, fa: 20, anchor: stand() }, B: { ua: 90, fa: 90, anchor: stand() } },
  { id: 'carry', hl: ['arms', 'core'], props: 'db', A: { th: 20, sh: 12, th2: -15, sh2: -25, ua: 0, fa: 0, anchor: ['hip', [90, 112]] }, B: { th: -15, sh: -25, th2: 20, sh2: 12, ua: 0, fa: 0, anchor: ['hip', [90, 112]] } },
  { id: 'walk', hl: ['quads', 'calves'], A: { th: 25, sh: 15, th2: -20, sh2: -35, ua: -25, fa: -10, ua2: 25, fa2: 35, anchor: ['hip', [90, 112]] }, B: { th: -20, sh: -35, th2: 25, sh2: 15, ua: 25, fa: 35, ua2: -25, fa2: -10, anchor: ['hip', [90, 112]] } },
  { id: 'pullup', hl: ['back', 'arms'], pullbar: 38, A: { k: 0.85, t: 180, ua: 180, fa: 180, th: 0, sh: 0, anchor: ['hand', [90, 40]] }, B: { k: 0.85, t: 180, ua: 20, fa: 180, th: 0, sh: 0, anchor: ['hand', [90, 40]] } },
  { id: 'floorpress', crop: [120, 95], hl: ['chest', 'arms'], props: 'db', ground: GL, A: { t: 270, th: 130, sh: -50, ua: 180, fa: 180, anchor: lying, k: 0.9 }, B: { t: 270, th: 130, sh: -50, ua: 90, uas: 0.45, fa: 180, anchor: lying, k: 0.9 } },
  { id: 'benchpress', crop: [105, 110], hl: ['chest', 'arms'], props: 'db', ground: GL, bench: [24, 152, 118], A: { t: 270, th: 120, sh: 0, ua: 180, fa: 180, anchor: ['sho', [42, 148]], k: 0.9 }, B: { t: 270, th: 120, sh: 0, ua: 120, fa: 180, anchor: ['sho', [42, 148]], k: 0.9 } },
  { id: 'bridge', crop: [125, 90], hl: ['glutes'], ground: GL, A: { t: 270, th: 130, sh: -50, ua: 90, fa: 90, anchor: lying, k: 0.9 }, B: { t: 290, th: 130, sh: -25, ua: 90, fa: 90, anchor: lying, k: 0.9 } },
  { id: 'deadbug', crop: [120, 95], hl: ['core'], ground: GL, A: { t: 270, th: 180, sh: 90, th2: 180, sh2: 90, ua: 180, fa: 180, ua2: 180, fa2: 180, anchor: lying, k: 0.9 }, B: { t: 270, th: 180, sh: 90, th2: 90, sh2: 90, ua: 270, fa: 270, ua2: 180, fa2: 180, anchor: lying, k: 0.9 } },
  { id: 'pushup', crop: [115, 100], hl: ['chest', 'arms'], ground: GROUND, A: { k: 0.8, t: 115, th: 295, sh: 295, ft: 10, ua: 0, fa: 0, anchor: ['hand', [158, GROUND - 2]] }, B: { k: 0.8, t: 97.5, th: 277.5, sh: 277.5, ft: 10, ua: 110, fa: 0, anchor: ['hand', [158, GROUND - 2]] } },
  { id: 'inclinepushup', crop: [70, 145], hl: ['chest', 'arms'], boxAt: 'hand', A: { k: 0.8, t: 150, th: 330, sh: 330, ft: 45, ua: 0, fa: 0, anchor: ['hand', [160, 140]] }, B: { k: 0.8, t: 125.7, th: 305.7, sh: 305.7, ft: 45, ua: 110, fa: 0, anchor: ['hand', [160, 140]] } },
  { id: 'declinepushup', crop: [85, 130], hl: ['chest', 'shoulders'], boxAt: 'ankle', A: { k: 0.8, t: 83, th: 263, sh: 263, ft: 100, ua: 0, fa: 0, anchor: ['hand', [160, GROUND - 2]] }, B: { k: 0.8, t: 78, th: 258, sh: 258, ft: 100, ua: 110, fa: 0, anchor: ['hand', [160, GROUND - 2]] } },
  { id: 'plank', crop: [115, 100], hl: ['core'], single: true, A: { k: 0.8, t: 102.6, th: 282.6, sh: 282.6, ft: 10, ua: 0, fa: 90, anchor: ['hand', [160, GROUND - 4]] } },
  { id: 'birddog', crop: [105, 110], hl: ['core', 'back', 'glutes'], A: { k: 0.9, t: 108, th: 0, sh: 270, ft: 270, ua: 0, fa: 0, ua2: 0, fa2: 0, th2: 0, sh2: 270, ft2: 270, anchor: ['hand2', [150, GROUND - 4]] }, B: { k: 0.9, t: 108, th: 0, sh: 270, ft: 270, ua: 90, fa: 90, ua2: 0, fa2: 0, th2: -80, sh2: -80, ft2: -80, anchor: ['hand2', [150, GROUND - 4]] } },
  { id: 'lateralraise', front: true, hl: ['shoulders'] }
];

const svg = (inner, label, single, crop = [0, H]) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${crop[0]} ${single ? W : W * 2} ${crop[1]}" role="img" aria-label="${label}">\n<title>${label}</title>\n${inner}\n</svg>\n`;
const tag = (x, t) => `<text x="${x}" y="${H - 6}" text-anchor="middle" font-family="Consolas,'Courier New',monospace" font-size="10" letter-spacing="2" fill="${C.text}">${t}</text>`;
const arrow = `<path d="M171 ${H / 2 - 4} l8 -6 v12 z" fill="${C.text}" transform="translate(${W - 175},0)"/>`;

mkdirSync(OUT, { recursive: true });
for (const e of EX) {
  let body;
  if (e.front) body = `<g>${frontFrame(15, e)}${tag(W / 2, 'START')}</g><g transform="translate(${W},0)">${frontFrame(90, e)}${tag(W / 2, 'FINISH')}</g>${arrow}`;
  else if (e.single) body = `<g>${frame({ ...e.A }, e, e.ground ?? GROUND)}${tag(W / 2, 'HOLD')}</g>`;
  else body = `<g>${frame({ ...e.A }, e, e.ground ?? GROUND)}${tag(W / 2, 'START')}</g><g transform="translate(${W},0)">${frame({ ...e.B }, e, e.ground ?? GROUND)}${tag(W / 2, 'FINISH')}</g>${arrow}`;
  writeFileSync(`${OUT}/${e.id}.svg`, svg(body, `${e.id} start and finish positions`, e.single, e.crop));
}
console.log(`wrote ${EX.length} figures to ${OUT}`);
