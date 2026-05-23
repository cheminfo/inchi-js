import { expect, test } from 'vitest';

import { structureFromInchi } from '../structureFromInchi.ts';

test('parses ethanol into atoms with no stereo', async () => {
  const result = await structureFromInchi('InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3');

  expect(result.returnCode).toBe(0);
  expect(result.atoms.map((a) => a.element)).toStrictEqual(['C', 'C', 'O']);
  expect(result.stereo).toStrictEqual([]);

  const bondCount = result.atoms
    .flatMap((a) => a.bonds)
    .filter((b, i, arr) => {
      // Each bond appears in one or both adjacency lists; dedupe.
      return arr.indexOf(b) === i;
    }).length;

  expect(bondCount).toBeGreaterThanOrEqual(2);
});

test('preserves the tetrahedral stereo layer of a chiral ester', async () => {
  const result = await structureFromInchi(
    'InChI=1S/C9H18O2/c1-5-7(3)8(4)11-9(10)6-2/h7-8H,5-6H2,1-4H3/t7-,8+/m0/s1',
  );

  expect(result.returnCode).toBe(0);
  expect(result.atoms.length).toBeGreaterThanOrEqual(11);

  // The /t7-,8+ layer encodes two tetrahedral centres; the parser
  // should surface them as inchi_StereoType_Tetrahedral (= 2).
  const tetrahedrals = result.stereo.filter((s) => s.type === 2);

  expect(tetrahedrals).toHaveLength(2);

  for (const entry of tetrahedrals) {
    // Parity must be 'odd' or 'even' (not 0/3/4) since both centres
    // have a fully-defined absolute configuration in the source InChI.
    expect([1, 2]).toContain(entry.parity);
    expect(entry.centralAtom).toBeGreaterThanOrEqual(0);
    expect(entry.neighbors).toHaveLength(4);
  }
});

test('reports an error for an invalid InChI', async () => {
  const result = await structureFromInchi('not an inchi');

  expect(result.returnCode).toBe(-1);
  expect(result.atoms).toStrictEqual([]);
  expect(result.stereo).toStrictEqual([]);
});
