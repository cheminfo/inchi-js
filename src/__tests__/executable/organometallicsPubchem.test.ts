import { join } from 'node:path';

import { expect, test } from 'vitest';

import { inchiFromMolfile } from '../../inchiFromMolfile.ts';
import { extractMolfile, iterateSdfRecords } from '../helpers/sdfUtils.ts';

/*
 * Ported from IUPAC `INCHI-1-TEST/tests/test_executable/test_organometallics_pubchem.py`.
 *
 * Every organometallic structure in the upstream PubChem fixture must
 * produce a non-empty InChI when processed with the `-RecMet` switch.
 */

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const SDF_PATH = join(
  REPO_ROOT,
  'vendor/inchi/INCHI-1-TEST/tests/test_executable/data/organometallic_structures_pubchem.sdf.gz',
);

test(
  'organometallics-pubchem — every structure yields an InChI with -RecMet',
  { timeout: 60_000 },
  async () => {
    const missing: string[] = [];
    let total = 0;
    for (const record of iterateSdfRecords(SDF_PATH)) {
      total += 1;
      const molfile = extractMolfile(record);
      // eslint-disable-next-line no-await-in-loop -- WASM calls must be sequential
      const result = await inchiFromMolfile(molfile, { options: '-RecMet' });
      if (!result.inchi) {
        const titleLine = molfile.split('\n', 1)[0]?.trim() ?? '(no title)';
        missing.push(`${titleLine}: ${result.log || '(no log)'}`);
      }
    }

    expect(total).toBeGreaterThan(0);
    expect({
      countMissing: missing.length,
      firstFive: missing.slice(0, 5),
    }).toStrictEqual({ countMissing: 0, firstFive: [] });
  },
);
