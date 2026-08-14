import { expect, test } from 'vitest';

import {
  canonicalToOriginal,
  equivalenceGroups,
  originalToCanonical,
} from '../auxinfo.ts';

const CAFFEINE_AUXINFO =
  'AuxInfo=1/0/N:1,14,10,3,6,5,7,11,4,2,13,9,8,12/rA:14nCNCNCCCONCCONC/rB:s1;s2;';

test('reads the canonical atom order of caffeine', () => {
  expect(canonicalToOriginal(CAFFEINE_AUXINFO)).toStrictEqual([
    [1, 14, 10, 3, 6, 5, 7, 11, 4, 2, 13, 9, 8, 12],
  ]);
});

test('splits the canonical order per component', () => {
  expect(canonicalToOriginal('AuxInfo=1/0/N:2;1/rA:2nClNa')).toStrictEqual([
    [2],
    [1],
  ]);
});

test('inverts the canonical order into an atom label map', () => {
  const map = originalToCanonical([1, 14, 10, 3]);

  expect(map.get(1)).toBe(1);
  expect(map.get(14)).toBe(2);
  expect(map.get(10)).toBe(3);
  expect(map.get(3)).toBe(4);
  expect(map.size).toBe(4);
});

test('reads the equivalence classes of tartaric acid', () => {
  expect(
    equivalenceGroups(
      'AuxInfo=1/1/N:4,6,2,8,5,7,1,3,9,10/E:(1,2)(3,4)(5,6)(7,8,9,10)/gE:(1,2)',
    ),
  ).toStrictEqual([
    [1, 2],
    [3, 4],
    [5, 6],
    [7, 8, 9, 10],
  ]);
});

test('returns no equivalence class when every atom is distinct', () => {
  expect(equivalenceGroups('AuxInfo=1/0/N:1,2,3/rA:3')).toStrictEqual([]);
});

test('returns nothing when the field is absent', () => {
  expect(canonicalToOriginal('AuxInfo=1/0/rA:3nCCC')).toStrictEqual([]);
});
