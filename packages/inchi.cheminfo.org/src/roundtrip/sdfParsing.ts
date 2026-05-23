/**
 * Fetch and gunzip a gzipped SDF served at `/test-data/<filename>`.
 * @param url - The fully-qualified URL of the `.sdf.gz` resource.
 * @returns The decoded UTF-8 SDF text.
 */
export async function fetchGzippedSdf(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }
  const compressed = await response.arrayBuffer();
  const copy = new Uint8Array(compressed.byteLength);
  copy.set(new Uint8Array(compressed));
  const stream = new Blob([copy.buffer])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));
  const buffer = await new Response(stream).arrayBuffer();
  return new TextDecoder('utf-8').decode(buffer);
}

/**
 * Iterate every record in an SDF blob. Records that contain no
 * `M  END` marker are skipped (the file ends with one such empty
 * record after the trailing `$$$$`).
 * @param text - The full SDF blob.
 * @yields {string} The raw record text (no trailing `$$$$`).
 */
export function* iterateSdfRecords(text: string): Generator<string> {
  // Split on `$$$$` plus its trailing newline so the next record's
  // title line starts at the very beginning. The leading separator
  // newline otherwise pushes the V2000 counts line one row down and
  // breaks the InChI parser.
  for (const part of text.split(/\$\$\$\$\r?\n?/)) {
    if (!part.includes('M  END')) continue;
    yield part;
  }
}

/**
 * Extract the `molfile_id` used by the upstream IUPAC test corpus.
 * @param record - A single SDF record (no `$$$$` terminator).
 * @returns The id text, or an empty string when none is found.
 */
export function getMolfileId(record: string): string {
  const mculeMatch = /<Mcule_ID>(?<id>[\S\s]*?)>/.exec(record);
  if (mculeMatch?.groups?.id !== undefined) {
    return mculeMatch.groups.id.trim();
  }
  const lines = record.split(/\r?\n/);
  return (lines.at(-3) ?? '').trim();
}

/**
 * Slice out the V2000/V3000 Molfile portion of an SDF record
 * (everything up to and including the `M  END` line). The SDF data
 * fields that follow are dropped so we hand a clean Molfile to the
 * InChI engine.
 * @param record - The full SDF record text.
 * @returns Just the Molfile.
 */
export function extractMolfile(record: string): string {
  const lines = record.split(/\r?\n/);
  const endIndex = lines.findIndex((line) => line.startsWith('M  END'));
  if (endIndex === -1) return record;
  return `${lines.slice(0, endIndex + 1).join('\n')}\n`;
}
