import { expect, test } from 'vitest';

import { appendLabel } from '../appendLabel.ts';
import type { AppendedSelection } from '../useFileConvert.ts';

const BASE: AppendedSelection = {
  smiles: false,
  inchi: true,
  inchikey: true,
  auxinfo: false,
};

test('both columns', () => {
  expect(appendLabel(BASE)).toBe('InChI and InChIKey');
});

test('one column', () => {
  expect(appendLabel({ ...BASE, inchikey: false })).toBe('InChI');
  expect(appendLabel({ ...BASE, inchi: false })).toBe('InChIKey');
});

test('the SMILES comes first', () => {
  expect(appendLabel({ ...BASE, smiles: true })).toBe(
    'SMILES, InChI and InChIKey',
  );
});

test('every column', () => {
  expect(appendLabel({ ...BASE, smiles: true, auxinfo: true })).toBe(
    'SMILES, InChI, InChIKey and InChI_AuxInfo',
  );
});

test('nothing selected', () => {
  expect(appendLabel({ ...BASE, inchi: false, inchikey: false })).toBe('');
});
