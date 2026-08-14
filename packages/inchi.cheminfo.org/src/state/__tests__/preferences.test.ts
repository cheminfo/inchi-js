import { beforeEach, expect, test } from 'vitest';

import { EXERCISES } from '../../guide/data/exercises.ts';
import { TUTORIAL_STEPS } from '../../guide/data/tutorial.ts';
import { TEST_DATASETS } from '../../roundtrip/datasets.ts';
import {
  clearExercises,
  preferences,
  selectDataset,
  selectExercise,
  selectStep,
  setIdCode,
  setInchi,
  updateExercise,
} from '../preferences.ts';

beforeEach(() => {
  clearExercises();
  selectStep(TUTORIAL_STEPS[0]?.id ?? '');
  selectExercise(EXERCISES[0]?.id ?? '');
});

test('the guide opens on the first step and the first exercise', () => {
  expect(preferences.guide.step.value).toBe('anatomy');
  expect(preferences.guide.exerciseId.value).toBe('formula-paracetamol');
  expect(preferences.tests.datasetId.value).toBe(TEST_DATASETS[0]?.id);
});

test('updateExercise fills in every field the patch omits', () => {
  updateExercise('formula-paracetamol', { answer: 'C9H18O2' });

  expect(preferences.guide.exercises.value).toStrictEqual({
    'formula-paracetamol': {
      answer: 'C9H18O2',
      status: 'idle',
      hintsRevealed: 0,
      showSolution: false,
    },
  });
});

test('updateExercise merges into the exercise it names, leaving the others', () => {
  updateExercise('formula-paracetamol', { answer: 'C9H18O2' });
  updateExercise('formula-paracetamol', { status: 'solved', hintsRevealed: 2 });
  updateExercise('c-propanol', { answer: '1S' });

  expect(
    preferences.guide.exercises.value['formula-paracetamol'],
  ).toStrictEqual({
    answer: 'C9H18O2',
    status: 'solved',
    hintsRevealed: 2,
    showSolution: false,
  });
  expect(preferences.guide.exercises.value['c-propanol']?.answer).toBe('1S');
});

test('clearExercises forgets every answer', () => {
  updateExercise('formula-paracetamol', { status: 'solved' });
  clearExercises();

  expect(preferences.guide.exercises.value).toStrictEqual({});
});

test('the selection actions write their own signal only', () => {
  selectStep('connections');
  selectExercise('c-propanol');
  selectDataset('mcule');
  setIdCode('gCi@DDfZ@@');
  setInchi('InChI=1S/CH4/h1H4');

  expect(preferences.guide.step.value).toBe('connections');
  expect(preferences.guide.exerciseId.value).toBe('c-propanol');
  expect(preferences.tests.datasetId.value).toBe('mcule');
  expect(preferences.idCode.value).toBe('gCi@DDfZ@@');
  expect(preferences.inchi.value).toBe('InChI=1S/CH4/h1H4');
});
