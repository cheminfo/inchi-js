import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

/**
 * Read a `.sdf.gz` file and yield each record (everything between
 * `$$$$` separators). Records with no `M  END` line are skipped — the
 * file ends with one such empty record after the trailing separator.
 * @param path - Absolute path to the gzipped SDF file.
 * @yields {string} Each non-empty SDF record (as raw text).
 */
export function* iterateSdfRecords(path: string): Generator<string> {
  const buffer = readFileSync(path);
  const text = gunzipSync(buffer).toString('utf8');
  // Split on the full record separator (`$$$$` plus its trailing
  // newline) so the next record's title line starts at the very
  // beginning. Without this, the leading newline of the separator
  // would be folded into the next record, pushing the V2000 counts
  // line one position down and breaking parsing.
  for (const part of text.split(/\$\$\$\$\r?\n?/)) {
    if (!part.includes('M  END')) continue;
    yield part;
  }
}

/**
 * Extract the molfile_id used by the upstream IUPAC test corpus.
 *
 * - mcule dataset: `> <Mcule_ID>` SDF data tag.
 * - Legacy InChI dataset: `> <ID>` data tag (extracted via the upstream
 *   convention `splitlines()[-3].strip()`).
 * @param record - One full SDF record (no `$$$$` terminator).
 * @returns The molfile_id, or an empty string when none is found.
 */
export function getMolfileId(record: string): string {
  const mculeMatch = /<Mcule_ID>(?<id>[\S\s]*?)>/.exec(record);
  if (mculeMatch?.groups?.id !== undefined) {
    return mculeMatch.groups.id.trim();
  }
  // Upstream convention from config_ci.py:
  //   molfile_id = molfile.splitlines()[-3].strip()
  // The record ends in two trailing `\r\n`, so splitting yields
  // [..., '>  <ID>', '<id-value>', '', '']. Index `-3` picks the
  // `<id-value>` line.
  const lines = record.split(/\r?\n/);
  return (lines.at(-3) ?? '').trim();
}

/**
 * Extract just the V2000/V3000 Molfile portion (everything up to and
 * including the `M  END` line). The SDF data fields following `M  END`
 * are dropped so we can hand a clean molfile to the InChI engine.
 * @param record - Full SDF record text.
 * @returns The molfile portion.
 */
export function extractMolfile(record: string): string {
  const lines = record.split(/\r?\n/);
  const endIndex = lines.findIndex((line) => line.startsWith('M  END'));
  if (endIndex === -1) return record;
  return `${lines.slice(0, endIndex + 1).join('\n')}\n`;
}
