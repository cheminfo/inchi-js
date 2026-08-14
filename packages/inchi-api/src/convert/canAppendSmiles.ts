import type { StructureColumnDetection } from './types.ts';
import { SMILES_COLUMN } from './types.ts';

/**
 * Whether a SMILES column is worth appending to a file.
 *
 * It only is when the structures are molfiles — an SDF, or a molfile column of
 * a spreadsheet — and the file carries no SMILES column of its own, whatever
 * its case. A file whose structures already are SMILES would only get a copy.
 * @param columns - Columns of the uploaded file.
 * @param detection - The structure column, as detected or forced.
 * @returns `true` when the SMILES column can be appended.
 */
export function canAppendSmiles(
  columns: string[],
  detection: StructureColumnDetection,
): boolean {
  if (detection.kind !== 'molfile') return false;
  const wanted = SMILES_COLUMN.toLowerCase();
  for (const column of columns) {
    if (column.toLowerCase() === wanted) return false;
  }
  return true;
}
