import { expect, test } from 'vitest';

import { inchiFromMolfile } from '../../inchiFromMolfile.ts';

/*
 * Ported from IUPAC `INCHI-1-TEST/tests/test_executable/test_aromatic_ions.py`.
 *
 * All three structures use V2000 aromatic bond type 4 (single & double).
 * The upstream library currently rejects them with "Cannot process
 * aromatic bonds" — every test is marked `xfail` upstream and we
 * mirror that with vitest `test.fails`.
 */

const CYCLOPENTADIENE_ANION = `
  ChemDraw02042509422D

  5  5  0  0  0  0  0  0  0  0999 V2000
   -0.6348    0.4125    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.6348   -0.4125    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.1498   -0.6674    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.6348    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.1498    0.6674    0.0000 C   0  5  0  0  0  0  0  0  0  0  0  0
  1  2  4  0
  2  3  4  0
  3  4  4  0
  4  5  4  0
  5  1  4  0
M  CHG  1   5  -1
M  END
`;

const CYCLOHEPTATRIENE_CATION = `
  ChemDraw02042509542D

  7  7  0  0  0  0  0  0  0  0999 V2000
   -0.9036    0.4125    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.9036   -0.4125    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.2586   -0.9269    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.5457   -0.7433    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.9036    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.5457    0.7433    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.2586    0.9269    0.0000 C   0  3  0  0  0  0  0  0  0  0  0  0
  1  2  4  0
  2  3  4  0
  3  4  4  0
  4  5  4  0
  5  6  4  0
  6  7  4  0
  7  1  4  0
M  CHG  1   7   1
M  END
`;

const CYCLOPROPENE_CATION = `
  ChemDraw02042509402D

  3  3  0  0  0  0  0  0  0  0999 V2000
   -0.3572    0.4125    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.3572   -0.4125    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.3572    0.0000    0.0000 C   0  3  0  0  0  0  0  0  0  0  0  0
  1  2  4  0
  2  3  4  0
  3  1  4  0
M  CHG  1   3   1
M  END
`;

test.fails(
  'cyclopentadiene anion — aromatic bonds still rejected',
  async () => {
    const result = await inchiFromMolfile(CYCLOPENTADIENE_ANION);

    expect(result.log).not.toContain('Cannot process aromatic bonds');
    expect(result.inchi).toBe('InChI=1S/C5H5/c1-2-4-5-3-1/h1-5H/q-1');
  },
);

test.fails(
  'cycloheptatriene cation — aromatic bonds still rejected',
  async () => {
    const result = await inchiFromMolfile(CYCLOHEPTATRIENE_CATION);

    expect(result.log).not.toContain('Cannot process aromatic bonds');
    expect(result.inchi).toBe('InChI=1S/C7H7/c1-2-4-6-7-5-3-1/h1-7H/q+1');
  },
);

test.fails('cyclopropene cation — aromatic bonds still rejected', async () => {
  const result = await inchiFromMolfile(CYCLOPROPENE_CATION);

  expect(result.log).not.toContain('Cannot process aromatic bonds');
  expect(result.inchi).toBe('InChI=1S/C3H3/c1-2-3-1/h1-3H/q+1');
});
