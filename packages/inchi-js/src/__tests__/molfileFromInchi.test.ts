import { expect, test } from 'vitest';

import { inchiFromMolfile } from '../inchiFromMolfile.ts';
import { molfileFromInchi } from '../molfileFromInchi.ts';

test('round-trips ethanol InChI -> Molfile -> InChI', async () => {
  const inchi = 'InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3';
  const { molfile, returnCode } = await molfileFromInchi(inchi);

  expect(returnCode).toBe(0);
  expect(molfile).toContain('V2000');

  const back = await inchiFromMolfile(molfile);

  expect(back.returnCode).toBe(0);
  expect(back.inchi).toBe(inchi);
});

test('round-trips caffeine InChI -> Molfile -> InChI', async () => {
  const inchi =
    'InChI=1S/C8H10N4O2/c1-10-4-9-6-5(10)7(13)12(3)8(14)11(6)2/h4H,1-3H3';
  const { molfile, returnCode } = await molfileFromInchi(inchi);

  expect(returnCode).toBe(0);

  const back = await inchiFromMolfile(molfile);

  expect(back.returnCode).toBe(0);
  expect(back.inchi).toBe(inchi);
});

test('garbage InChI fails gracefully', async () => {
  const { returnCode, molfile } = await molfileFromInchi('not an inchi');

  expect(returnCode).toBe(-1);
  expect(molfile).toBe('');
});
