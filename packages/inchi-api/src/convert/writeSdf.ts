import { create } from 'sdf-creator';

import type { EnrichedRow } from './types.ts';
import {
  AUXINFO_COLUMN,
  INCHIKEY_COLUMN,
  INCHI_COLUMN,
  MOLFILE_COLUMN,
  SMILES_COLUMN,
} from './types.ts';

/** Options of {@link writeSdf}. */
export interface WriteSdfOptions {
  /** Ordered data fields to carry over from the input record. */
  columns: string[];
  /**
   * Whether the SMILES data field is written.
   * @default false
   */
  smiles?: boolean;
  /**
   * Whether the InChI data field is written.
   * @default true
   */
  inchi?: boolean;
  /**
   * Whether the InChIKey data field is written.
   * @default true
   */
  inchikey?: boolean;
  /**
   * Whether the AuxInfo data field is written.
   * @default false
   */
  auxinfo?: boolean;
}

/** Result of {@link writeSdf}. */
export interface WriteSdfResult {
  /** The generated SDF text. */
  sdf: string;
  /** Number of records left out because no molfile could be produced. */
  skipped: number;
}

/**
 * Serialize enriched records as an SDF, one entry per record, with the
 * requested InChI and InChIKey written as `> <InChI>` data fields.
 *
 * Records whose structure could not be turned into a molfile — an invalid
 * SMILES, an empty cell — carry no connection table and are left out.
 * @param enriched - The per-record InChI results.
 * @param options - Data fields to carry over and which computed fields are written.
 * @returns The SDF text and the number of skipped records.
 */
export function writeSdf(
  enriched: EnrichedRow[],
  options: WriteSdfOptions,
): WriteSdfResult {
  const {
    columns,
    smiles = false,
    inchi = true,
    inchikey = true,
    auxinfo = false,
  } = options;
  const molecules: Array<Record<string, string>> = [];
  let skipped = 0;

  for (const row of enriched) {
    if (!row.molfile) {
      skipped++;
      continue;
    }
    const molecule: Record<string, string> = { [MOLFILE_COLUMN]: row.molfile };
    for (const column of columns) {
      if (column === MOLFILE_COLUMN) continue;
      const value = row.data[column];
      if (value === null || value === undefined) continue;
      const text = String(value);
      if (!text) continue;
      molecule[column] = text;
    }
    if (smiles) molecule[SMILES_COLUMN] = row.smiles;
    if (inchi) molecule[INCHI_COLUMN] = row.inchi;
    if (inchikey) molecule[INCHIKEY_COLUMN] = row.inchikey;
    if (auxinfo && row.auxinfo) molecule[AUXINFO_COLUMN] = row.auxinfo;
    molecules.push(molecule);
  }

  return { sdf: create(molecules).sdf, skipped };
}
