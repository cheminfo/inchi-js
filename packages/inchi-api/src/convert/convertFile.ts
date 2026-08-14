import { detectStructureColumn } from './detectStructureColumn.ts';
import { enrichTable } from './enrichTable.ts';
import { asConversion } from './errors.ts';
import { detectInputFormat } from './formats.ts';
import { readSdf } from './readSdf.ts';
import { readTable } from './readTable.ts';
import { serializeConversion } from './serializeConversion.ts';
import type {
  ConversionStats,
  EnrichedRow,
  InputFormat,
  OutputFormat,
  StructureColumnDetection,
  StructureKind,
  Table,
} from './types.ts';

/** Options of {@link convertFile}. */
export interface ConvertFileOptions {
  /**
   * Name of the uploaded file, used to detect the input format.
   * @default ''
   */
  filename?: string;
  /**
   * Format of the returned file; `same` mirrors the input format.
   * @default 'same'
   */
  output?: OutputFormat;
  /** Structure column to read; auto-detected when omitted. */
  column?: string;
  /** Kind of the structure column; auto-detected when omitted. */
  kind?: StructureKind;
  /**
   * Raw InChI option string forwarded to the C API.
   * @default ''
   */
  inchiOptions?: string;
  /**
   * Whether a SMILES column derived from the structure is written to the
   * output. Only honoured when the file holds molfiles and carries no SMILES
   * column of its own.
   * @default false
   */
  smiles?: boolean;
  /**
   * Whether the InChI column is written to the output. The InChI is computed
   * either way — this only selects what the file carries.
   * @default true
   */
  inchi?: boolean;
  /**
   * Whether the InChIKey column is written to the output. Computed either way.
   * @default true
   */
  inchikey?: boolean;
  /**
   * Whether the AuxInfo column is written to the output. Computed either way.
   * @default false
   */
  auxinfo?: boolean;
  /**
   * Called as records are converted, so a caller can drive a progress bar.
   * @default undefined
   */
  onProgress?: (done: number, total: number) => void;
}

/** Conversion counters, including the records left out of an SDF output. */
export interface ConvertStats extends ConversionStats {
  /** Records left out of an SDF output because they have no molfile. */
  skipped: number;
}

/** Result of {@link convertFile}. */
export interface ConvertFileResult {
  /** Format of the returned body. */
  format: Exclude<OutputFormat, 'same'>;
  /** Format of the uploaded file. */
  inputFormat: InputFormat;
  /** MIME type of the returned body. */
  contentType: string;
  /** Suggested download name for the returned body. */
  filename: string;
  /** The converted file — text for CSV/TSV/SDF/JSON, bytes for XLSX. */
  body: string | Uint8Array;
  /** Which column the structures were read from. */
  detection: StructureColumnDetection;
  /** Conversion counters. */
  stats: ConvertStats;
  /**
   * Per-record results, in the original order. Handed back so a caller can
   * display them without re-parsing `body`; the HTTP routes ignore them.
   */
  rows: EnrichedRow[];
  /**
   * The table read from the uploaded file. Handed back with `rows` so a caller
   * can write the same conversion out again in another format through
   * {@link serializeConversion}; the HTTP routes ignore it.
   */
  table: Table;
}

/**
 * Convert an uploaded CSV, TSV, XLSX, or SDF file into the same format — or
 * into any other supported one — with the InChI and/or InChIKey of every record
 * appended.
 *
 * The structure column is detected automatically (`molfile` for an SDF, a
 * SMILES or molfile column otherwise) unless `column` pins it explicitly.
 * @param content - Raw bytes of the uploaded file.
 * @param options - Output format, column overrides, appended columns, and InChI options.
 * @returns The converted file plus the detection and conversion metadata.
 * @throws {Error} When the format, the header, or the structure column cannot be resolved.
 */
export async function convertFile(
  content: Uint8Array,
  options: ConvertFileOptions = {},
): Promise<ConvertFileResult> {
  const {
    filename = '',
    output = 'same',
    column,
    kind,
    inchiOptions,
    smiles = false,
    inchi = true,
    inchikey = true,
    auxinfo = false,
    onProgress,
  } = options;
  const inputFormat = await asConversion(() =>
    detectInputFormat(filename, content),
  );
  const table = await asConversion(() =>
    inputFormat === 'sdf' ? readSdf(content) : readTable(content, inputFormat),
  );
  const detection = detectStructureColumn(table, { column, kind });

  const { rows, stats } = await enrichTable(table, detection, {
    inchiOptions,
    onProgress,
  });
  const written = await serializeConversion(
    { table, rows, stats, detection, inputFormat },
    { output, filename, smiles, inchi, inchikey, auxinfo },
  );

  return {
    format: written.format,
    inputFormat,
    contentType: written.contentType,
    filename: written.filename,
    body: written.body,
    detection,
    stats: { ...stats, skipped: written.skipped },
    rows,
    table,
  };
}
