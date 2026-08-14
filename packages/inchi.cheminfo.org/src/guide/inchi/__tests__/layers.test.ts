import { expect, test } from 'vitest';

import { findSegment, splitInchi } from '../layers.ts';

const CAFFEINE =
  'InChI=1S/C8H10N4O2/c1-10-4-9-6-5(10)7(13)12(3)8(14)11(6)2/h4H,1-3H3';

test('splits caffeine into formula, connections and hydrogens', () => {
  const split = splitInchi(CAFFEINE);

  expect(split.version).toBe('InChI=1S');
  expect(split.segments.map((segment) => segment.letter)).toStrictEqual([
    '',
    'c',
    'h',
  ]);
  expect(split.segments[0]?.value).toBe('C8H10N4O2');
  expect(split.segments[1]?.value).toBe(
    '1-10-4-9-6-5(10)7(13)12(3)8(14)11(6)2',
  );
  expect(split.segments[2]?.value).toBe('4H,1-3H3');
});

test('tags charge and stereo segments with their block', () => {
  const split = splitInchi(
    'InChI=1S/C4H6O6/c5-1(3(7)8)2(6)4(9)10/h1-2,5-6H,(H,7,8)(H,9,10)/q-1/t1-,2-/m1/s1',
  );
  const blocks = new Map(
    split.segments.map((segment) => [segment.letter, segment.block]),
  );

  expect(blocks.get('q')).toBe('charge');
  expect(blocks.get('t')).toBe('stereo');
  expect(blocks.get('m')).toBe('stereo');
  expect(blocks.get('s')).toBe('stereo');
  expect(blocks.get('c')).toBe('main');
});

test('a /h after /i is the exchangeable isotopic hydrogen sublayer', () => {
  const split = splitInchi('InChI=1/C2H6S2/c3-1-2-4/h3-4H,1-2H2/i/hD/f/i3D');

  expect(findSegment(split, 'h', 'main')?.value).toBe('3-4H,1-2H2');
  expect(findSegment(split, 'h', 'isotopic')?.value).toBe('D');
  expect(findSegment(split, 'i', 'fixedH')?.value).toBe('3D');
  expect(findSegment(split, 'h', 'isotopic')?.name).toBe(
    'Exchangeable isotopic hydrogens',
  );
});

test('an empty string yields no segments', () => {
  expect(splitInchi(' '.repeat(3))).toStrictEqual({
    version: '',
    segments: [],
  });
});
