import { data } from './data.ts';
import { preferences } from './preferences.ts';
import { view } from './view.ts';

/**
 * The whole application state, in one place, as signals.
 *
 * `view` is what is on screen, `data` is what the engine produced, and
 * `preferences` is what survives a reload on purpose — the last of the
 * three is the only one written to `localStorage`.
 *
 * Components call `useSignals()` first, then read a leaf with `.value`
 * and call the actions below; nothing is drilled through props.
 */
export const state = { view, data, preferences };

export { selectTab, selectTestsTab } from './view.ts';
export {
  clearExercises,
  selectDataset,
  selectExercise,
  selectStep,
  setIdCode,
  setInchi,
  updateExercise,
} from './preferences.ts';
