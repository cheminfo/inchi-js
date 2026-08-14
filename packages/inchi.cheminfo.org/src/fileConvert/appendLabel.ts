import {
  AUXINFO_COLUMN,
  INCHIKEY_COLUMN,
  INCHI_COLUMN,
  SMILES_COLUMN,
} from 'inchi-api/convert';

import type { AppendedSelection } from './useFileConvert.ts';

/**
 * Name the columns a conversion would append, as a readable enumeration.
 * @param selection - The columns the user kept.
 * @returns `'InChI and InChIKey'`, or an empty string when nothing is selected.
 */
export function appendLabel(selection: AppendedSelection): string {
  const names: string[] = [];
  if (selection.smiles) names.push(SMILES_COLUMN);
  if (selection.inchi) names.push(INCHI_COLUMN);
  if (selection.inchikey) names.push(INCHIKEY_COLUMN);
  if (selection.auxinfo) names.push(AUXINFO_COLUMN);
  if (names.length < 2) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1) as string}`;
}
