/// <reference lib="webworker" />

import type {
  Conversion,
  ConvertStats,
  EnrichedRow,
  OutputFormat,
  StructureColumnDetection,
  Table,
} from 'inchi-api/convert';
import {
  AUXINFO_COLUMN,
  INCHIKEY_COLUMN,
  INCHI_COLUMN,
  MESSAGE_COLUMN,
  SMILES_COLUMN,
  convertFile,
  detectInputFormat,
  detectStructureColumn,
  readSdf,
  readTable,
  serializeConversion,
} from 'inchi-api/convert';

import { messageOf } from '../messageOf.ts';

import type {
  AppendedColumns,
  ConvertRequest,
  DetectRequest,
  FilePreview,
  ReformatRequest,
  WorkerInbound,
  WorkerOutbound,
} from './protocol.ts';
import { CELL_LIMIT, PREVIEW_ROW_LIMIT, STRUCTURE_BUDGET } from './protocol.ts';

// eslint-disable-next-line no-restricted-globals, no-undef -- `self` is the worker global; DedicatedWorkerGlobalScope is the standard type
const scope = self as unknown as DedicatedWorkerGlobalScope;

function post(message: WorkerOutbound, transfer: Transferable[] = []): void {
  scope.postMessage(message, transfer);
}

/** A conversion written out, in the shape {@link postConverted} needs. */
interface WrittenFile {
  filename: string;
  contentType: string;
  format: Exclude<OutputFormat, 'same'>;
  body: string | Uint8Array;
}

/** Which computed columns a conversion appends. */
interface AppendedSelection {
  smiles: boolean;
  inchi: boolean;
  inchikey: boolean;
  auxinfo: boolean;
}

/**
 * The conversion this worker last ran, kept so another output format can be
 * written from it without recomputing a single InChI.
 */
let lastConversion:
  | (Conversion & {
      /** Name of the uploaded file, the download name is derived from. */
      filename: string;
      selection: AppendedSelection;
      appended: AppendedColumns;
    })
  | null = null;

scope.addEventListener('message', (event: MessageEvent<WorkerInbound>) => {
  const data = event.data;
  let run: Promise<void>;
  if (data.type === 'detect') {
    run = detect(data);
  } else if (data.type === 'convert') {
    run = convert(data);
  } else {
    run = reformat(data);
  }
  run.catch((error: unknown) => {
    post({ type: 'error', message: messageOf(error) });
  });
});

async function detect(request: DetectRequest): Promise<void> {
  const content = new Uint8Array(request.bytes);
  const format = detectInputFormat(request.filename, content);
  const table =
    format === 'sdf' ? readSdf(content) : await readTable(content, format);
  const detection = detectStructureColumn(table, { column: request.column });
  const preview: FilePreview = {
    format,
    columns: table.columns,
    rowCount: table.rows.length,
    detection,
    rows: previewRows(table),
    truncated: table.rows.length > PREVIEW_ROW_LIMIT,
    structures: previewStructures(table, detection.column),
  };
  post({ type: 'preview', preview });
}

async function convert(request: ConvertRequest): Promise<void> {
  const selection: AppendedSelection = {
    smiles: request.smiles,
    inchi: request.inchi,
    inchikey: request.inchikey,
    auxinfo: request.auxinfo,
  };
  const result = await convertFile(new Uint8Array(request.bytes), {
    filename: request.filename,
    output: request.output,
    column: request.column,
    inchiOptions: request.inchiOptions,
    ...selection,
    onProgress: (done, total) => {
      post({ type: 'progress', done, total });
    },
  });
  lastConversion = {
    table: result.table,
    rows: result.rows,
    stats: result.stats,
    detection: result.detection,
    inputFormat: result.inputFormat,
    filename: request.filename,
    selection,
    appended: appendedColumns(result.rows),
  };
  postConverted(
    result,
    result.detection,
    result.stats,
    lastConversion.appended,
  );
}

