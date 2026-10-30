// How each exercise is logged. Pure helpers (no Node imports) used by the UI, the report builder and the tests.
// weight_reps  dumbbell/barbell work: weight + reps
// reps         bodyweight work (push-ups, bridges, dead bugs...): reps only
// time         holds (planks): seconds only
// weight_time  loaded carries: weight + seconds
// minutes      walks, cardio, mobility: minutes only
// The value (reps / seconds / minutes) is stored in the existing "reps" column, so no database change is needed.
export type Track = 'weight_reps' | 'reps' | 'time' | 'weight_time' | 'minutes';
export const TRACKS: Track[] = ['weight_reps', 'reps', 'time', 'weight_time', 'minutes'];
export const TRACK_LABEL: Record<Track, string> = {
  weight_reps: 'Weight + reps',
  reps: 'Reps only (bodyweight)',
  time: 'Seconds only (holds)',
  weight_time: 'Weight + seconds (carries)',
  minutes: 'Minutes only (walks, cardio)'
};

type Like = { name: string; reps: string; equipment?: string[]; track?: string };
const BODYWEIGHT_NAMES = /push[- ]?up|dip\b|bridge|dead ?bug|bird ?dog|crunch|sit[- ]?up|pull[- ]?up|chin[- ]?up|air squat|bodyweight|lunge|glute|superman|mountain climber|burpee|jumping jack/i;
const LOADED_NAMES = /dumbbell|goblet|barbell|kettlebell|weighted|powerblock|band|cable|machine/i;
const CARDIO_NAMES = /walk|jog|run\b|cycl|bike|swim|row(ing)? machine|elliptical|mobility|stretch|yoga|foam roll/i;

export function trackOf(e: Like): Track {
  if (e.track && (TRACKS as string[]).includes(e.track)) return e.track as Track;
  const reps = e.reps || '', name = e.name || '';
  const loaded = (e.equipment ?? []).some(q => q !== 'bodyweight');
  if (/\bmin(ute)?s?\b/i.test(reps) || (CARDIO_NAMES.test(name) && !/\d\s*[x×]|\breps?\b|\/\s*side/i.test(reps))) return 'minutes';
  if (/\bsec(ond)?s?\b/i.test(reps)) return loaded || /carry|farmer/i.test(name) ? 'weight_time' : 'time';
  if (e.equipment && e.equipment.length) return loaded ? 'weight_reps' : 'reps';
  return BODYWEIGHT_NAMES.test(name) && !LOADED_NAMES.test(name) ? 'reps' : 'weight_reps';
}

export const hasWeight = (t: Track) => t === 'weight_reps' || t === 'weight_time';
export const valueKind = (t: Track): 'reps' | 'sec' | 'min' => (t === 'minutes' ? 'min' : t === 'time' || t === 'weight_time' ? 'sec' : 'reps');
export const VALUE_HEAD: Record<'reps' | 'sec' | 'min', string> = { reps: 'REPS', sec: 'SECONDS', min: 'MINUTES' };
export const VALUE_HINT: Record<'reps' | 'sec' | 'min', string> = { reps: 'reps', sec: 'sec', min: 'min' };

// One logged set as plain text for the trainer report.
export function formatSet(t: Track, s: { weight: number | null; reps: number | null }, wu: string): string {
  const val = s.reps == null ? '-' : String(s.reps);
  const w = s.weight == null ? '-' : String(s.weight);
  const stray = s.weight != null && !hasWeight(t) ? ` (weight field: ${s.weight} ${wu})` : '';
  if (t === 'reps') return `${val} reps${stray}`;
  if (t === 'time') return `${val} s hold${stray}`;
  if (t === 'minutes') return `${val} min${stray}`;
  if (t === 'weight_time') return `${w} ${wu} for ${val} s`;
  return `${w} ${wu} x ${val} reps`;
}
