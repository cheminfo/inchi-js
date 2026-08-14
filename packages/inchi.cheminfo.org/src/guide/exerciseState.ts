export type ExerciseStatus = 'idle' | 'attempted' | 'solved';

export interface ExerciseState {
  answer: string;
  status: ExerciseStatus;
  hintsRevealed: number;
  showSolution: boolean;
}

/**
 * The state a freshly opened exercise starts in.
 * @returns A blank exercise state.
 */
export function defaultExerciseState(): ExerciseState {
  return { answer: '', status: 'idle', hintsRevealed: 0, showSolution: false };
}
