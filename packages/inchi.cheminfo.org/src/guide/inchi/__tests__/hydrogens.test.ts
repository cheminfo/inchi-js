import { expect, test } from 'vitest';

import {
  expandAtomList,
  parseFixedHydrogens,
  parseMobileHydrogens,
} from '../hydrogens.ts';

test('expands ranges and single atoms', () => {
  expect(expandAtomList('1-3,7,9-10')).toStrictEqual([1, 2, 3, 7, 9, 10]);
  expect(expandAtomList('')).toStrictEqual([]);
});

test('reads the immobile hydrogen runs of caffeine', () => {
  expect(parseFixedHydrogens('4H,1-3H3')).toStrictEqual([
    { hydrogens: 1, atoms: [4] },
    { hydrogens: 3, atoms: [1, 2, 3] },
  ]);
});

test('ignores mobile groups when reading immobile runs', () => {
  expect(parseFixedHydrogens('1,3H2,(H,4,5)')).toStrictEqual([
    { hydrogens: 2, atoms: [1, 3] },
  ]);
});

test('reads a single mobile hydrogen shared by two atoms', () => {
  expect(parseMobileHydrogens('1,3H2,(H,4,5)')).toStrictEqual([
    { hydrogens: 1, charges: 0, atoms: [4, 5] },
  ]);
});

test('reads several mobile groups and multi-hydrogen groups', () => {
  expect(parseMobileHydrogens('(H,7,8)(H,9,10)')).toStrictEqual([
    { hydrogens: 1, charges: 0, atoms: [7, 8] },
    { hydrogens: 1, charges: 0, atoms: [9, 10] },
  ]);
  expect(parseMobileHydrogens('(H4,2,3,4)')).toStrictEqual([
    { hydrogens: 4, charges: 0, atoms: [2, 3, 4] },
  ]);
});

test('reads the negative charges carried by a mobile group', () => {
  expect(parseMobileHydrogens('(H-,1,2)')).toStrictEqual([
    { hydrogens: 1, charges: 1, atoms: [1, 2] },
  ]);
  expect(parseMobileHydrogens('(H2-2,3,4,5)')).toStrictEqual([
    { hydrogens: 2, charges: 2, atoms: [3, 4, 5] },
  ]);
  expect(parseMobileHydrogens('(-,1,2)')).toStrictEqual([
    { hydrogens: 0, charges: 1, atoms: [1, 2] },
  ]);
});
