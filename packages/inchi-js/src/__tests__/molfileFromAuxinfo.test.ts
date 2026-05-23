import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { inchiFromMolfile } from '../inchiFromMolfile.ts';
import { molfileFromAuxinfo } from '../molfileFromAuxinfo.ts';

function loadMolfile(name: string): string {
  return readFileSync(join(import.meta.dirname, 'data', `${name}.mol`), 'utf8');
}

test('round-trips ethanol AuxInfo -> Molfile -> InChI', async () => {
  const original = await inchiFromMolfile(loadMolfile('ethanol'));

  expect(original.auxinfo).not.toBe('');

  const { molfile, returnCode } = await molfileFromAuxinfo(original.auxinfo);

  expect(returnCode).toBe(0);
  expect(molfile).toContain('V2000');

  const back = await inchiFromMolfile(molfile);

  expect(back.returnCode).toBe(0);
  expect(back.inchi).toBe(original.inchi);
});

test('garbage AuxInfo fails gracefully', async () => {
  const { returnCode, molfile } = await molfileFromAuxinfo('not auxinfo');

  expect(returnCode).toBe(-1);
  expect(molfile).toBe('');
});
