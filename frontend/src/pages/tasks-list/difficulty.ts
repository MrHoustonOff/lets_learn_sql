// Difficulty system: 9 levels = 3 tiers x 3 steps
// 1-3 = Easy (success/green), 4-6 = Medium (warning/orange), 7-9 = Hard (destructive/red)

export interface DifficultyTier {
  key: 'easy' | 'medium' | 'hard';
  labelKey: string;
  color: string;    // Tailwind bg class
  textColor: string;
  range: [number, number]; // [min, max] difficulty integer
}

export const DIFFICULTY_TIERS: DifficultyTier[] = [
  { key: 'easy',   labelKey: 'difficulty.easy',   color: 'bg-success',      textColor: 'text-success',      range: [1, 3] },
  { key: 'medium', labelKey: 'difficulty.medium', color: 'bg-warning',      textColor: 'text-warning',      range: [4, 6] },
  { key: 'hard',   labelKey: 'difficulty.hard',   color: 'bg-destructive',  textColor: 'text-destructive',  range: [7, 9] },
];

export function getTier(difficulty: number): DifficultyTier {
  if (difficulty <= 3) return DIFFICULTY_TIERS[0];
  if (difficulty <= 6) return DIFFICULTY_TIERS[1];
  return DIFFICULTY_TIERS[2];
}

// Returns step within tier (1, 2, or 3)
export function getStep(difficulty: number): number {
  return ((difficulty - 1) % 3) + 1;
}

// Get all 9 difficulty level IDs as integers 1-9
export const ALL_DIFFICULTY_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
