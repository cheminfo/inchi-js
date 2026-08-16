import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { inchiFromMolfile } from '../inchiFromMolfile.ts';

function loadMolfile(name: string): string {
  return readFileSync(join(import.meta.dirname, 'data', `${name}.mol`), 'utf8');
}

test('water', async () => {
  const result = await inchiFromMolfile(loadMolfile('water'));

  expect(result.returnCode).toBe(0);
  expect(result.inchi).toBe('InChI=1S/H2O/h1H2');
});

test('methane', async () => {
  const result = await inchiFromMolfile(loadMolfile('methane'));

  expect(result.returnCode).toBe(0);
  expect(result.inchi).toBe('InChI=1S/CH4/h1H4');
});

test('ethanol', async () => {
  const result = await inchiFromMolfile(loadMolfile('ethanol'));

  expect(result.returnCode).toBe(0);
  expect(result.inchi).toBe('InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3');
  expect(result.auxinfo).toMatch(/^AuxInfo=1\/0\/N:/);
});

test('benzene', async () => {
  const result = await inchiFromMolfile(loadMolfile('benzene'));

  expect(result.returnCode).toBe(0);
  expect(result.inchi).toBe('InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H');
});

test('-AuxNone option suppresses AuxInfo', async () => {
  const result = await inchiFromMolfile(loadMolfile('ethanol'), {
    options: '-AuxNone',
  });

  expect(result.returnCode).toBe(0);
  expect(result.inchi).toBe('InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3');
  expect(result.auxinfo).toBe('');
});

test('garbage molfile yields an empty InChI', async () => {
  const result = await inchiFromMolfile('this is not a molfile');

  expect(result.inchi).toBe('');
});
