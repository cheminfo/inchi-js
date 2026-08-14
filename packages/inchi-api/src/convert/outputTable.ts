import type { CellValue, EnrichedRow, Table } from './types.ts';
import {
  AUXINFO_COLUMN,
  INCHIKEY_COLUMN,
  INCHI_COLUMN,
  SMILES_COLUMN,
} from './types.ts';

/** Options of {@link buildOutputTable}. */
export interface OutputTableOptions {
  /** Columns of the input table to leave out of the output. */
  dropColumns?: string[];
  /**
   * Whether the SMILES column is appended.
   * @default false
   */
  smiles?: boolean;
  /**
   * Whether the InChI column is appended.
   * @default true
   */
  inchi?: boolean;
  /**
   * Whether the InChIKey column is appended.
   * @default true
   */
  inchikey?: boolean;
  /**
   * Whether the AuxInfo column is appended.
   * @default false
   */
  auxinfo?: boolean;
}

/**
 * Build the output table: every input column (minus the dropped ones) followed
 * by the requested computed ones — `SMILES`, then `InChI` and `InChIKey`, then
 * `InChI_AuxInfo`.
 *
 * The per-record message is never written: it belongs to the run, not to the
 * data, and the file holds exactly the selected extra columns.
 * @param table - The table read from the uploaded file.
 * @param enriched - The per-record InChI results.
 * @param options - Columns to drop and which computed columns are kept.
 * @returns The table to serialize.
 */
export function buildOutputTable(
  table: Table,
  enriched: EnrichedRow[],
  options: OutputTableOptions = {},
): Table {
  const {
    dropColumns = [],
    smiles = false,
    inchi = true,
    inchikey = true,
    auxinfo = false,
  } = options;
  const dropped = new Set(dropColumns);
  const kept = table.columns.filter((column) => !dropped.has(column));

  const columns = [...kept];
  if (smiles) columns.push(SMILES_COLUMN);
  if (inchi) columns.push(INCHI_COLUMN);
  if (inchikey) columns.push(INCHIKEY_COLUMN);
  if (auxinfo) columns.push(AUXINFO_COLUMN);

  const rows: Array<Record<string, CellValue>> = [];
  for (const row of enriched) {
    const record: Record<string, CellValue> = {};
    for (const column of kept) {
      record[column] = row.data[column] ?? '';
    }
    if (smiles) record[SMILES_COLUMN] = row.smiles;
    if (inchi) record[INCHI_COLUMN] = row.inchi;
    if (inchikey) record[INCHIKEY_COLUMN] = row.inchikey;
    if (auxinfo) record[AUXINFO_COLUMN] = row.auxinfo;
    rows.push(record);
  }
  return { columns, rows };
}
