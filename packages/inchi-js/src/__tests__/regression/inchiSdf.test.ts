import { join } from 'node:path';

import { expect, test } from 'vitest';

import { inchiFromMolfile } from '../../inchiFromMolfile.ts';
import { inchikeyFromInchi } from '../../inchikeyFromInchi.ts';
import { loadReferenceMap } from '../helpers/loadSqliteReference.ts';
import {
  extractMolfile,
  getMolfileId,
  iterateSdfRecords,
} from '../helpers/sdfUtils.ts';

/*
 * Full regression of the upstream IUPAC `inchi.sdf` corpus
 * (`INCHI-1-TEST/tests/test_library/data/ci/inchi.sdf.gz` — 2,190
 * structures) against the reference InChI/InChIKey/AuxInfo strings
 * stored in the matching SQLite snapshot.
 *
 * Mirrors `config_ci.py` in the upstream test suite: structures listed
 * in the `expected_failures` set are allowed to diverge — anything
 * else is a regression.
 */

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..', '..', '..');
const SDF_PATH = join(
  REPO_ROOT,
  'vendor/inchi/INCHI-1-TEST/tests/test_library/data/ci/inchi.sdf.gz',
);
const REF_PATH = join(
  REPO_ROOT,
  'vendor/inchi/INCHI-1-TEST/tests/test_library/data/ci/inchi.sdf.regression_reference.sqlite',
);

/** Structures the upstream suite flags as expected regressions. */
const EXPECTED_REGRESSION_FAILURES = new Set([
  'PUBCHEM_COMPOUND_CID-20733713',
  'PUBCHEM_COMPOUND_CID-166625356',
  'PUBCHEM_COMPOUND_CID-102182973',
  'PUBCHEM_COMPOUND_CID-92178689',
]);

test(
  'inchi.sdf regression: every structure matches the upstream reference',
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
      if (EXPECTED_REGRESSION_FAILURES.has(molfileId)) continue;
      unexpectedFailures.push({
        molfileId,
        expectedInchi: ref.inchi,
        actualInchi: result.inchi,
      });
    }

    expect(total).toBeGreaterThan(2000);
    expect(missingReference).toBe(0);
    expect(matched).toBeGreaterThan(
      total - EXPECTED_REGRESSION_FAILURES.size - 5,
    );
    expect({
      count: unexpectedFailures.length,
      firstFive: unexpectedFailures.slice(0, 5),
    }).toStrictEqual({ count: 0, firstFive: [] });
  },
);

test(
  'inchi.sdf regression: InChIKey matches the reference for the first 100 structures',
  { timeout: 60_000 },
  async () => {
    const reference = loadReferenceMap(REF_PATH);
    const failures: Array<{
      molfileId: string;
      expected: string;
      actual: string;
    }> = [];
    let checked = 0;

    for (const record of iterateSdfRecords(SDF_PATH)) {
      if (checked >= 100) break;
      const molfileId = getMolfileId(record);
      const ref = reference.get(molfileId);
      if (!ref || EXPECTED_REGRESSION_FAILURES.has(molfileId)) continue;
      // eslint-disable-next-line no-await-in-loop -- WASM call must be sequential
      const inchiResult = await inchiFromMolfile(extractMolfile(record));
      if (!inchiResult.inchi) continue;
      // eslint-disable-next-line no-await-in-loop -- WASM call must be sequential
      const keyResult = await inchikeyFromInchi(inchiResult.inchi);
      checked += 1;
      if (keyResult.inchikey !== ref.inchikey) {
        failures.push({
          molfileId,
          expected: ref.inchikey,
          actual: keyResult.inchikey,
        });
      }
    }

    expect(checked).toBeGreaterThan(0);
    expect(failures).toStrictEqual([]);
  },
);
