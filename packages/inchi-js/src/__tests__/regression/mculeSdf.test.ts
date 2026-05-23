import { join } from 'node:path';

import { expect, test } from 'vitest';

import { inchiFromMolfile } from '../../inchiFromMolfile.ts';
import { loadReferenceMap } from '../helpers/loadSqliteReference.ts';
import {
  extractMolfile,
  getMolfileId,
  iterateSdfRecords,
} from '../helpers/sdfUtils.ts';

/*
 * Regression of the upstream IUPAC `mcule.sdf` corpus
 * (`INCHI-1-TEST/tests/test_library/data/ci/mcule.sdf.gz` — 2,000
 * commercially-available structures from mcule.com) against the
 * reference InChI/InChIKey/AuxInfo strings stored in the matching
 * SQLite snapshot.
 */

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..', '..', '..');
const SDF_PATH = join(
  REPO_ROOT,
  'vendor/inchi/INCHI-1-TEST/tests/test_library/data/ci/mcule.sdf.gz',
);
const REF_PATH = join(
  REPO_ROOT,
  'vendor/inchi/INCHI-1-TEST/tests/test_library/data/ci/mcule.sdf.regression_reference.sqlite',
);

test(
  'mcule.sdf regression: every structure matches the upstream reference',
  { timeout: 120_000 },
  async () => {
    const reference = loadReferenceMap(REF_PATH);
    const unexpectedFailures: Array<{
      molfileId: string;
      expectedInchi: string;
      actualInchi: string;
    }> = [];
    let total = 0;
    let matched = 0;
    let missingReference = 0;

    for (const record of iterateSdfRecords(SDF_PATH)) {
      total += 1;
      const molfileId = getMolfileId(record);
      const ref = reference.get(molfileId);
      if (!ref) {
        missingReference += 1;
        continue;
      }
      const molfile = extractMolfile(record);
      // eslint-disable-next-line no-await-in-loop -- WASM call must be sequential
      const result = await inchiFromMolfile(molfile);
      if (result.inchi === ref.inchi) {
        matched += 1;
        continue;
      }
      unexpectedFailures.push({
        molfileId,
        expectedInchi: ref.inchi,
        actualInchi: result.inchi,
      });
    }

    expect(total).toBeGreaterThan(1900);
    expect(missingReference).toBe(0);
    expect({
      count: unexpectedFailures.length,
      firstFive: unexpectedFailures.slice(0, 5),
    }).toStrictEqual({ count: 0, firstFive: [] });
    expect(matched).toBe(total);
  },
);
