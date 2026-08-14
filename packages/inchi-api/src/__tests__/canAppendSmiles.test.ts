import { expect, test } from 'vitest';

import { canAppendSmiles } from '../convert/canAppendSmiles.ts';
import type { StructureColumnDetection } from '../convert/types.ts';

const FROM_SDF: StructureColumnDetection = {
  column: 'molfile',
  kind: 'molfile',
  confidence: 1,
  reason: 'sdf',
};

test('a molfile file with no SMILES column can take one', () => {
  expect(canAppendSmiles(['molfile', 'ID', 'Name'], FROM_SDF)).toBe(true);
});

test('a file whose structures are SMILES cannot', () => {
  expect(
    canAppendSmiles(['id', 'smiles'], {
      column: 'smiles',
      kind: 'smiles',
      confidence: 1,
      reason: 'name',
    }),
  ).toBe(false);
});

test('an existing SMILES column blocks it, whatever its case', () => {
  expect(canAppendSmiles(['molfile', 'Smiles'], FROM_SDF)).toBe(false);
  expect(canAppendSmiles(['molfile', 'SMILES'], FROM_SDF)).toBe(false);
});
