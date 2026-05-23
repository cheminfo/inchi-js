import {
  inchiFromMolfile,
  oclMoleculeFromStructure,
  structureFromInchi,
} from 'inchi-js';
import * as OCL from 'openchemlib';
import { expect, test } from 'vitest';

// Cases that round-trip correctly through `InChI → OCL Molecule →
// molfile → InChI` today.
const STEREO_INCHIS = [
  // (2S,3R)-2-methyl-pent-3-yl propanoate — two acyclic stereo centres.
  'InChI=1S/C9H18O2/c1-5-7(3)8(4)11-9(10)6-2/h7-8H,5-6H2,1-4H3/t7-,8+/m0/s1',
  // L-alanine.
  'InChI=1S/C3H7NO2/c1-2(4)3(5)6/h2H,4H2,1H3,(H,5,6)/t2-/m0/s1',
  // (R)-2-butanol.
  'InChI=1S/C4H10O/c1-3-4(2)5/h4-5H,3H2,1-2H3/t4-/m1/s1',
  // (S)-2-butanol — verifies enantiomer distinction.
  'InChI=1S/C4H10O/c1-3-4(2)5/h4-5H,3H2,1-2H3/t4-/m0/s1',
];

test.each(STEREO_INCHIS)('round-trips stereo: %s', async (sourceInchi) => {
  const structure = await structureFromInchi(sourceInchi);

  expect(structure.returnCode).toBe(0);

  const molecule = oclMoleculeFromStructure(structure, OCL);
  const molfile = molecule.toMolfile();

  const back = await inchiFromMolfile(molfile);

  expect(back.returnCode).toBe(0);
  expect(back.inchi).toBe(sourceInchi);
});

test('non-chiral InChI round-trips identically', async () => {
  const sourceInchi =
    'InChI=1S/C8H10N4O2/c1-10-4-9-6-5(10)7(13)12(3)8(14)11(6)2/h4H,1-3H3';
  const structure = await structureFromInchi(sourceInchi);
  const molecule = oclMoleculeFromStructure(structure, OCL);
  const molfile = molecule.toMolfile();
  const back = await inchiFromMolfile(molfile);

  expect(back.inchi).toBe(sourceInchi);
});

// Cases blocked by the OCL `setStereoBondsFromParity` bug documented in
// `bug-report/`. Same atom-parity translation as the cases above, but
// OCL emits a wedge of the opposite handedness for certain ring
// substrates — the result is a molfile that round-trips to the
// enantiomer of the source InChI. Un-skip once openchemlib ships the
// fix.
test.skip.each([
  // (R)-3-methylcyclohexanone — chirality on a saturated ring.
  'InChI=1S/C7H12O/c1-6-3-2-4-7(8)5-6/h6H,2-5H2,1H3/t6-/m1/s1',
  // 4-(2-buten-1-ylidene)-1-methylcyclohexane, both enantiomers.
  'InChI=1S/C9H16/c1-3-9-6-4-8(2)5-7-9/h3,8H,4-7H2,1-2H3/b9-3-/t8-/m0/s1',
  'InChI=1S/C9H16/c1-3-9-6-4-8(2)5-7-9/h3,8H,4-7H2,1-2H3/b9-3-/t8-/m1/s1',
  // D-glucose (β-D-glucopyranose) — five chiral centres on one ring.
  'InChI=1S/C6H12O6/c7-1-2-3(8)4(9)5(10)6(11)12-2/h2-11H,1H2/t2-,3-,4+,5-,6-/m1/s1',
])('BLOCKED on OCL bug — round-trips stereo: %s', async (sourceInchi) => {
  const structure = await structureFromInchi(sourceInchi);
  const molecule = oclMoleculeFromStructure(structure, OCL);
  const back = await inchiFromMolfile(molecule.toMolfile());

  expect(back.inchi).toBe(sourceInchi);
});
