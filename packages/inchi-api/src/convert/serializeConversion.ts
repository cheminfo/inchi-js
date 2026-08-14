import { canAppendSmiles } from './canAppendSmiles.ts';
import {
  OUTPUT_MEDIA,
  outputFilename,
  resolveOutputFormat,
} from './formats.ts';
import { buildOutputTable } from './outputTable.ts';
import type {
  ConversionStats,
  EnrichedRow,
  InputFormat,
  OutputFormat,
  StructureColumnDetection,
  Table,
} from './types.ts';
import { MOLFILE_COLUMN } from './types.ts';
import { writeSdf } from './writeSdf.ts';
import { writeDelimited, writeXlsx } from './writeTable.ts';

/** Everything an enrichment produced, as {@link serializeConversion} reads it. */
export interface Conversion {
  /** The table read from the uploaded file. */
  table: Table;
  /** The per-record InChI results, in the original order. */
  rows: EnrichedRow[];
  /** Counters of the enrichment step. */
  stats: ConversionStats;
  /** Which column the structures were read from. */
  detection: StructureColumnDetection;
  /** Format of the uploaded file. */
  inputFormat: InputFormat;
}

/** Options of {@link serializeConversion}. */
export interface SerializeConversionOptions {
  /**
   * Format of the produced body; `same` mirrors the input format.
   * @default 'same'
   */
  output?: OutputFormat;
  /**
   * Name of the uploaded file, used to build the download name.
   * @default ''
   */
  filename?: string;
  /**
   * Whether the SMILES column is written. Ignored when the file already holds
   * SMILES — see {@link canAppendSmiles}.
   * @default false
   */
  smiles?: boolean;
  /**
   * Whether the InChI column is written.
   * @default true
   */
  inchi?: boolean;
  /**
   * Whether the InChIKey column is written.
   * @default true
   */
  inchikey?: boolean;
  /**
   * Whether the AuxInfo layer is written.
   * @default false
   */
  auxinfo?: boolean;
}

/** A conversion written out in one concrete format. */
export interface SerializedConversion {
  /** Format of `body`. */
  format: Exclude<OutputFormat, 'same'>;
  /** MIME type of `body`. */
  contentType: string;
  /** Suggested download name for `body`. */
  filename: string;
  /** The written file — text for CSV/TSV/SDF/JSON, bytes for XLSX. */
  body: string | Uint8Array;
  /** Records left out of an SDF output because they have no molfile. */
  skipped: number;
}

/**
 * Write an enriched table out in one of the supported formats.
 *
 * Split from `convertFile` so the same conversion can be written again in
 * another format without recomputing a single InChI.
 * @param conversion - The enriched table and its metadata.
 * @param options - Output format, file name, and which computed columns are written.
 * @returns The written file plus its media metadata.
 */
export async function serializeConversion(
  conversion: Conversion,
  options: SerializeConversionOptions = {},
): Promise<SerializedConversion> {
  const { table, rows, stats, detection, inputFormat } = conversion;
  const {
    output = 'same',
    filename = '',
    smiles = false,
    inchi = true,
    inchikey = true,
    auxinfo = false,
  } = options;
  const format = resolveOutputFormat(output, inputFormat);
  const withSmiles = smiles && canAppendSmiles(table.columns, detection);

  let skipped = 0;
  let body: string | Uint8Array;
  if (format === 'sdf') {
    const written = writeSdf(rows, {
      columns: table.columns,
      smiles: withSmiles,
      inchi,
      inchikey,
      auxinfo,
    });
    body = written.sdf;
    skipped = written.skipped;
  } else {
    const dropColumns = inputFormat === 'sdf' ? [MOLFILE_COLUMN] : [];
    const outputTable = buildOutputTable(table, rows, {
      dropColumns,
      smiles: withSmiles,
      inchi,
      inchikey,
      auxinfo,
    });
    body = await serializeTable(outputTable, format, detection, {
      ...stats,
      skipped,
    });
  }

  return {
    format,
    contentType: OUTPUT_MEDIA[format].contentType,
    filename: outputFilename(filename, format),
    body,
    skipped,
  };
}

async function serializeTable(
  table: Table,
  format: Exclude<OutputFormat, 'same' | 'sdf'>,
  detection: StructureColumnDetection,
  stats: ConversionStats & { skipped: number },
): Promise<string | Uint8Array> {
  if (format === 'csv') return writeDelimited(table, ',');
  if (format === 'tsv') return writeDelimited(table, '\t');
  if (format === 'xlsx') return writeXlsx(table);
  return JSON.stringify({ detection, stats, rows: table.rows });
}
