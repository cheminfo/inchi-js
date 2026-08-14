import { inchiFromMolfile } from 'inchi-js';
import { Molecule } from 'openchemlib';
import { expect, test } from 'vitest';

import { EXERCISES } from '../data/exercises.ts';
import { GLOSSARY } from '../data/glossary.ts';
import { REFERENCE_SECTIONS } from '../data/reference.ts';
import { TUTORIAL_STEPS } from '../data/tutorial.ts';
import { LEVELS } from '../data/types.ts';
import { findSegment, splitInchi } from '../inchi/layers.ts';
import { checkFullInchi, checkLayer, checkText } from '../inchi/validate.ts';

const MARKER = /\[\[(?<term>[^\]]+)\]\]/g;
const LEVEL_IDS = new Set(LEVELS.map((level) => level.id));

test('the tutorial covers every layer in seventeen steps', () => {
  expect(TUTORIAL_STEPS).toHaveLength(17);

  const problems: string[] = [];
  const ids = new Set<string>();
  for (const step of TUTORIAL_STEPS) {
    if (ids.has(step.id)) problems.push(`${step.id}: duplicate id`);
    ids.add(step.id);
    if (!LEVEL_IDS.has(step.level)) problems.push(`${step.id}: unknown level`);
    if (step.procedure.length < 3) problems.push(`${step.id}: thin procedure`);
    if (step.smiles.length === 0) problems.push(`${step.id}: no structure`);
  }

  expect(problems).toStrictEqual([]);
});

test('every exercise declares the fields its kind needs', () => {
  expect(EXERCISES).toHaveLength(17);

  const problems: string[] = [];
  const ids = new Set<string>();
  for (const exercise of EXERCISES) {
    if (ids.has(exercise.id)) problems.push(`${exercise.id}: duplicate id`);
    ids.add(exercise.id);
    if (exercise.hints.length < 2 || exercise.hints.length > 4) {
      problems.push(`${exercise.id}: ${exercise.hints.length} hints`);
    }
    if (exercise.kind === 'read') {
      if (!exercise.inchi?.startsWith('InChI=')) {
        problems.push(`${exercise.id}: no InChI to read`);
      }
      if (!exercise.expected) problems.push(`${exercise.id}: no answer`);
    } else if (!exercise.smiles) {
      problems.push(`${exercise.id}: no structure`);
    }
    if (exercise.kind === 'layer' && exercise.letter === undefined) {
      problems.push(`${exercise.id}: no layer under test`);
    }
  }

  expect(problems).toStrictEqual([]);
});

test.each(TUTORIAL_STEPS.map((step) => [step.id, step] as const))(
  'the structure of step %s gives an InChI',
  async (_id, step) => {
    const molecule = Molecule.fromSmiles(step.smiles);
    const result = await inchiFromMolfile(
      molecule.toMolfile(),
      step.inchiOptions ? { options: step.inchiOptions } : undefined,
    );

    expect(result.inchi.startsWith('InChI=')).toBe(true);
  },
);

test.each(
  TUTORIAL_STEPS.filter((step) => step.focus).map(
    (step) => [step.id, step] as const,
  ),
)(
  'step %s focuses on a layer its structure actually has',
  async (_id, step) => {
    const molecule = Molecule.fromSmiles(step.smiles);
    const result = await inchiFromMolfile(
      molecule.toMolfile(),
      step.inchiOptions ? { options: step.inchiOptions } : undefined,
    );
    const focus = step.focus as NonNullable<typeof step.focus>;
    const segment = findSegment(
      splitInchi(result.inchi),
      focus.letter,
      focus.block,
    );

    expect(segment?.letter).toBe(focus.letter);
  },
);

test.each(
  EXERCISES.filter((exercise) => exercise.kind === 'layer').map(
    (exercise) => [exercise.id, exercise] as const,
  ),
)(
  'layer exercise %s targets a layer the engine writes',
  async (_id, exercise) => {
    const molecule = Molecule.fromSmiles(exercise.smiles as string);
    const { inchi } = await inchiFromMolfile(molecule.toMolfile());
    const letter = exercise.letter as string;
    // An empty answer must fail, proving the layer is present and non-empty.
    const blank = checkLayer('', inchi, letter, exercise.block);

    expect(blank.passed).toBe(false);
    expect(
      checkLayer(blank.expected, inchi, letter, exercise.block).passed,
    ).toBe(true);
  },
);

test.each(
  EXERCISES.filter((exercise) => exercise.kind === 'full').map(
    (exercise) => [exercise.id, exercise] as const,
  ),
)('full-InChI exercise %s has a checkable answer', async (_id, exercise) => {
  const molecule = Molecule.fromSmiles(exercise.smiles as string);
  const { inchi } = await inchiFromMolfile(molecule.toMolfile());

  expect(checkFullInchi(inchi, inchi).passed).toBe(true);
  expect(checkFullInchi(inchi.replace('InChI=1S/', ''), inchi).passed).toBe(
    true,
  );
});

test.each(
  EXERCISES.filter((exercise) => exercise.kind === 'read').map(
    (exercise) => [exercise.id, exercise] as const,
  ),
)('reading exercise %s accepts its own expected answer', (_id, exercise) => {
  const expected = exercise.expected as string;

  expect(checkText(expected, expected).passed).toBe(true);
  expect(checkText(`${expected}x`, expected).passed).toBe(false);
  expect(splitInchi(exercise.inchi as string).segments.length).toBeGreaterThan(
    1,
  );
});

test('every glossary marker used in the guide resolves to an entry', () => {
  const missing = new Set<string>();
  for (const text of authoredText()) {
    MARKER.lastIndex = 0;
    let match = MARKER.exec(text);
    while (match !== null) {
      const term = (match.groups?.term ?? '').split('|', 1)[0] ?? '';
      if (!GLOSSARY[term.toLowerCase()]) missing.add(term);
      match = MARKER.exec(text);
    }
  }

  expect([...missing]).toStrictEqual([]);
});

test('every glossary entry is keyed in lowercase and carries an example', () => {
  const problems: string[] = [];
  for (const [key, entry] of Object.entries(GLOSSARY)) {
    if (key !== key.toLowerCase()) problems.push(`${key}: not lowercase`);
    if (entry.summary.length < 40) problems.push(`${key}: summary too short`);
    if (entry.examples.length === 0) problems.push(`${key}: no example`);
  }

  expect(problems).toStrictEqual([]);
});

test('cheatsheet rows are unique and rich rows are complete', () => {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const section of REFERENCE_SECTIONS) {
    for (const row of section.rows) {
      if (seen.has(row.syntax)) problems.push(`${row.syntax}: duplicate`);
      seen.add(row.syntax);
      const rich = Boolean(row.detail ?? row.example);
      if (rich && (!row.name || !row.detail || !row.example?.note)) {
        problems.push(`${row.syntax}: incomplete tooltip`);
      }
    }
  }

  expect(problems).toStrictEqual([]);
  expect(seen.size).toBeGreaterThan(25);
});

function authoredText(): string[] {
  const texts: string[] = [];
  for (const step of TUTORIAL_STEPS) {
    texts.push(step.description, ...step.procedure);
    if (step.caveat) texts.push(step.caveat);
  }
  for (const exercise of EXERCISES) {
    texts.push(exercise.description, ...exercise.hints);
  }
  return texts;
}
