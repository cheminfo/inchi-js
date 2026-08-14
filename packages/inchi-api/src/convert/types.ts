/** A cell value as read from a spreadsheet, CSV/TSV file, or SDF data field. */
export type CellValue = string | number | boolean | null;

/** Kind of chemical structure held by the detected column. */
export type StructureKind = 'smiles' | 'molfile';

/** File format accepted by the conversion endpoints. */
export type InputFormat = 'csv' | 'tsv' | 'xlsx' | 'sdf';

/** File format produced by the conversion endpoints. */
export type OutputFormat = InputFormat | 'json' | 'same';

/** Column name holding the molfile of an SDF record. */
export const MOLFILE_COLUMN = 'molfile';

/**
 * Data field / column appended with the SMILES derived from the structure.
 * Only offered when the file carries molfiles and no SMILES column of its own.
 */
export const SMILES_COLUMN = 'SMILES';

/** Data field / column appended with the computed InChI. */
export const INCHI_COLUMN = 'InChI';

/** Data field / column appended with the computed InChIKey. */
export const INCHIKEY_COLUMN = 'InChIKey';

/** Data field / column appended with the InChI AuxInfo, when requested. */
export const AUXINFO_COLUMN = 'InChI_AuxInfo';

/**
 * Column holding the reason a record did not convert cleanly. It is never
 * written to an output file — it names the column the preview table shows it in.
 */
export const MESSAGE_COLUMN = 'InChI_Message';

/** A table of records, all sharing the same ordered list of columns. */
export interface Table {
  /** Ordered column names. */
  columns: string[];
  /** One entry per record, keyed by column name. */
  rows: Array<Record<string, CellValue>>;
}

/** Where the structure column comes from. */
export type DetectionReason = 'explicit' | 'sdf' | 'name' | 'content';

/** Outcome of the structure-column detection. */
export interface StructureColumnDetection {
  /** Name of the column holding the structures. */
  column: string;
  /** Whether the column holds SMILES or molfiles. */
  kind: StructureKind;
  /** Fraction (0–1) of the sampled values that parsed as `kind`. */
  confidence: number;
  /** How the column was chosen. */
  reason: DetectionReason;
}

/** Per-record result of the InChI computation. */
export interface EnrichedRow {
  /** The original record, unchanged. */
  data: Record<string, CellValue>;
  /** The molfile the InChI was computed from (empty when unavailable). */
  molfile: string;
  /** The SMILES of the structure (empty when it could not be derived). */
  smiles: string;
  /** The InChI string (empty on failure). */
  inchi: string;
  /** The InChIKey (empty on failure). */
  inchikey: string;
  /** The InChI AuxInfo (empty when not requested or on failure). */
  auxinfo: string;
  /** Warning or error message, empty when the record converted cleanly. */
  message: string;
}

/** Counters describing a conversion run. */
export interface ConversionStats {
  /** Number of records read from the input file. */
  total: number;
  /** Number of records that produced an InChI. */
  converted: number;
  /** Number of records that produced no InChI. */
  failed: number;
}
