import { expect, test } from 'vitest';

test('package is wired to the inchi-js library', async () => {
  const lib = await import('inchi-js');

  expect(typeof lib.inchiFromMolfile).toBe('function');
  expect(typeof lib.inchikeyFromInchi).toBe('function');
  expect(typeof lib.molfileFromInchi).toBe('function');
});
