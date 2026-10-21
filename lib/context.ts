import {Profile,wUnit} from './units';
import {Program} from './program';

export function buildBrief(p:Profile,program:Program):string{
  const w=wUnit(p.units).toLowerCase();
  const goal=p.startWeight!=null&&p.goalWeight!=null
    ?`Weight goal: ${p.startWeight} -> ${p.goalWeight} ${w} (${p.goalWeight<p.startWeight?'lose':p.goalWeight>p.startWeight?'gain':'maintain'} ${Math.abs(p.goalWeight-p.startWeight)} ${w}).`
    :'Weight goal: not set.';
  const targets=`Nutrition targets (self-set estimates, not medical advice): ${p.kcal!=null?p.kcal+' kcal/day':'calories not set'}, ${p.protein!=null?p.protein+' g protein/day':'protein not set'}.`;
  const equipment=p.equipment.length?p.equipment.join(', '):'not specified';
  const structure=program.week.map(d=>{const s=program.sessions[d.session];return s?`${d.day} ${s.title} (${s.subtitle})`:`${d.day} rest`}).join(' / ');
  return `# TRAINER EVALUATION REQUEST - IRON STANDARD

You are acting as my strength & conditioning coach / personal trainer. Evaluate the workout below using ALL the context in this file (why my program exists, my constraints, my history in this app), then tell me:
1. Verdict on today's session (execution, loading, volume, pain signals).
2. Specific changes for the next session of each exercise (weight/reps/sets/substitution) - progress only when pain-free and reps are hit.
3. Anything to flag for a clinician/PT (see pain & neuro rules).
4. Trend read on weight, waist, calories, protein, walking.
5. Any program-level change you recommend (and why), without casually increasing joint/spine/nerve load.

## MY GOALS AND SETUP
- ${goal}
- ${targets}
- Equipment available: ${equipment}.
- Weekly structure: ${structure}.
- Checkboxes mean an exercise was completed; the per-set data below is what I actually did.
- Preferences / notes: ${p.preferences||'(none provided)'}

## MY LIMITATIONS AND SAFETY RULES (treat as hard rules)
- Limitations I reported: ${p.limitations||'(none provided)'}
- Stop and regress for sharp or radiating pain, numbness, tingling, or weakness.
- Do NOT casually increase volume. Pain 4+/10, any neuro symptoms, or a rising pain trend => recommend regress/substitute/rest and clinician review rather than progression.
- You are not a clinician and this is not medical advice; say when something needs a professional.

## HOW TO READ THE DATA
- Weights are in ${w}. Pain is my per-set 0-10 score (blank = not recorded; 0 = none). Notes are free text about pain/form.
- Rest time is not tracked.
`;
}
