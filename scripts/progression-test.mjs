// Unit tests for the weight-suggestion rules. Run: npm run test:unit  (needs Node 22.6+ for --experimental-strip-types)
import { recommend } from '../lib/progression.ts';
import { infoFor } from '../lib/exerciseInfo.ts';
import { library } from '../lib/library.ts';
import { starterProgram } from '../lib/program.ts';
import { recommendModel, foldPull, CATALOG } from '../lib/localAi.ts';
import { trackOf, formatSet, hasWeight, valueKind } from '../lib/tracking.ts';
import assert from 'node:assert/strict';
const ex = (reps = '8–12', sets = 3) => ({ id: 'x', name: 'X', sets, reps, category: 'STRENGTH', description: '' });
const S = (day, rows) => rows.map(([weight, reps, pain, notes], i) => ({ day, exercise_id: 'x', set_no: i + 1, weight, reps, pain, notes: notes ?? null }));
const R = (e, hist, tr, units = 'imperial', date = '2026-10-26') => recommend(e, hist, tr, units, date);
const t = (name, fn) => { try { fn(); console.log('  ok  ', name); } catch (e) { console.log('  FAIL', name, '-', e.message); process.exitCode = 1; } };

t('no history -> start, no weight', () => { const r = R(ex(), []); assert.equal(r.kind, 'start'); assert.equal(r.weight, null); });
t('all sets at top of range, pain 0 -> +5 lb', () => { const r = R(ex(), S('2026-10-22', [[50, 12, 0], [50, 12, 0], [50, 12, 0]])); assert.equal(r.kind, 'progress'); assert.equal(r.weight, 55); });
t('metric increments by 2.5 kg', () => { const r = R(ex(), S('2026-10-22', [[20, 12, 0], [20, 12, 0], [20, 12, 0]]), undefined, 'metric'); assert.equal(r.weight, 22.5); });
t('pain NOT recorded -> never progress (hold)', () => { const r = R(ex(), S('2026-10-22', [[50, 12, null], [50, 12, null], [50, 12, null]])); assert.equal(r.kind, 'hold'); assert.equal(r.weight, 50); });
t('pain 2 -> hold', () => { const r = R(ex(), S('2026-10-22', [[50, 12, 2], [50, 12, 0], [50, 12, 0]])); assert.equal(r.kind, 'hold'); });
t('pain 4 -> regress ~20%', () => { const r = R(ex(), S('2026-10-22', [[50, 12, 4], [50, 10, 4], [50, 8, 5]])); assert.equal(r.kind, 'regress'); assert.equal(r.weight, 40); });
t('notes mention pain with pain=0 -> hold', () => { const r = R(ex(), S('2026-10-22', [[50, 12, 0, 'sharp pain in the right shoulder'], [50, 12, 0], [50, 12, 0]])); assert.equal(r.kind, 'hold'); });
t('"no pain" note does not block progression', () => { const r = R(ex(), S('2026-10-22', [[50, 12, 0, 'no pain, felt great'], [50, 12, 0], [50, 12, 0, 'without any tingling']])); assert.equal(r.kind, 'progress'); });
t('below top of range -> repeat same weight', () => { const r = R(ex(), S('2026-10-22', [[50, 12, 0], [50, 10, 0], [50, 9, 0]])); assert.equal(r.kind, 'repeat'); assert.equal(r.weight, 50); });
t('timed exercise -> build duration, same weight', () => { const r = R(ex('20–30 sec'), S('2026-10-22', [[30, 30, 0], [30, 30, 0], [30, 30, 0]])); assert.equal(r.kind, 'time'); assert.equal(r.weight, 30); });
t('bodyweight -> no weight suggested', () => { const r = R(ex('8–15', 2), S('2026-10-22', [[null, 15, 0], [null, 15, 0]])); assert.equal(r.kind, 'bodyweight'); assert.equal(r.weight, null); });
t('mis-entered row (weight but no reps) is ignored', () => { const r = R(ex(), S('2026-10-22', [[12, null, 0], [12, null, 0]])); assert.equal(r.kind, 'start'); });
t('stale (>3 weeks) -> ease back in ~90%', () => { const r = R(ex(), S('2026-09-01', [[50, 12, 0], [50, 12, 0], [50, 12, 0]])); assert.equal(r.kind, 'repeat'); assert.equal(r.weight, 45); });
t('only uses sessions BEFORE the viewed date', () => { const h = [...S('2026-10-19', [[30, 10, 0], [30, 10, 0], [30, 10, 0]]), ...S('2026-10-30', [[99, 12, 0]])]; assert.equal(R(ex(), h).weight, 30); });
const tr = { exercise_id: 'x', weight: 35, reps: '3 × 8–12', note: 'trainer says', author: 'Coach', created_at: '2026-10-23 03:00:00' };
t('current trainer pick wins over auto', () => { const r = R(ex(), S('2026-10-19', [[50, 12, 0], [50, 12, 0], [50, 12, 0]]), tr); assert.equal(r.kind, 'trainer'); assert.equal(r.weight, 35); });
t('trainer pick expires once a newer session is logged', () => { const r = R(ex(), S('2026-10-25', [[35, 12, 0], [35, 12, 0], [35, 12, 0]]), tr, 'imperial', '2026-10-26'); assert.equal(r.kind, 'progress'); assert.equal(r.weight, 40); });
t('bird dog explains its core benefit', () => { const i = infoFor({ name: 'Bird dogs' }); assert.ok(i.works.includes('Deep core')); assert.match(i.benefit, /trunk/); });
t('specific names win (bottom-half push-up, squeeze press)', () => { assert.match(infoFor({ name: 'Bottom-half push-ups' }).benefit, /bottom/); assert.match(infoFor({ name: 'Dumbbell squeeze floor press' }).benefit, /together/); });
t('own works/benefit override the automatic text', () => { const i = infoFor({ name: 'Bird dogs', works: ['Glutes'], benefit: 'Mine.' }); assert.deepEqual(i.works, ['Glutes']); assert.equal(i.benefit, 'Mine.'); });
t('unknown custom exercise has no auto info', () => assert.equal(infoFor({ name: 'Zottman thing' }), null));
t('every library and starter exercise has info', () => { const all = [...library, ...Object.values(starterProgram.sessions).flatMap(s => s.exercises)]; const missing = all.filter(e => !infoFor(e)).map(e => e.name); assert.deepEqual(missing, []); });
const HW = (o = {}) => ({ gpu: null, adapters: [], ramGb: 32, freeDiskGb: 200, platform: 'win32', appleSilicon: false, ...o });
t('16 GB NVIDIA card -> gemma4:12b (tested)', () => { const r = recommendModel(HW({ gpu: { name: 'RTX 5080', vramGb: 15.9 } })); assert.equal(r.tag, 'gemma4:12b'); assert.equal(r.tested, true); });
t('8-12 GB card -> e4b, flagged as untested', () => { const r = recommendModel(HW({ gpu: { name: 'RTX 3070', vramGb: 8 } })); assert.equal(r.tag, 'gemma4:e4b'); assert.equal(r.tested, false); });
t('4-8 GB card -> e2b', () => assert.equal(recommendModel(HW({ gpu: { name: 'GTX 1650', vramGb: 4 } })).tag, 'gemma4:e2b'));
t('tiny GPU or no GPU -> no automatic recommendation, steers to CLI/API', () => { assert.equal(recommendModel(HW({ gpu: { name: 'old', vramGb: 2 } })).tag, null); const r = recommendModel(HW()); assert.equal(r.tag, null); assert.match(r.note, /Claude CLI or an API key/); });
t('unknown AMD/Intel VRAM -> no guess', () => { const r = recommendModel(HW({ adapters: ['AMD Radeon RX 7800'] })); assert.equal(r.tag, null); assert.match(r.note, /could not read/); });
t('Apple Silicon uses unified memory (untested)', () => { assert.equal(recommendModel(HW({ appleSilicon: true, ramGb: 32 })).tag, 'gemma4:12b'); assert.equal(recommendModel(HW({ appleSilicon: true, ramGb: 16 })).tag, 'gemma4:e4b'); });
t('low disk space produces a warning', () => assert.match(recommendModel(HW({ gpu: { name: 'x', vramGb: 16 }, freeDiskGb: 6 })).diskWarning, /free/));
t('catalog is limited to the gemma4 tags we verified', () => assert.deepEqual(CATALOG.map(m => m.tag), ['gemma4:12b', 'gemma4:e4b', 'gemma4:e2b']));
t('pull progress folds layers into one percentage', () => {
  const s = { layers: {} };
  assert.equal(foldPull(s, { status: 'pulling manifest' }).pct, 0);
  foldPull(s, { digest: 'a', total: 1000, completed: 0 });
  foldPull(s, { digest: 'b', total: 3000, completed: 0 });
  const p = foldPull(s, { digest: 'b', total: 3000, completed: 1500 });
  assert.equal(p.pct, 38); // (0 + 1500) / 4000
  assert.equal(foldPull(s, { status: 'success' }).done, true);
  assert.equal(foldPull(s, { error: 'disk full' }).error, 'disk full');
});

