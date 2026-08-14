import { expect, test } from 'vitest';

import { checkFullInchi, checkLayer, checkText } from '../validate.ts';

const CAFFEINE =
  'InChI=1S/C8H10N4O2/c1-10-4-9-6-5(10)7(13)12(3)8(14)11(6)2/h4H,1-3H3';

test('accepts a layer answer written with or without its prefix', () => {
  expect(checkLayer('4H,1-3H3', CAFFEINE, 'h').passed).toBe(true);
  expect(checkLayer('/h4H,1-3H3', CAFFEINE, 'h').passed).toBe(true);
  expect(checkLayer('h4H,1-3H3', CAFFEINE, 'h').passed).toBe(true);
  expect(checkLayer('  4H, 1-3H3 ', CAFFEINE, 'h').passed).toBe(true);
});

test('accepts the formula with an empty prefix letter', () => {
  expect(checkLayer('C8H10N4O2', CAFFEINE, '').passed).toBe(true);
  expect(checkLayer('C8H10N4O3', CAFFEINE, '').passed).toBe(false);
});

test('says where a layer answer starts to differ', () => {
  const check = checkLayer(
    '1-10-4-9-6-5(10)7(13)12(3)8(14)11(6)3',
    CAFFEINE,
    'c',
  );

  expect(check.passed).toBe(false);
  expect(check.expected).toBe('1-10-4-9-6-5(10)7(13)12(3)8(14)11(6)2');
  expect(check.reason).toBe(
    'The layers agree for the first 36 characters ("1-10-4-9-6-5(10)7(13)12(3)8(14)11(6)") and then differ: you wrote "3".',
  );
});

test('says when an answer stops early or runs on', () => {
  expect(checkLayer('4H', CAFFEINE, 'h').reason).toBe(
    'Your answer stops early: after "4H" the layer continues.',
  );
  expect(checkLayer('4H,1-3H3,5H', CAFFEINE, 'h').reason).toBe(
    'Your answer is right up to "4H,1-3H3" but carries on with ",5H".',
  );
});

test('expects an empty answer for a layer the structure does not have', () => {
  const check = checkLayer('1-', CAFFEINE, 't', 'stereo');

  expect(check.passed).toBe(false);
  expect(check.reason).toBe(
    'This structure has no /t layer — leave the box empty.',
  );
  expect(checkLayer('', CAFFEINE, 't', 'stereo').passed).toBe(true);
});

test('accepts a full InChI with the prologue left off', () => {
  const withoutPrologue = CAFFEINE.replace('InChI=1S/', '');

  expect(checkFullInchi(withoutPrologue, CAFFEINE).passed).toBe(true);
  expect(checkFullInchi(CAFFEINE, CAFFEINE).passed).toBe(true);
});

test('names the layer that is wrong in a full InChI answer', () => {
  const check = checkFullInchi(
    'InChI=1S/C8H10N4O2/c1-10-4-9-6-5(10)7(13)12(3)8(14)11(6)2/h4H,1-2H3',
    CAFFEINE,
  );

  expect(check.passed).toBe(false);
  expect(check.reason).toBe(
    'The hydrogen positions layer differs: you wrote /h4H,1-2H3.',
  );
});

test('names a missing layer', () => {
  const check = checkFullInchi(
    'InChI=1S/C8H10N4O2/c1-10-4-9-6-5(10)7(13)12(3)8(14)11(6)2',
    CAFFEINE,
  );

  expect(check.reason).toBe(
    'The hydrogen positions layer is missing: /h4H,1-3H3',
  );
});

test('compares free text case-insensitively', () => {
  expect(checkText(' rac ', 'RAC').passed).toBe(true);
  expect(checkText('', 'RAC').reason).toBe(
    'Expected RAC, you wrote (nothing).',
  );
});
