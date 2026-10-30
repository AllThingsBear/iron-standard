import type { Track } from './tracking';
export type Exercise = { id: string; name: string; sets: number; reps: string; description: string; caution?: string; category: string; equipment?: string[]; works?: string[]; benefit?: string; track?: Track; optional?: boolean };
export type Session = { id: string; title: string; subtitle: string; description: string; exercises: Exercise[] };
export type Program = { sessions: Record<string, Session>; week: { day: string; session: string }[] };

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const REST: Session = { id: 'rest', title: 'REST // RESET', subtitle: 'Rest day', description: 'Recover from training. Easy walking is optional. Focus on sleep, meals, and how your body feels.', exercises: [] };

// Neutral starter: three full-body days, easy walks between, one full rest day. Dumbbells + bodyweight.
export const starterProgram: Program = {
  sessions: {
    fullA: { id: 'fullA', title: 'FULL BODY // ALPHA', subtitle: 'Squat, push, pull, core', description: 'Controlled, full-body session. Leave a rep or two in reserve and prioritise clean form over load.', exercises: [
      { id: 'gobletsquat', name: 'Goblet squat', sets: 3, reps: '8–12', category: 'STRENGTH', equipment: ['dumbbells'], description: 'Hold one dumbbell at your chest, feet shoulder-width. Sit down between your hips, keep your whole foot planted and your chest tall, then stand. Use a comfortable depth.', caution: 'Reduce depth or load if you feel sharp pain in the knees or back.' },
      { id: 'pushup', name: 'Push-ups', sets: 3, reps: '6–15', category: 'BODYWEIGHT', equipment: ['bodyweight'], description: 'Hands just outside shoulder width, body in one line from head to heels. Lower your chest toward the floor, then press back up.', caution: 'Raise your hands on a stable surface if wrists, elbows or shoulders object.' },
      { id: 'oneArmRow', name: 'Supported one-arm row', sets: 3, reps: '8–12 / side', category: 'STRENGTH', equipment: ['dumbbells'], description: 'Brace one hand on a sturdy surface, keep your back flat, and draw the dumbbell toward your hip. Lower slowly without twisting.' },
      { id: 'bridge', name: 'Glute bridges', sets: 3, reps: '12–15', category: 'CORE', equipment: ['bodyweight'], description: 'On your back with knees bent, squeeze your glutes and lift your hips until shoulders, hips and knees line up. Avoid arching your lower back.' },
      { id: 'plank', name: 'Front plank', sets: 3, reps: '20–40 sec', category: 'CORE', equipment: ['bodyweight'], description: 'Forearms on the floor, body in a straight line. Brace your abs and glutes and breathe steadily.', caution: 'Stop the set when form breaks down.' }
    ] },
    fullB: { id: 'fullB', title: 'FULL BODY // BRAVO', subtitle: 'Lunge, press, pull, carry', description: 'Second weekly full-body session. Same rules: controlled reps, honest logging.', exercises: [
      { id: 'revlunge', name: 'Reverse lunges', sets: 3, reps: '8–10 / side', category: 'STRENGTH', equipment: ['bodyweight', 'dumbbells'], description: 'Step one foot back and lower until both knees are about 90°, then drive through your front foot to stand. Hold dumbbells at your sides if bodyweight is easy.', caution: 'Hold a support if balance is an issue.' },
      { id: 'floorpress', name: 'Dumbbell floor press', sets: 3, reps: '8–12', category: 'STRENGTH', equipment: ['dumbbells'], description: 'Lie on your back, knees bent. Lower the dumbbells until your upper arms touch the floor, then press up. Keep wrists stacked and ribs down.', caution: 'Start light. Stop if you feel sharp shoulder pain.' },
      { id: 'inclinepushup', name: 'Incline push-ups', sets: 2, reps: '10–15', category: 'BODYWEIGHT', equipment: ['bodyweight'], description: 'Hands on a sturdy raised surface, body in one line. Lower your chest to the edge and press away.' },
      { id: 'deadbug', name: 'Dead bugs', sets: 3, reps: '8 / side', category: 'CORE', equipment: ['bodyweight'], description: 'On your back with arms up and hips and knees at 90°. Slowly extend the opposite arm and leg without arching your back, then alternate.' },
      { id: 'carry', name: 'Farmer’s carries', sets: 3, reps: '20–30 sec', category: 'CARRY', equipment: ['dumbbells'], description: 'Walk with a dumbbell in each hand, shoulders relaxed and torso upright. Short, steady steps.', caution: 'Stop if you get tingling, numbness or grip weakness.' }
    ] },
    recovery: { id: 'recovery', title: 'RECOVERY // PATROL', subtitle: 'Walk + restore', description: 'Walk 20–35 minutes at a comfortable pace, as tolerated. Gentle mobility is optional.', exercises: [
      { id: 'walk', name: 'Comfortable walk', sets: 1, reps: '20–35 min', category: 'CARDIO', equipment: ['bodyweight'], description: 'Walk on an even surface at a pace where you can still talk. Shorten or split the walk if anything flares up.' }
    ] },
    rest: REST
  },
  week: [ 'fullA', 'recovery', 'fullB', 'recovery', 'fullA', 'recovery', 'rest' ].map((session, i) => ({ day: DAYS[i], session }))
};

// Empty program: seven rest days, ready for the user to build their own.
export const emptyProgram: Program = {
  sessions: { rest: { ...REST, title: 'OPEN DAY', subtitle: 'Nothing scheduled', description: 'No workout is scheduled for this day. Build your own program or choose a starter in your profile.' } },
  week: DAYS.map(day => ({ day, session: 'rest' }))
};