// ---- which fields each exercise logs ----
const X = (name, reps, equipment) => ({ name, reps, equipment });
const DB = ['dumbbells'], BW = ['bodyweight'];
const cases = [
  [X('PowerBlock floor press', '8–12', DB), 'weight_reps'], [X('Dumbbell squeeze floor press', '10–12', DB), 'weight_reps'],
  [X('Lateral raises', '12–15', DB), 'weight_reps'], [X('Dumbbell squats', '10–12', DB), 'weight_reps'],
  [X('Supported one-arm row', '10 / side', DB), 'weight_reps'], [X('Hammer curls', '10–12', DB), 'weight_reps'],
  [X('Standard push-ups', '8–15', BW), 'reps'], [X('Feet-elevated push-ups', '8–12', BW), 'reps'], [X('Bottom-half push-ups', '8–12', BW), 'reps'],
  [X('Glute bridges', '12–15', BW), 'reps'], [X('Dead bugs', '8 / side', BW), 'reps'], [X('Bird dogs', '8 / side', BW), 'reps'],
  [X('Front plank', '20–40 sec', BW), 'time'],
  [X('Farmer’s carries', '20–30 sec', DB), 'weight_time'],
  [X('Comfortable walk', '20–35 min', BW), 'minutes'], [X('Gentle mobility flow', '10 min', BW), 'minutes'],
  [X('Push-ups', '10'), 'reps'], [X('Goblet squat', '10'), 'weight_reps'], [X('Easy jog', '20 min'), 'minutes'], [X('Weighted push-ups', '8'), 'weight_reps'],
  [{ ...X('Glute bridges', '12', BW), track: 'weight_reps' }, 'weight_reps'],
  [{ ...X('Standard push-ups', '10', BW), track: 'bogus' }, 'reps']
];
for (const [ex, want] of cases) t(`logs "${ex.name}" as ${want}`, () => assert.equal(trackOf(ex), want));
t('every library and starter exercise gets a sensible track', () => {
  const all = [...library, ...Object.values(starterProgram.sessions).flatMap(s => s.exercises)];
  for (const e of all) {
    const tk = trackOf(e);
    if (/walk|mobility/i.test(e.name)) assert.equal(tk, 'minutes', e.name);
    if (/plank/i.test(e.name) && /sec/.test(e.reps)) assert.equal(tk, 'time', e.name);
    if (/carry/i.test(e.name)) assert.equal(tk, 'weight_time', e.name);
    if (/push-?up|bridge|dead bug|bird dog/i.test(e.name) && !/dumbbell|weighted/i.test(e.name)) assert.equal(tk, 'reps', e.name);
    if (/curl|press|row|squat|raise|swing|extension/i.test(e.name) && (e.equipment || []).some(q => q !== 'bodyweight')) assert.equal(tk, 'weight_reps', e.name);
  }
});
t('weight only applies to weighted tracks, value units are right', () => {
  assert.equal(hasWeight('reps'), false); assert.equal(hasWeight('minutes'), false); assert.equal(hasWeight('weight_time'), true);
  assert.equal(valueKind('minutes'), 'min'); assert.equal(valueKind('time'), 'sec'); assert.equal(valueKind('weight_time'), 'sec'); assert.equal(valueKind('reps'), 'reps');
});
t('trainer report formats each kind of set in its own units', () => {
  assert.equal(formatSet('minutes', { weight: null, reps: 35 }, 'lb'), '35 min');
  assert.equal(formatSet('reps', { weight: null, reps: 12 }, 'lb'), '12 reps');
  assert.equal(formatSet('time', { weight: null, reps: 40 }, 'lb'), '40 s hold');
  assert.equal(formatSet('weight_time', { weight: 30, reps: 45 }, 'lb'), '30 lb for 45 s');
  assert.equal(formatSet('weight_reps', { weight: 35, reps: 10 }, 'lb'), '35 lb x 10 reps');
  assert.match(formatSet('reps', { weight: 12, reps: null }, 'lb'), /weight field: 12 lb/, 'a stray weight on a bodyweight move is flagged, not hidden');
});
console.log(process.exitCode ? 'FAILURES' : 'all passed');
