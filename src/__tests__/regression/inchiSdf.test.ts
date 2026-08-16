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
 * structures) against:
 *
 * 1. the reference InChI/InChIKey/AuxInfo strings stored in the matching
 *    SQLite snapshot (mirrors `config_ci.py` upstream — structures
 *    listed in `expected_failures` are allowed to diverge),
 * 2. a committed snapshot of the InChI we currently produce for every
 *    record, so any drift — even within the listed regressions — is
 *    caught on the next CI run.
 */

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const SDF_PATH = join(
  REPO_ROOT,
  'vendor/inchi/INCHI-1-TEST/tests/test_library/data/ci/inchi.sdf.gz',
);
const REF_PATH = join(
  REPO_ROOT,
  'vendor/inchi/INCHI-1-TEST/tests/test_library/data/ci/inchi.sdf.regression_reference.sqlite',
);
const SNAPSHOT_PATH = join(
  import.meta.dirname,
  '__snapshots__',
  'inchi.sdf.tsv',
);

/** Structures the upstream suite flags as expected regressions. */
const EXPECTED_REGRESSION_FAILURES = new Set([
  'PUBCHEM_COMPOUND_CID-20733713',
  'PUBCHEM_COMPOUND_CID-166625356',
  'PUBCHEM_COMPOUND_CID-102182973',
  'PUBCHEM_COMPOUND_CID-92178689',
]);

test(
  'inchi.sdf regression: every structure matches the upstream reference and our committed snapshot',
  { timeout: 120_000 },
  async () => {
    const reference = loadReferenceMap(REF_PATH);
    const unexpectedFailures: Array<{
      molfileId: string;
      expectedInchi: string;
      actualInchi: string;
    }> = [];
    const snapshotRows: Array<[string, string]> = [];
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
      snapshotRows.push([molfileId, result.inchi]);
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

    await expect(serializeSnapshot(snapshotRows)).toMatchFileSnapshot(
      SNAPSHOT_PATH,
    );
  },
);

/**
 * Serialise the [molfileId, inchi] pairs as a sorted TSV blob. Sorting
 * by id keeps git diffs minimal — when a single record's InChI changes
 * only that line moves, the surrounding 2,189 stay anchored.
 * @param rows - Collected `[molfileId, inchi]` pairs.
 * @returns The TSV blob to feed to `toMatchFileSnapshot`.
 */
function serializeSnapshot(rows: Array<[string, string]>): string {
  const sorted = rows.toSorted(([a], [b]) => a.localeCompare(b));
  return `${sorted.map(([id, inchi]) => `${id}\t${inchi}`).join('\n')}\n`;
}

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
