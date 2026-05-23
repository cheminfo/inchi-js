import { expect, test } from 'vitest';

import { inchikeyFromInchi } from '../inchikeyFromInchi.ts';

test('water', async () => {
  const result = await inchikeyFromInchi('InChI=1S/H2O/h1H2');

  expect(result.returnCode).toBe(0);
  expect(result.inchikey).toBe('XLYOFNOQVPJJNP-UHFFFAOYSA-N');
});

test('ethanol', async () => {
  const result = await inchikeyFromInchi('InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3');

  expect(result.returnCode).toBe(0);
  expect(result.inchikey).toBe('LFQSCWFLJHTTHZ-UHFFFAOYSA-N');
});

test('benzene', async () => {
  const result = await inchikeyFromInchi('InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H');

  expect(result.returnCode).toBe(0);
  expect(result.inchikey).toBe('UHOVQNZJYSORNB-UHFFFAOYSA-N');
});

test('caffeine', async () => {
  const result = await inchikeyFromInchi(
    'InChI=1S/C8H10N4O2/c1-10-4-9-6-5(10)7(13)12(3)8(14)11(6)2/h4H,1-3H3',
  );

  expect(result.returnCode).toBe(0);
  expect(result.inchikey).toBe('RYYVLZVUVIJVGH-UHFFFAOYSA-N');
});

test('empty input fails gracefully', async () => {
  const result = await inchikeyFromInchi('');

  expect(result.returnCode).toBe(-1);
  expect(result.inchikey).toBe('');
  expect(result.message).not.toBe('');
});

test('garbage InChI prefix fails gracefully', async () => {
  const result = await inchikeyFromInchi('not an inchi');

  expect(result.returnCode).toBe(-1);
  expect(result.inchikey).toBe('');
  expect(result.message).toMatch(/prefix|invalid/i);
});
