import type { IteratorMolecule } from 'sdf-parser';
import { iterator } from 'sdf-parser';

/**
 * Stream a gzipped SDF resource and yield each parsed molecule. The
 * response body is piped through `DecompressionStream('gzip')`,
 * decoded to text, and handed to `sdf-parser`'s async iterator — the
 * full uncompressed SDF text never materialises in memory.
 * @param url - The fully-qualified URL of the `.sdf.gz` resource.
 * @yields {IteratorMolecule} One parsed molecule per SDF record, with
 *   `.molfile` and any `> <Field>` data fields exposed as properties.
 */
export async function* streamSdfMolecules(
  url: string,
): AsyncGenerator<IteratorMolecule> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }
  if (!response.body) {
    throw new Error(`Empty response body for ${url}`);
  }
  const textStream = response.body
    .pipeThrough(new DecompressionStream('gzip'))
    .pipeThrough(new TextDecoderStream());
  yield* iterator(textStream);
}

const ID_TAGS = ['ID', 'Mcule_ID', 'PUBCHEM_CID', 'CAS', 'Name'];

/**
 * Extract the identifier for a parsed SDF molecule.
 *
 * Lookup order:
 *
 * 1. A known ID-bearing SDF data field — `ID`, `Mcule_ID`,
 *    `PUBCHEM_CID`, `CAS`, or `Name` (matched case-sensitively as
 *    sdf-parser exposes them).
 * 2. The molfile title line (V2000 line 1). Catches CCDC refcodes
 *    (`SOWFAL`, `CHPMOB`, …) and PubChem CIDs that the upstream SDFs
 *    put there instead of a tagged field.
 * 3. Empty string. The caller then falls back to `record-N`.
 * @param molecule - A molecule object yielded by sdf-parser.
 * @returns The id text, or an empty string when none is found.
 */
export function getMolfileId(molecule: IteratorMolecule): string {
  for (const tag of ID_TAGS) {
    const raw = molecule[tag];
    if (raw === undefined || raw === null) continue;
    const value = String(raw).trim();
    if (value) return value;
  }
  const titleLine = molecule.molfile.split(/\r?\n/, 1)[0];
  return titleLine?.trim() ?? '';
}
