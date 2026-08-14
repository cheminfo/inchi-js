import { inchiFromMolfile, inchikeyFromInchi } from 'inchi-js';
import { Molecule } from 'openchemlib';
import { expect, test } from 'vitest';

import { deriveInchikey, splitForHashing } from '../inchikey.ts';

const CAFFEINE =
  'InChI=1S/C8H10N4O2/c1-10-4-9-6-5(10)7(13)12(3)8(14)11(6)2/h4H,1-3H3';

test('reproduces the published InChIKey of caffeine', async () => {
  const derivation = await deriveInchikey(CAFFEINE);

  expect(derivation.inchikey).toBe('RYYVLZVUVIJVGH-UHFFFAOYSA-N');
  expect(derivation.firstBlock).toBe('RYYVLZVUVIJVGH');
  expect(derivation.secondBlock).toBe('UHFFFAOY');
  expect(derivation.protonFlag).toBe('N');
});

test('hashes the skeleton and leaves the rest to the second block', () => {
  expect(
    splitForHashing(
      'InChI=1S/C4H6O6/c5-1(3(7)8)2(6)4(9)10/h1-2,5-6H,(H,7,8)(H,9,10)/t1-,2-/m1/s1',
      8,
    ),
  ).toStrictEqual({
    major: 'C4H6O6/c5-1(3(7)8)2(6)4(9)10/h1-2,5-6H,(H,7,8)(H,9,10)',
    minor: '/t1-,2-/m1/s1',
    protons: 0,
  });
});

test('keeps the /p segment out of both hashes and reads the proton count', () => {
  expect(
    splitForHashing('InChI=1S/C2H5NO2/c3-1-2(4)5/h1,3H2,(H,4,5)/p-1', 8),
  ).toStrictEqual({
    major: 'C2H5NO2/c3-1-2(4)5/h1,3H2,(H,4,5)',
    minor: '',
    protons: -1,
  });
});

test('the proton flag is the only thing that changes between protonation states', async () => {
  const anion = await deriveInchikey(
    'InChI=1S/C2H5NO2/c3-1-2(4)5/h1,3H2,(H,4,5)/p-1',
  );
  const cation = await deriveInchikey(
    'InChI=1S/C2H5NO2/c3-1-2(4)5/h1,3H2,(H,4,5)/p+1',
  );

  expect(anion.inchikey).toBe('DHMQDGOQFOQNFH-UHFFFAOYSA-M');
  expect(cation.inchikey).toBe('DHMQDGOQFOQNFH-UHFFFAOYSA-O');
});

const STRUCTURES = [
  'CCO',
  'CC(=O)OCC',
  'c1ccccc1',
  'OC(=O)C(O)C(O)C(=O)O',
  'N[C@@H](C)C(=O)O',
  'C/C=C/C',
  'OCC1OC(O)C(O)C(O)C1O',
  'CC(=O)Nc1ccc(O)cc1',
  '[13CH4]',
  'CN1C=NC2=C1C(=O)N(C)C(=O)N2C',
];

test.each(STRUCTURES)(
  'derives the same InChIKey as the library for %s',
  async (smiles) => {
    const molecule = Molecule.fromSmiles(smiles);
    const { inchi } = await inchiFromMolfile(molecule.toMolfile());
    const fromLibrary = await inchikeyFromInchi(inchi);
    const derived = await deriveInchikey(inchi);

    expect(derived.inchikey).toBe(fromLibrary.inchikey);
  },
);
