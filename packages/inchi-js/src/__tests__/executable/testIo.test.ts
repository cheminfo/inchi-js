import { join } from 'node:path';

import { expect, test } from 'vitest';

import { inchiFromMolfile } from '../../inchiFromMolfile.ts';
import { findSdfRecordById } from '../helpers/findInSdf.ts';
import { extractMolfile } from '../helpers/sdfUtils.ts';

/*
 * Ported from IUPAC `INCHI-1-TEST/tests/test_executable/test_io.py`.
 *
 * Black-box I/O tests that exercise V3000 input parsing and the
 * `-LargeMolecules` switch.
 */

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..', '..', '..');
const SDF_PATH = join(
  REPO_ROOT,
  'vendor/inchi/INCHI-1-TEST/tests/test_executable/data/test_io.sdf.gz',
);

function loadRecord(id: string): string {
  const record = findSdfRecordById(SDF_PATH, id);
  if (record === undefined) {
    throw new Error(`test_io fixture id "${id}" not found in SDF`);
  }
  return extractMolfile(record);
}

test('V3000 SCSR extension is rejected with "Unknown element(s)"', async () => {
  const result = await inchiFromMolfile(loadRecord('001'));

  expect(result.inchi).toBe('');
  expect(result.log).toContain('Unknown element(s): Thr');
});

test('V3000 with >999 atoms is rejected without -LargeMolecules', async () => {
  const result = await inchiFromMolfile(loadRecord('002'));

  expect(result.inchi).toBe('');
  expect(result.log).toContain('Too many atoms');
});

test('V3000 with >999 atoms is accepted with -LargeMolecules', async () => {
  const result = await inchiFromMolfile(loadRecord('002'), {
    options: '-LargeMolecules',
  });

  // With `-LargeMolecules` the engine emits a non-standard InChI
  // (prefix `InChI=1/`, no `S`). Just verify the "too many atoms"
  // error is gone and an InChI was produced.
  expect(result.log).not.toContain('Too many atoms');
  expect(result.inchi).toMatch(/^InChI=1/);
});

test('V3000 with 999 atoms is accepted without -LargeMolecules', async () => {
  const result = await inchiFromMolfile(loadRecord('004'));

  expect(result.log).not.toContain('Too many atoms');
  expect(result.inchi.startsWith('InChI=1S/')).toBe(true);
});
