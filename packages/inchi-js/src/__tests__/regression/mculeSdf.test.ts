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
 * commercially-available structures from mcule.com) against:
 *
 * 1. the reference InChI/InChIKey/AuxInfo strings stored in the
 *    matching SQLite snapshot (strict — every record must match),
 * 2. a committed snapshot of the InChI we currently produce for every
 *    record, so any drift in our own output is caught immediately.
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
const SNAPSHOT_PATH = join(
  import.meta.dirname,
  '__snapshots__',
  'mcule.sdf.tsv',
);

test(
  'mcule.sdf regression: every structure matches the upstream reference and our committed snapshot',
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

    await expect(serializeSnapshot(snapshotRows)).toMatchFileSnapshot(
      SNAPSHOT_PATH,
    );
  },
);

/**
 * Serialise the [molfileId, inchi] pairs as a sorted TSV blob. Sorting
 * by id keeps git diffs minimal — when a single record's InChI changes
 * only that line moves, the surrounding 1,999 stay anchored.
 * @param rows - Collected `[molfileId, inchi]` pairs.
 * @returns The TSV blob to feed to `toMatchFileSnapshot`.
 */
function serializeSnapshot(rows: Array<[string, string]>): string {
  const sorted = rows.toSorted(([a], [b]) => a.localeCompare(b));
  return `${sorted.map(([id, inchi]) => `${id}\t${inchi}`).join('\n')}\n`;
}
