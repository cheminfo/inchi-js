import * as OCL from 'openchemlib';
import { expect, test } from 'vitest';

import { inchiFromMolfile } from '../inchiFromMolfile.ts';
import {
  oclMoleculeFromInchi,
  oclMoleculeFromStructure,
} from '../oclMoleculeFromInchi.ts';
import { structureFromInchi } from '../structureFromInchi.ts';

async function moleculeFromInchi(inchi: string): Promise<OCL.Molecule> {
  const result = await oclMoleculeFromInchi(inchi, OCL);

  expect(result.returnCode).toBe(0);

  if (!result.molecule) throw new Error(`no molecule built from ${inchi}`);
  return result.molecule;
}

/**
 * The InChI of a molecule written back to a Molfile. A `/p` layer
 * ("Proton(s) added/removed") and an undefined stereocentre ("Omitted
 * undefined stereo") both come back as warnings with a correct InChI,
 * so only an error is rejected here.
 * @param molecule - The molecule to re-encode.
 * @returns The InChI computed from its Molfile.
 */
async function inchiOfMolecule(molecule: OCL.Molecule): Promise<string> {
  const result = await inchiFromMolfile(molecule.toMolfile());

  expect(result.returnCode).not.toBe(-1);

  return result.inchi;
}

function bondOrders(molecule: OCL.Molecule): number[] {
  const orders: number[] = [];
  for (let bond = 0; bond < molecule.getAllBonds(); bond++) {
    orders.push(molecule.getBondOrder(bond));
  }
  return orders;
}

test('water keeps only the heavy atom', async () => {
  const molecule = await moleculeFromInchi('InChI=1S/H2O/h1H2');

  expect(molecule.getAllAtoms()).toBe(1);
  expect(molecule.getAllBonds()).toBe(0);
  expect(molecule.toIsomericSmiles()).toBe('O');
  await expect(inchiOfMolecule(molecule)).resolves.toBe('InChI=1S/H2O/h1H2');
});

test('ethanol', async () => {
  const molecule = await moleculeFromInchi('InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3');

  expect(molecule.getAllAtoms()).toBe(3);
  expect(molecule.getIDCode()).toBe('eMHAIh@');
  expect(molecule.toIsomericSmiles()).toBe('CCO');
  await expect(inchiOfMolecule(molecule)).resolves.toBe(
    'InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3',
  );
});

test('benzene comes back as a Kekulé ring', async () => {
  const molecule = await moleculeFromInchi(
    'InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H',
  );

  expect(molecule.getAllAtoms()).toBe(6);
  expect(bondOrders(molecule).toSorted((a, b) => a - b)).toStrictEqual([
    1, 1, 1, 2, 2, 2,
  ]);
  expect(molecule.toIsomericSmiles()).toBe('c1ccccc1');
  await expect(inchiOfMolecule(molecule)).resolves.toBe(
    'InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H',
  );
});

test('acetylene keeps its triple bond', async () => {
  const molecule = await moleculeFromInchi('InChI=1S/C2H2/c1-2/h1-2H');

  expect(molecule.getAllBonds()).toBe(1);
  expect(molecule.getBondOrder(0)).toBe(3);
  expect(molecule.toIsomericSmiles()).toBe('C#C');
  await expect(inchiOfMolecule(molecule)).resolves.toBe(
    'InChI=1S/C2H2/c1-2/h1-2H',
  );
});

test('caffeine keeps both rings', async () => {
  const caffeine =
    'InChI=1S/C8H10N4O2/c1-10-4-9-6-5(10)7(13)12(3)8(14)11(6)2/h4H,1-3H3';
  const molecule = await moleculeFromInchi(caffeine);

  expect(molecule.getAllAtoms()).toBe(14);
  expect(molecule.getAllBonds()).toBe(15);
  expect(molecule.getRingSet().getSize()).toBe(2);
  await expect(inchiOfMolecule(molecule)).resolves.toBe(caffeine);
});

test('an anion keeps its charge', async () => {
  const acetate = 'InChI=1S/C2H4O2/c1-2(3)4/h1H3,(H,3,4)/p-1';
  const molecule = await moleculeFromInchi(acetate);

  expect(molecule.getAllAtoms()).toBe(4);
  expect(molecule.toIsomericSmiles()).toBe('CC([O-])=O');
  await expect(inchiOfMolecule(molecule)).resolves.toBe(acetate);
});

test('a cation keeps its charge', async () => {
  const ammonium = 'InChI=1S/H3N/h1H3/p+1';
  const molecule = await moleculeFromInchi(ammonium);

  expect(molecule.getAllAtoms()).toBe(1);
  expect(molecule.getAtomCharge(0)).toBe(1);
  expect(molecule.toIsomericSmiles()).toBe('[NH4+]');
  await expect(inchiOfMolecule(molecule)).resolves.toBe(ammonium);
});

