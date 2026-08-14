import { create } from 'sdf-creator';
import type { Molecule, ParseResult } from 'sdf-parser';
import { parse } from 'sdf-parser';

import type { InchiComputation } from './sdfInchi.ts';

/** SDF data field that receives the computed InChI string. */
export const INCHI_FIELD = 'InChI';
/** SDF data field that receives the computed InChIKey. */
export const INCHIKEY_FIELD = 'InChIKey';

/**
 * Read and parse a user-selected SDF file. `.sdf.gz` files are
 * transparently decompressed with the standard `DecompressionStream`.
 * The raw bytes are handed to `sdf-parser`, which owns text decoding,
 * and dynamic typing is disabled so every field stays a string and
 * round-trips back out unchanged. `mixedEOL` is enabled so files that
 * mix `\r\n`, `\r` and `\n` line endings still split into every record
 * instead of collapsing to a single molecule.
 * @param file - The file chosen through the file input.
 * @returns The parsed SDF: molecules, labels and statistics.
 */
export async function parseSdfFile(file: File): Promise<ParseResult> {
  let buffer = await file.arrayBuffer();
  if (file.name.toLowerCase().endsWith('.gz')) {
    buffer = await gunzip(buffer);
  }
  return parse(buffer, { dynamicTyping: false, mixedEOL: true });
}

/**
 * Rebuild an SDF from parsed molecules, appending the computed InChI
 * and InChIKey as two new data fields on every record. Existing
 * fields and the original molfile are preserved verbatim.
 * @param molecules - The molecules returned by {@link parseSdfFile}.
 * @param computations - InChI computations aligned by index with `molecules`.
 * @returns The SDF text, ready to download.
 */
export function buildSdfWithInchi(
  molecules: Molecule[],
  computations: InchiComputation[],
): string {
  const records = molecules.map((molecule, index) => {
    const record: Record<string, string> = {};
    for (const [key, value] of Object.entries(molecule)) {
      if (value === undefined || value === null) continue;
      record[key] = String(value);
    }
    const computation = computations[index];
    if (computation?.inchi) record[INCHI_FIELD] = computation.inchi;
    if (computation?.inchikey) record[INCHIKEY_FIELD] = computation.inchikey;
    return record;
  });
  return create(records).sdf;
}

/**
 * Trigger a browser download of text content as a file.
 * @param text - The file content.
 * @param filename - The suggested download filename.
 */
export function downloadTextFile(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'chemical/x-mdl-sdfile' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function gunzip(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const stream = new Blob([buffer])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
}
