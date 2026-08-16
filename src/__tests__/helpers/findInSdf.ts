import { iterateSdfRecords } from './sdfUtils.ts';

/**
 * Find a Molfile by ID inside a gzipped SDF. Mirrors the upstream
 * `select_records_from_gzipped_sdf` helper used by the IUPAC test
 * suite, where the ID comes from the `> <ID>` data tag.
 * @param path - Absolute path to the gzipped SDF file.
 * @param molfileId - The `> <ID>` value to look up.
 * @returns The full SDF record (including data tags) or `undefined`.
 */
export function findSdfRecordById(
  path: string,
  molfileId: string,
): string | undefined {
  for (const record of iterateSdfRecords(path)) {
    if (extractRecordId(record) === molfileId) {
      return record;
    }
  }
  return undefined;
}

function extractRecordId(record: string): string {
  const match = /> <ID>\r?\n(?<id>.*?)\r?\n/.exec(record);
  return (match?.groups?.id ?? '').trim();
}
