import { inchiFromMolfile } from 'inchi-js';
import { Molecule } from 'openchemlib';
import { expect, test } from 'vitest';

import { parseConnections, splitComponents } from '../connections.ts';
import { findSegment, splitInchi } from '../layers.ts';

test('replays a plain chain', () => {
  expect(parseConnections('1-2-3')).toStrictEqual([
    { from: 1, to: 2, kind: 'chain' },
    { from: 2, to: 3, kind: 'chain' },
  ]);
});

test('returns to the branch atom after a parenthesis', () => {
  expect(parseConnections('1-3-6-4(2)5')).toStrictEqual([
    { from: 1, to: 3, kind: 'chain' },
    { from: 3, to: 6, kind: 'chain' },
    { from: 6, to: 4, kind: 'chain' },
    { from: 4, to: 2, kind: 'chain' },
    { from: 4, to: 5, kind: 'branch' },
  ]);
});

test('reads a repeated number as a ring closure', () => {
  const steps = parseConnections('1-2-4-6-5-3-1');

  expect(steps).toHaveLength(6);
  expect(steps[5]).toStrictEqual({ from: 3, to: 1, kind: 'closure' });
});

test('handles three continuations at one atom', () => {
  expect(parseConnections('1-4(2)3')).toStrictEqual([
    { from: 1, to: 4, kind: 'chain' },
    { from: 4, to: 2, kind: 'chain' },
    { from: 4, to: 3, kind: 'branch' },
  ]);
  expect(parseConnections('1-5(2,3)4')).toStrictEqual([
    { from: 1, to: 5, kind: 'chain' },
    { from: 5, to: 2, kind: 'chain' },
    { from: 5, to: 3, kind: 'branch' },
    { from: 5, to: 4, kind: 'branch' },
  ]);
});

test('walks caffeine and finds both ring closures', () => {
  const steps = parseConnections('1-10-4-9-6-5(10)7(13)12(3)8(14)11(6)2');

  expect(steps).toHaveLength(15);
  expect(steps.filter((step) => step.kind === 'closure')).toStrictEqual([
    { from: 5, to: 10, kind: 'closure' },
    { from: 11, to: 6, kind: 'closure' },
  ]);
});

test('expands component multipliers', () => {
  expect(splitComponents('1-2(3)4;')).toStrictEqual(['1-2(3)4', '']);
  expect(splitComponents('2*1H2')).toStrictEqual(['1H2', '1H2']);
});

test.each([
  'CN1C=NC2=C1C(=O)N(C)C(=O)N2C',
  'c1ccc2ccccc2c1',
  'OCC1OC(O)C(O)C(O)C1O',
  'CC(C)(C)c1ccccc1',
])('the walk of %s covers every bond of the structure', async (smiles) => {
  const molecule = Molecule.fromSmiles(smiles);
  const { inchi } = await inchiFromMolfile(molecule.toMolfile());
  const layer = findSegment(splitInchi(inchi), 'c');
  const steps = parseConnections(layer?.value ?? '');

  expect(steps).toHaveLength(molecule.getAllBonds());
});
