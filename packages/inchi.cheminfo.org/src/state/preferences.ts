import { signal } from '@preact/signals-react';
import { Molecule } from 'openchemlib';

import { DEFAULT_INCHI } from '../components/inchiToStructureResult.ts';
import { INITIAL_SMILES } from '../components/structureToInchiResult.ts';
import { EXERCISES } from '../guide/data/exercises.ts';
import { TUTORIAL_STEPS } from '../guide/data/tutorial.ts';
import type { ExerciseState } from '../guide/exerciseState.ts';
import { defaultExerciseState } from '../guide/exerciseState.ts';
import { TEST_DATASETS } from '../roundtrip/datasets.ts';
import { readStored, readStoredJson, removeStored } from '../storage.ts';

import { persistBucket } from './persist.ts';

const PREFERENCES_KEY = 'inchi.cheminfo.org:preferences:v1';

migrateLegacyEntries();

/**
 * What the reader chose, and expects to find again on the next visit.
 * Stored as one `localStorage` entry mirroring this tree.
 */
export const preferences = persistBucket(PREFERENCES_KEY, {
  /** OCL idCode of the structure drawn in the Convert panel. */
  idCode: signal(defaultIdCode()),
  /** The InChI typed in the InChI → structure panel. */
  inchi: signal(DEFAULT_INCHI),
  guide: {
    /** The tutorial step on show. */
    step: signal(TUTORIAL_STEPS[0]?.id ?? ''),
    /** The exercise on show. */
    exerciseId: signal(EXERCISES[0]?.id ?? ''),
    /** Every answer, hint count and solved mark, by exercise id. */
    exercises: signal<Record<string, ExerciseState>>({}),
  },
  tests: {
    /** The IUPAC fixture the test panels run over. */
    datasetId: signal(TEST_DATASETS[0]?.id ?? ''),
  },
});

normalizeExercises();

/**
 * Replace the structure being drawn.
 * @param idCode - OCL idCode of the new drawing.
 */
export function setIdCode(idCode: string): void {
  preferences.idCode.value = idCode;
}

/**
 * Replace the InChI being decoded.
 * @param inchi - The InChI string the reader typed or pasted.
 */
export function setInchi(inchi: string): void {
  preferences.inchi.value = inchi;
}

/**
 * Move to a tutorial step.
 * @param id - The step to open.
 */
export function selectStep(id: string): void {
  preferences.guide.step.value = id;
}

/**
 * Open an exercise.
 * @param id - The exercise to open.
 */
export function selectExercise(id: string): void {
  preferences.guide.exerciseId.value = id;
}

/**
 * Fold a change into one exercise's stored state.
 * @param id - The exercise the change belongs to.
 * @param patch - The fields that changed.
 */
export function updateExercise(
  id: string,
  patch: Partial<ExerciseState>,
): void {
  const previous = preferences.guide.exercises.value;
  preferences.guide.exercises.value = {
    ...previous,
    [id]: { ...defaultExerciseState(), ...previous[id], ...patch },
  };
}

/** Forget every answer, hint and solved mark. */
export function clearExercises(): void {
  preferences.guide.exercises.value = {};
}

/**
 * Pick the IUPAC fixture the test panels run over.
 * @param id - The dataset id.
 */
export function selectDataset(id: string): void {
  preferences.tests.datasetId.value = id;
}

/**
 * The molecule the Convert panel opens on when nothing was stored.
 * @returns An OCL idCode, empty when even the example fails to parse.
 */
function defaultIdCode(): string {
  try {
    return Molecule.fromSmiles(INITIAL_SMILES).getIDCode();
  } catch {
    return '';
  }
}

/** Fill in any field an exercise saved before it existed. */
function normalizeExercises(): void {
  const stored = preferences.guide.exercises.value;
  const states: Record<string, ExerciseState> = {};
  for (const [id, state] of Object.entries(stored)) {
    states[id] = { ...defaultExerciseState(), ...state };
  }
  preferences.guide.exercises.value = states;
}

/**
 * Carry over the five per-value entries this bucket replaced, so a
 * returning reader keeps their drawing, their place in the guide and
 * every exercise they solved.
 */
function migrateLegacyEntries(): void {
  if (readStoredJson(PREFERENCES_KEY) !== null) return;
  const legacy = {
    idCode: readStored('inchi.cheminfo.org:structure-to-inchi:idcode:v1'),
    inchi: readStored('inchi.cheminfo.org:inchi-to-structure:input:v1'),
    guide: {
      step: readStored('inchi.cheminfo.org:guide:tutorial-step:v1'),
      exerciseId: readStored('inchi.cheminfo.org:guide:active-exercise:v1'),
      exercises: readStoredJson('inchi.cheminfo.org:guide:exercises:v1'),
    },
  };
  const kept = prune(legacy);
  if (Object.keys(kept).length > 0) {
    globalThis.localStorage?.setItem(PREFERENCES_KEY, JSON.stringify(kept));
  }
  for (const key of [
    'inchi.cheminfo.org:structure-to-inchi:idcode:v1',
    'inchi.cheminfo.org:inchi-to-structure:input:v1',
    'inchi.cheminfo.org:guide:tutorial-step:v1',
    'inchi.cheminfo.org:guide:active-exercise:v1',
    'inchi.cheminfo.org:guide:exercises:v1',
  ]) {
    removeStored(key);
  }
}

/**
 * Drop every entry a legacy read came back empty for.
 * @param node - A tree of legacy values, possibly nested.
 * @returns The same tree without its empty branches.
 */
function prune(node: Record<string, unknown>): Record<string, unknown> {
  const kept: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(node)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'object' && !Array.isArray(value)) {
      const nested = prune(value as Record<string, unknown>);
      if (Object.keys(nested).length > 0) kept[name] = nested;
    } else {
      kept[name] = value;
    }
  }
  return kept;
}