test('a disconnected salt keeps every component', async () => {
  const copperDichloride = 'InChI=1S/2ClH.Cu/h2*1H;/q;;+2/p-2';
  const molecule = await moleculeFromInchi(copperDichloride);

  expect(molecule.getAllAtoms()).toBe(3);
  expect(molecule.getAllBonds()).toBe(0);
  expect([
    molecule.getAtomCharge(0),
    molecule.getAtomCharge(1),
    molecule.getAtomCharge(2),
  ]).toStrictEqual([-1, -1, 2]);
  expect(molecule.toIsomericSmiles()).toBe('[Cl-].[Cl-].[Cu+2]');
  await expect(inchiOfMolecule(molecule)).resolves.toBe(copperDichloride);
});

test('the two alanine enantiomers stay distinct', async () => {
  const lAlanine =
    'InChI=1S/C3H7NO2/c1-2(4)3(5)6/h2H,4H2,1H3,(H,5,6)/t2-/m0/s1';
  const dAlanine =
    'InChI=1S/C3H7NO2/c1-2(4)3(5)6/h2H,4H2,1H3,(H,5,6)/t2-/m1/s1';
  const left = await moleculeFromInchi(lAlanine);
  const right = await moleculeFromInchi(dAlanine);

  expect(left.toIsomericSmiles()).toBe('C[C@@H](C(O)=O)N');
  expect(right.toIsomericSmiles()).toBe('C[C@H](C(O)=O)N');
  expect(left.getIDCode()).not.toBe(right.getIDCode());
  await expect(inchiOfMolecule(left)).resolves.toBe(lAlanine);
  await expect(inchiOfMolecule(right)).resolves.toBe(dAlanine);
});

test('a single stereocentre on a halomethane', async () => {
  const bromochlorofluoromethane = 'InChI=1S/CHBrClF/c2-1(3)4/h1H/t1-/m0/s1';
  const molecule = await moleculeFromInchi(bromochlorofluoromethane);

  expect(molecule.toIsomericSmiles()).toBe('F[C@H](Cl)Br');
  await expect(inchiOfMolecule(molecule)).resolves.toBe(
    bromochlorofluoromethane,
  );
});

test('two stereocentres of opposite parity', async () => {
  const ester =
    'InChI=1S/C9H18O2/c1-5-7(3)8(4)11-9(10)6-2/h7-8H,5-6H2,1-4H3/t7-,8+/m0/s1';
  const molecule = await moleculeFromInchi(ester);

  expect(molecule.getAllAtoms()).toBe(11);
  expect(molecule.toIsomericSmiles()).toBe('CC[C@H](C)[C@@H](C)OC(CC)=O');
  await expect(inchiOfMolecule(molecule)).resolves.toBe(ester);
});

test('a molecule without a stereo layer gets no parity', async () => {
  const alanine = 'InChI=1S/C3H7NO2/c1-2(4)3(5)6/h2H,4H2,1H3,(H,5,6)';
  const molecule = await moleculeFromInchi(alanine);

  expect(molecule.toIsomericSmiles()).toBe('CC(C(O)=O)N');
  await expect(inchiOfMolecule(molecule)).resolves.toBe(alanine);
});

// The InChI library reports isotopic hydrogens as implicit H counts on
// the parent atom rather than as atoms, so the /i layer does not reach
// the OCL molecule.
test('isotopic hydrogens are dropped', async () => {
  const molecule = await moleculeFromInchi('InChI=1S/H2O/h1H2/i/hD2');

  expect(molecule.getAllAtoms()).toBe(1);
  await expect(inchiOfMolecule(molecule)).resolves.toBe('InChI=1S/H2O/h1H2');
});

test('an invalid InChI yields no molecule', async () => {
  const result = await oclMoleculeFromInchi('not an inchi', OCL);

  expect(result.returnCode).toBe(-1);
  expect(result.molecule).toBeNull();
});

test('oclMoleculeFromStructure builds the same molecule synchronously', async () => {
  const inchi = 'InChI=1S/C3H7NO2/c1-2(4)3(5)6/h2H,4H2,1H3,(H,5,6)/t2-/m0/s1';
  const structure = await structureFromInchi(inchi);
  const molecule = oclMoleculeFromStructure(structure, OCL);
  const fromInchi = await moleculeFromInchi(inchi);

  expect(molecule.getIDCode()).toBe(fromInchi.getIDCode());
  expect(molecule.toIsomericSmiles()).toBe('C[C@@H](C(O)=O)N');
});