async function reformat(request: ReformatRequest): Promise<void> {
  const conversion = lastConversion;
  if (!conversion) {
    throw new Error('no conversion to write out — convert a file first');
  }
  // The selection travels with the request: turning a column on or off writes
  // the file again from the InChIs already computed.
  conversion.selection = {
    smiles: request.smiles,
    inchi: request.inchi,
    inchikey: request.inchikey,
    auxinfo: request.auxinfo,
  };
  const written = await serializeConversion(conversion, {
    output: request.output,
    filename: conversion.filename,
    ...conversion.selection,
  });
  postConverted(
    written,
    conversion.detection,
    { ...conversion.stats, skipped: written.skipped },
    conversion.appended,
  );
}

function postConverted(
  written: WrittenFile,
  detection: StructureColumnDetection,
  stats: ConvertStats,
  appended: AppendedColumns,
): void {
  const body =
    typeof written.body === 'string'
      ? written.body
      : // Detach the bytes so the transfer below is zero-copy.
        written.body.slice().buffer;
  post(
    {
      type: 'converted',
      filename: written.filename,
      contentType: written.contentType,
      format: written.format,
      detection,
      stats,
      body,
      appended,
    },
    typeof body === 'string' ? [] : [body],
  );
}

function previewRows(table: Table): string[][] {
  const limit = Math.min(table.rows.length, PREVIEW_ROW_LIMIT);
  const rows: string[][] = new Array(limit);
  for (let index = 0; index < limit; index++) {
    const row = table.rows[index];
    const values: string[] = new Array(table.columns.length);
    for (let column = 0; column < table.columns.length; column++) {
      values[column] = clip(
        String(row?.[table.columns[column] as string] ?? ''),
      );
    }
    rows[index] = values;
  }
  return rows;
}

/**
 * Keep the structure of every record, unclipped, so the table can draw it.
 *
 * The values are the only ones the preview needs in full, and they are also
 * the largest, so they are collected apart from the rows and stop as soon as
 * {@link STRUCTURE_BUDGET} characters have been kept.
 * @param table - The loaded file.
 * @param column - Name of the detected structure column.
 * @returns The structures of the leading records, in file order.
 */
function previewStructures(table: Table, column: string): string[] {
  const limit = Math.min(table.rows.length, PREVIEW_ROW_LIMIT);
  const structures: string[] = [];
  let budget = STRUCTURE_BUDGET;
  for (let index = 0; index < limit; index++) {
    const value = String(table.rows[index]?.[column] ?? '');
    if (value.length > budget) break;
    budget -= value.length;
    structures.push(value);
  }
  return structures;
}

/**
 * Every computed column, whatever the user chose to keep.
 *
 * The SMILES, InChI, InChIKey and AuxInfo are all computed, so the table is
 * handed every one and the selection only decides which are drawn and written —
 * turning one back on therefore costs no recomputation.
 * @param enriched - The per-record results.
 * @returns The computed columns, aligned with the preview rows.
 */
function appendedColumns(enriched: EnrichedRow[]): AppendedColumns {
  const columns = [
    SMILES_COLUMN,
    INCHI_COLUMN,
    INCHIKEY_COLUMN,
    AUXINFO_COLUMN,
    MESSAGE_COLUMN,
  ];

  const limit = Math.min(enriched.length, PREVIEW_ROW_LIMIT);
  const rows: string[][] = new Array(limit);
  for (let index = 0; index < limit; index++) {
    const row = enriched[index];
    if (!row) continue;
    rows[index] = [
      clip(row.smiles),
      clip(row.inchi),
      clip(row.inchikey),
      clip(row.auxinfo),
      clip(row.message),
    ];
  }
  return { columns, rows };
}

function clip(value: string): string {
  return value.length > CELL_LIMIT ? `${value.slice(0, CELL_LIMIT)}…` : value;
}
