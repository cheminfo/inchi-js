import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { inchiFromMolfile } from '../inchiFromMolfile.ts';
import { inchikeyFromInchi } from '../inchikeyFromInchi.ts';
import { molfileFromInchi } from '../molfileFromInchi.ts';

const readme = readFileSync(
  join(import.meta.dirname, '..', '..', 'README.md'),
  'utf8',
);

function quickStartMolfile(): string {
  const match = /const ethanol = `(?<molfile>[^`]*)`/.exec(readme);
  if (!match?.groups?.molfile) {
    throw new Error('the README quick start no longer defines `ethanol`');
  }
  return match.groups.molfile;
}

/**
 * The values the quick start documents in its `// → '…'` comments.
 * @returns Every documented value, in the order the README lists them.
 */
function quickStartOutputs(): string[] {
  return [...readme.matchAll(/\/\/ → '(?<value>[^']*)'/g)].map(
    (match) => match.groups?.value ?? '',
  );
}

test('the quick start molfile is the ethanol fixture', () => {
  const fixture = readFileSync(
    join(import.meta.dirname, 'data', 'ethanol.mol'),
    'utf8',
  );

  expect(quickStartMolfile()).toBe(fixture);
});

test('the quick start documents the values the library returns', async () => {
  const { inchi } = await inchiFromMolfile(quickStartMolfile());
  const { inchikey } = await inchikeyFromInchi(inchi);

  expect(quickStartOutputs()).toStrictEqual([inchi, inchikey]);
  expect(inchi).toBe('InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3');
  expect(inchikey).toBe('LFQSCWFLJHTTHZ-UHFFFAOYSA-N');
});

test('the molfile the quick start reconstructs is the same structure', async () => {
  const inchi = 'InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3';
  const { molfile, returnCode } = await molfileFromInchi(inchi);

  expect(returnCode).toBe(0);

  const back = await inchiFromMolfile(molfile);

  expect(back.inchi).toBe(inchi);
});
