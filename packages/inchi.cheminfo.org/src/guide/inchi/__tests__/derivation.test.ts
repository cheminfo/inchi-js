import { inchiFromMolfile } from 'inchi-js';
import { Molecule } from 'openchemlib';
import { expect, test } from 'vitest';

import { buildDerivation } from '../derivation.ts';

/**
 * The hand procedure the guide teaches must land on the same canonical
 * numbering the C library uses — otherwise every worked example is wrong.
 * These structures cover plain skeletons, heteroatoms, symmetry that
 * forces tie breaking, and carboxylic acids whose mobile hydrogens change
 * the numbering.
 */
const STRUCTURES = [
  'CCO',
  'CC(=O)OCC',
  'CN1C=NC2=C1C(=O)N(C)C(=O)N2C',
  'c1ccccc1',
  'C1CCCCC1',
  'C1CC1',
  'CC(C)C',
  'CCCCCCCC',
  'ClC(Br)(F)I',
  'c1ccncc1',
  'c1ccc2ccccc2c1',
  'c1ccc(cc1)c1ccccc1',
  'c1ccc2[nH]ccc2c1',
  'Oc1ccccc1',
  'N#Cc1ccccc1',
  'FC(F)(F)c1ccccc1',
  'CC(C)(C)c1ccccc1',
  'CCN(CC)CC',
  'OO',
  'O=S(=O)(O)O',
  'OCC1OC(O)C(O)C(O)C1O',
  'NCC(=O)O',
  'CC(=O)O',
  'CC(N)C(=O)O',
  'CSCCC(N)C(=O)O',
  'NC(N)=O',
  'CC(=O)Nc1ccc(O)cc1',
  'O=C(O)c1ccccc1O',
  'O=C(O)c1ccc(N)cc1',
  'OC(=O)c1ccccc1C(=O)O',
  'OC(=O)C(O)C(O)C(=O)O',
  'OC(=O)CC(O)(CC(=O)O)C(=O)O',
  'CC1=CC(=O)C=CC1=O',
  'O=C(N)c1ccncc1',
];

test.each(STRUCTURES)(
  'derives the canonical numbering of %s by hand',
  async (smiles) => {
    const molecule = Molecule.fromSmiles(smiles);
    const result = await inchiFromMolfile(molecule.toMolfile());

    expect(result.inchi).not.toBe('');

    const derivation = buildDerivation(molecule, result.inchi, result.auxinfo);

    expect(derivation.componentCount).toBe(1);
    expect(derivation.ranking.complete).toBe(true);
    expect(derivation.handNumbers).toStrictEqual(derivation.engineNumbers);
    expect(derivation.matchesEngine).toBe(true);
  },
);

test('reads the mobile-H groups of tartaric acid back to input atoms', async () => {
  const molecule = Molecule.fromSmiles('OC(=O)C(O)C(O)C(=O)O');
  const result = await inchiFromMolfile(molecule.toMolfile());
  const derivation = buildDerivation(molecule, result.inchi, result.auxinfo);

  expect(derivation.mobileGroups).toStrictEqual([
    [1, 3],
    [9, 10],
  ]);
  expect(derivation.ranking.stages.map((stage) => stage.id)).toStrictEqual([
    'skeleton',
    'hydrogens',
    'mobileH',
    'tieBreaking',
  ]);
});

test('reports a multi-component structure instead of claiming a match', async () => {
  const molecule = Molecule.fromSmiles('[Na+].[Cl-]');
  const result = await inchiFromMolfile(molecule.toMolfile());
  const derivation = buildDerivation(molecule, result.inchi, result.auxinfo);

  expect(derivation.componentCount).toBe(2);
  expect(derivation.matchesEngine).toBe(false);
});
