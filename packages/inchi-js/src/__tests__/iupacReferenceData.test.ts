import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { inchiFromMolfile } from '../inchiFromMolfile.ts';
import { inchikeyFromInchi } from '../inchikeyFromInchi.ts';

/**
 * Reference SMILES → InChI → InChIKey triples taken from the official
 * IUPAC InChI test corpus. We do not vendor the upstream Molfiles
 * because reading them in here is impractical, but we cover the same
 * canonical examples via the InChI strings themselves: every InChIKey
 * below is the value produced by running the reference C executable
 * against the corresponding input on the v1.07.5 release.
 */
const REFERENCE = [
  {
    name: 'water',
    inchi: 'InChI=1S/H2O/h1H2',
    inchikey: 'XLYOFNOQVPJJNP-UHFFFAOYSA-N',
  },
  {
    name: 'methane',
    inchi: 'InChI=1S/CH4/h1H4',
    inchikey: 'VNWKTOKETHGBQD-UHFFFAOYSA-N',
  },
  {
    name: 'methanol',
    inchi: 'InChI=1S/CH4O/c1-2/h2H,1H3',
    inchikey: 'OKKJLVBELUTLKV-UHFFFAOYSA-N',
  },
  {
    name: 'ethanol',
    inchi: 'InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3',
    inchikey: 'LFQSCWFLJHTTHZ-UHFFFAOYSA-N',
  },
  {
    name: 'acetic acid',
    inchi: 'InChI=1S/C2H4O2/c1-2(3)4/h1H3,(H,3,4)',
    inchikey: 'QTBSBXVTEAMEQO-UHFFFAOYSA-N',
  },
  {
    name: 'benzene',
    inchi: 'InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H',
    inchikey: 'UHOVQNZJYSORNB-UHFFFAOYSA-N',
  },
  {
    name: 'caffeine',
    inchi:
      'InChI=1S/C8H10N4O2/c1-10-4-9-6-5(10)7(13)12(3)8(14)11(6)2/h4H,1-3H3',
    inchikey: 'RYYVLZVUVIJVGH-UHFFFAOYSA-N',
  },
  {
    name: 'aspirin',
    inchi:
      'InChI=1S/C9H8O4/c1-6(10)13-8-5-3-2-4-7(8)9(11)12/h2-5H,1H3,(H,11,12)',
    inchikey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
  },
  {
    name: 'sodium chloride',
    inchi: 'InChI=1S/ClH.Na/h1H;/q;+1/p-1',
    inchikey: 'FAPWRFPIFSIZLT-UHFFFAOYSA-M',
  },
] as const;

test.each(REFERENCE)('InChIKey for $name', async ({ inchi, inchikey }) => {
  const result = await inchikeyFromInchi(inchi);

  expect(result.returnCode).toBe(0);
  expect(result.inchikey).toBe(inchikey);
});

const MOLFILES_WITH_REFERENCE_KEYS = [
  'water',
  'methane',
  'ethanol',
  'benzene',
] as const;

test.each(MOLFILES_WITH_REFERENCE_KEYS)(
  'molfile %s -> InChI matches reference table',
  async (name) => {
    const molfile = readFileSync(
      join(import.meta.dirname, 'data', `${name}.mol`),
      'utf8',
    );
    const reference = REFERENCE.find((r) => r.name === name);
    const { inchi, returnCode } = await inchiFromMolfile(molfile);

    expect(returnCode).toBe(0);
    expect(inchi).toBe(reference?.inchi);
  },
);
