import { inchiFromMolfile, structureFromInchi } from 'inchi-js';
import { expect, test } from 'vitest';

import { inchiStructureToOclMolecule } from '../inchi/inchiToOclMolecule.ts';

const STEREO_INCHIS = [
  // (2S,3R)-2-methyl-pent-3-yl propanoate (the user's first example).
  'InChI=1S/C9H18O2/c1-5-7(3)8(4)11-9(10)6-2/h7-8H,5-6H2,1-4H3/t7-,8+/m0/s1',
  // L-alanine
  'InChI=1S/C3H7NO2/c1-2(4)3(5)6/h2H,4H2,1H3,(H,5,6)/t2-/m0/s1',
  // (R)-2-butanol
  'InChI=1S/C4H10O/c1-3-4(2)5/h4-5H,3H2,1-2H3/t4-/m1/s1',
  // (S)-2-butanol
  'InChI=1S/C4H10O/c1-3-4(2)5/h4-5H,3H2,1-2H3/t4-/m0/s1',
  // (R)-4-(2-buten-1-ylidene)-1-methyl-cyclohexane — axial chirality
  // on a cyclohexane ring + Z double bond. InChI returns explicit Hs
  // on the stereo atoms, which OCL silently strips during
  // inventCoordinates() — the parity translation must compensate.
  'InChI=1S/C9H16/c1-3-9-6-4-8(2)5-7-9/h3,8H,4-7H2,1-2H3/b9-3-/t8-/m0/s1',
  // (S) variant of the same — verifies enantiomer distinction.
  'InChI=1S/C9H16/c1-3-9-6-4-8(2)5-7-9/h3,8H,4-7H2,1-2H3/b9-3-/t8-/m1/s1',
];

test.each(STEREO_INCHIS)('round-trips stereo: %s', async (sourceInchi) => {
  const structure = await structureFromInchi(sourceInchi);

  expect(structure.returnCode).toBe(0);

  const molecule = inchiStructureToOclMolecule(structure);
  const molfile = molecule.toMolfile();

  const back = await inchiFromMolfile(molfile);

  expect(back.returnCode).toBe(0);
  expect(back.inchi).toBe(sourceInchi);
});

test('non-chiral InChI round-trips identically', async () => {
  const sourceInchi =
    'InChI=1S/C8H10N4O2/c1-10-4-9-6-5(10)7(13)12(3)8(14)11(6)2/h4H,1-3H3';
  const structure = await structureFromInchi(sourceInchi);
  const molecule = inchiStructureToOclMolecule(structure);
  const molfile = molecule.toMolfile();
  const back = await inchiFromMolfile(molfile);

  expect(back.inchi).toBe(sourceInchi);
});
