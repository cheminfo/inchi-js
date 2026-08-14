import type {
  ConvertStats,
  InputFormat,
  OutputFormat,
  StructureColumnDetection,
} from 'inchi-api/convert';

/**
 * Longest cell value kept for the preview. A single SDF molfile is several
 * kilobytes, so a file with 100 000 records would otherwise hold hundreds of
 * megabytes of text the table can never show anyway.
 */
export const CELL_LIMIT = 300;

/**
 * Most records kept for the preview. The conversion itself is never capped —
 * only what the table is handed, and the panel says so when it bites.
 */
export const PREVIEW_ROW_LIMIT = 200_000;

/**
 * Total characters of structure text kept so the table can draw the molecules.
 * A drug-like molfile is a few kilobytes, so keeping every one of a large SDF
 * would hold gigabytes for a column of which twenty rows are ever on screen.
 */
export const STRUCTURE_BUDGET = 16_000_000;

/** Ask the worker which column of a file holds the structures. */
export interface DetectRequest {
  type: 'detect';
  /** Raw file bytes, transferred to the worker. */
  bytes: ArrayBuffer;
  filename: string;
  /** Structure column to force; auto-detected when omitted. */
  column?: string;
}

/** Ask the worker to append the InChI columns to a file. */
export interface ConvertRequest {
  type: 'convert';
  bytes: ArrayBuffer;
  filename: string;
  output: OutputFormat;
  column?: string;
  inchiOptions: string;
  /** Whether the `SMILES` column is appended. */
  smiles: boolean;
  /** Whether the `InChI` column is appended. */
  inchi: boolean;
  /** Whether the `InChIKey` column is appended. */
  inchikey: boolean;
  auxinfo: boolean;
}

/**
 * Ask the worker to write the conversion it just ran out in another format.
 * The InChI of every record is reused — nothing is computed again.
 */
export interface ReformatRequest {
  type: 'reformat';
  output: Exclude<OutputFormat, 'same'>;
  /** Whether the `SMILES` column is written. */
  smiles: boolean;
  /** Whether the `InChI` column is written. */
  inchi: boolean;
  /** Whether the `InChIKey` column is written. */
  inchikey: boolean;
  /** Whether the AuxInfo column is written. */
  auxinfo: boolean;
}

/** Everything the main thread can send the conversion worker. */
export type WorkerInbound = DetectRequest | ConvertRequest | ReformatRequest;

/** The loaded file, as the preview table renders it. */
export interface FilePreview {
  /** Detected format of the uploaded file. */
  format: InputFormat;
  /** Ordered column names — the SDF data fields for an SDF. */
  columns: string[];
  /** Number of records in the file. */
  rowCount: number;
  /** Which column the structures were found in. */
  detection: StructureColumnDetection;
  /**
   * Every record, as a positional array aligned with `columns`, each value
   * clipped to {@link CELL_LIMIT}. Capped at {@link PREVIEW_ROW_LIMIT} rows.
   */
  rows: string[][];
  /** Whether `rows` stops short of `rowCount`. */
  truncated: boolean;
  /**
   * Unclipped value of the structure column, one per record, so the table can
   * draw the molecule. Stops at {@link STRUCTURE_BUDGET} characters, so it is
   * often shorter than `rows` and records past its end are drawn as unknown.
   */
  structures: string[];
}

/** The InChI columns a conversion appends, aligned with the preview rows. */
export interface AppendedColumns {
  /** Names of the appended columns, in order. */
  columns: string[];
  /** One positional array per record, aligned with `columns`. */
  rows: string[][];
}

/** The converted file, ready to be handed to the browser as a download. */
export interface ConvertedFile {
  type: 'converted';
  /** Suggested download name. */
  filename: string;
  /** MIME type of `body`. */
  contentType: string;
  /** Concrete format of `body`. */
  format: Exclude<OutputFormat, 'same'>;
  detection: StructureColumnDetection;
  stats: ConvertStats;
  /** Text for CSV/TSV/SDF/JSON, bytes for XLSX. */
  body: string | ArrayBuffer;
  /** The computed columns, so the preview table can show the result. */
  appended: AppendedColumns;
}

/** Everything the conversion worker can send back. */
export type WorkerOutbound =
  | { type: 'preview'; preview: FilePreview }
  | { type: 'progress'; done: number; total: number }
  | ConvertedFile
  | { type: 'error'; message: string };
