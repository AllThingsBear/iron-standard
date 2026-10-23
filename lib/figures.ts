// Maps an exercise name to one of the original stick-figure illustrations in /public/figures.
// Matching is by name so it also works for custom exercises. Returns null when nothing fits.
const RULES: [RegExp, string][] = [
  [/feet[- ]?elevated|decline/i, 'declinepushup'],
  [/incline/i, 'inclinepushup'],
  [/push[- ]?up/i, 'pushup'],
  [/bench press/i, 'benchpress'],
  [/floor press|squeeze/i, 'floorpress'],
  [/overhead|shoulder press|military/i, 'overheadpress'],
  [/lateral/i, 'lateralraise'],
  [/romanian|rdl|deadlift/i, 'rdl'],
  [/goblet|dumbbell squat/i, 'gobletsquat'],
  [/barbell.*squat|back squat/i, 'barbellsquat'],
  [/split squat/i, 'splitsquat'],
  [/lunge/i, 'revlunge'],
  [/squat/i, 'bodyweightsquat'],
  [/bridge|hip thrust/i, 'bridge'],
  [/dead ?bug/i, 'deadbug'],
  [/bird ?dog/i, 'birddog'],
  [/plank/i, 'plank'],
  [/farmer|carry/i, 'carry'],
  [/walk/i, 'walk'],
  [/swing/i, 'kbswing'],
  [/pull[- ]?up|chin[- ]?up/i, 'pullup'],
  [/curl/i, 'curl'],
  [/tricep/i, 'tricepext'],
  [/row/i, 'row']
];
export const figureFor = (name: string): string | null => {
  for (const [re, id] of RULES) if (re.test(name)) return `/figures/${id}.svg`;
  return null;
};
