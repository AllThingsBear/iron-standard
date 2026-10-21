// Shared (client + server) profile types and unit helpers. No server-only imports here.
export type Units = 'imperial' | 'metric';
export type Profile = {
  onboarded: boolean;
  units: Units;
  startWeight: number | null;
  goalWeight: number | null;
  kcal: number | null;
  protein: number | null;
  equipment: string[];
  limitations: string;
  preferences: string;
};
export const defaultProfile: Profile = {
  onboarded: false, units: 'imperial', startWeight: null, goalWeight: null,
  kcal: null, protein: null, equipment: ['bodyweight', 'dumbbells'], limitations: '', preferences: ''
};
export const EQUIPMENT: { id: string; label: string }[] = [
  { id: 'bodyweight', label: 'Bodyweight only' }, { id: 'dumbbells', label: 'Dumbbells (adjustable or fixed)' },
  { id: 'bands', label: 'Resistance bands' }, { id: 'kettlebell', label: 'Kettlebell' },
  { id: 'bench', label: 'Bench' }, { id: 'pullup', label: 'Pull-up bar' },
  { id: 'barbell', label: 'Barbell + rack' }, { id: 'machines', label: 'Gym machines' }
];
export const wUnit = (u: Units) => (u === 'metric' ? 'KG' : 'LB');
export const sUnit = (u: Units) => (u === 'metric' ? 'CM' : 'IN');
