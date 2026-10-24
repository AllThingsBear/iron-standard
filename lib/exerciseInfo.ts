// "What it works" and "why it helps" for common exercises, matched by name (so custom and renamed exercises still pick it up).
// An exercise's own `works` / `benefit` fields (editable in the program editor) take precedence.
// General fitness information only; not medical advice.
export type Info = { works: string[]; benefit: string };

const RULES: [RegExp, Info][] = [
  [/bottom[- ]?half|partial/i, { works: ['Chest', 'Front shoulders', 'Triceps'], benefit: 'Trains the hardest part of the push-up, the bottom, building strength and control in the stretched position. Keep it slow and stop if it irritates your shoulders.' }],
  [/feet[- ]?elevated|decline/i, { works: ['Upper chest', 'Front shoulders', 'Triceps', 'Core'], benefit: 'Raising your feet shifts more load onto the upper chest and shoulders than a flat push-up and makes your core hold a rigid plank.' }],
  [/incline/i, { works: ['Chest', 'Triceps', 'Front shoulders', 'Core'], benefit: 'An easier push-up that lets you groove good form and build pressing strength before moving to the floor.' }],
  [/push[- ]?up/i, { works: ['Chest', 'Triceps', 'Front shoulders', 'Core'], benefit: 'Builds upper-body pressing strength and trunk stiffness using only your bodyweight.' }],
  [/squeeze/i, { works: ['Inner chest', 'Triceps', 'Front shoulders'], benefit: 'Pressing with the dumbbells squeezed together keeps constant tension on the chest and is gentler on the shoulders than a wide press.' }],
  [/floor press/i, { works: ['Chest', 'Triceps', 'Front shoulders'], benefit: 'The floor stops your elbows at a safe depth, limiting shoulder stress while you build chest and triceps strength.' }],
  [/bench press|chest press|machine press/i, { works: ['Chest', 'Front shoulders', 'Triceps'], benefit: 'The classic horizontal press for chest size and pushing strength.' }],
  [/overhead|shoulder press|military/i, { works: ['Shoulders', 'Triceps', 'Upper back', 'Core'], benefit: 'Builds shoulder strength and overhead stability; standing also makes your core work to keep you steady.' }],
  [/lateral/i, { works: ['Side shoulders', 'Upper traps'], benefit: 'Builds shoulder width and the small stabilising muscles around the joint using light weights.' }],
  [/romanian|rdl|deadlift/i, { works: ['Hamstrings', 'Glutes', 'Lower back', 'Grip'], benefit: 'Teaches the hip hinge and strengthens the back of your legs and hips, the muscles that help you lift things safely.' }],
  [/goblet/i, { works: ['Quads', 'Glutes', 'Core', 'Upper back'], benefit: 'Holding the weight in front helps you stay upright, making it a beginner-friendly squat that builds leg strength and good posture.' }],
  [/barbell.*squat|back squat/i, { works: ['Quads', 'Glutes', 'Core', 'Back'], benefit: 'A heavy, whole-body leg exercise for building strength; use safeties or a spotter and add load gradually.' }],
  [/split squat|lunge|step[- ]?up/i, { works: ['Quads', 'Glutes', 'Hamstrings', 'Balance'], benefit: 'Trains one leg at a time, building strength and balance and showing up side-to-side differences.' }],
  [/squat/i, { works: ['Quads', 'Glutes', 'Core'], benefit: 'Builds the leg and hip strength you use to stand up, climb stairs and lift from the floor.' }],
  [/leg press/i, { works: ['Quads', 'Glutes', 'Hamstrings'], benefit: 'Builds leg strength with your back supported.' }],
  [/bridge|hip thrust/i, { works: ['Glutes', 'Hamstrings', 'Core'], benefit: 'Strengthens the hips and glutes with almost no load on the spine, helping your hips (not your back) do the work.' }],
  [/dead ?bug/i, { works: ['Deep core', 'Abs', 'Hip flexors'], benefit: 'Trains your abs to keep the lower back steady while your arms and legs move, a core skill that carries over to lifting and walking.' }],
  [/bird ?dog/i, { works: ['Deep core', 'Lower back muscles', 'Glutes', 'Shoulder stabilisers'], benefit: 'Trains the trunk to stay still while your limbs move, building spine-stabilising endurance and balance with very little load on the back.' }],
  [/side plank/i, { works: ['Obliques', 'Glute medius', 'Shoulders'], benefit: 'Strengthens the sides of your trunk and hips, which keep you stable when you walk and lift.' }],
  [/plank/i, { works: ['Core', 'Shoulders', 'Glutes'], benefit: 'Builds the endurance of the muscles that hold your torso steady.' }],
  [/farmer|carry/i, { works: ['Grip', 'Forearms', 'Core', 'Upper back'], benefit: 'Trains posture, grip and full-body bracing under load; short, steady walks build strength with little joint stress.' }],
  [/swing/i, { works: ['Glutes', 'Hamstrings', 'Back', 'Core'], benefit: 'Builds hip power and conditioning; learn the hip hinge with a light weight first.' }],
  [/pull[- ]?up|chin[- ]?up/i, { works: ['Lats', 'Upper back', 'Biceps', 'Grip'], benefit: 'The classic bodyweight pull; builds back and arm strength.' }],
  [/pulldown/i, { works: ['Lats', 'Mid-back', 'Biceps'], benefit: 'Builds pulling strength and is a good stepping stone to pull-ups.' }],
  [/row/i, { works: ['Lats', 'Mid-back', 'Rear shoulders', 'Biceps'], benefit: 'Balances all the pressing by strengthening your upper back, which supports posture and shoulder health.' }],
  [/curl/i, { works: ['Biceps', 'Forearms'], benefit: 'Builds arm strength for pulling and carrying.' }],
  [/tricep/i, { works: ['Triceps'], benefit: 'Strengthens the back of the arm, which helps you press and lock out.' }],
  [/walk/i, { works: ['Heart and lungs', 'Legs'], benefit: 'Low-impact cardio that helps recovery, burns calories and supports heart health without pounding your joints.' }],
  [/mobility|stretch|yoga/i, { works: ['Hips', 'Spine', 'Shoulders'], benefit: 'Gentle movement to loosen stiff joints and ease you into or out of training.' }]
];

export function infoFor(e: { name: string; works?: string[]; benefit?: string }): Info | null {
  const works = (e.works ?? []).filter(Boolean);
  const own = e.benefit?.trim() || '';
  if (works.length || own) {
    const auto = RULES.find(([re]) => re.test(e.name))?.[1];
    return { works: works.length ? works : auto?.works ?? [], benefit: own || auto?.benefit || '' };
  }
  return RULES.find(([re]) => re.test(e.name))?.[1] ?? null;
}
