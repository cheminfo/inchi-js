import {
  INCHIKEY_COLUMN,
  INCHI_COLUMN,
  MESSAGE_COLUMN,
} from 'inchi-api/convert';

import type { AppendedColumns, FilePreview } from './protocol.ts';

/** Outcome of the InChI computation for one record. */
export type RowStatus = 'ok' | 'warning' | 'error';

/** A table view combining the loaded file with the computed InChI columns. */
export interface PreviewModel {
  /**
   * Ordered column names: the structure column, then the computed ones, then
   * the rest of the file.
   */
  columns: string[];
  /** Number of records the table can show. */
  rowCount: number;
  /** Names of the appended columns, for styling. */
  computedColumns: ReadonlySet<string>;
  /** Value of one cell. */
  getCell: (row: number, column: number) => string;
  /** Structure of one record, `null` when it was not kept for the preview. */
  getStructure: (row: number) => string | null;
  /**
   * Outcome of one record, `null` until a conversion has run — a record that
   * produced no InChI is an `error`, one that produced a message with it a
   * `warning`.
   */
  statusOf: ((row: number) => RowStatus) | null;
}

/**
 * Build the table view of a loaded file, with the conversion result appended
 * when there is one.
 *
 * The structure leads, followed by what was computed from it, so a record reads
 * left to right as structure → InChI → InChIKey → AuxInfo → message; the other
 * columns of the file follow. The two row sets are read through one accessor
 * instead of being merged, so showing the result of a 200 000-record file
 * allocates nothing.
 * @param preview - The loaded file as returned by the worker.
 * @param appended - The computed columns, once a conversion has run.
 * @returns The columns, the row count, and the cell and status accessors.
 */
export function buildPreviewModel(
  preview: FilePreview,
  appended: AppendedColumns | null,
): PreviewModel {
  const base = preview.columns;
  const extra = appended?.columns ?? [];
  const sources = columnSources(base, extra, preview.detection.column);
  const columns: string[] = new Array(sources.length);
  for (let index = 0; index < sources.length; index++) {
    const source = sources[index] as number;
    columns[index] = (
      source < base.length ? base[source] : extra[source - base.length]
    ) as string;
  }

  return {
    columns,
    rowCount: preview.rows.length,
    computedColumns: new Set(extra),
    getCell(row, column) {
      const source = sources[column];
      if (source === undefined) return '';
      if (source < base.length) return preview.rows[row]?.[source] ?? '';
      return appended?.rows[row]?.[source - base.length] ?? '';
    },
    getStructure(row) {
      return preview.structures[row] ?? null;
    },
    statusOf: buildStatusOf(appended),
  };
}

/**
 * Order the columns, each named by its position in `base` or, past its end, in
 * `extra`.
 * @param base - Columns of the loaded file.
 * @param extra - Computed columns, in the order they were appended.
 * @param structureColumn - Name of the column holding the structures.
 * @returns One source position per displayed column.
 */
function columnSources(
  base: string[],
  extra: string[],
  structureColumn: string,
): number[] {
  const structure = base.indexOf(structureColumn);
  const sources: number[] = [];
  if (structure !== -1) sources.push(structure);
  for (let index = 0; index < extra.length; index++) {
    sources.push(base.length + index);
  }
  for (let index = 0; index < base.length; index++) {
    if (index !== structure) sources.push(index);
  }
  return sources;
}

/**
 * Read the outcome of a record out of the appended columns.
 * @param appended - The computed columns, once a conversion has run.
 * @returns The status accessor, or `null` when no conversion has run.
 */
function buildStatusOf(
  appended: AppendedColumns | null,
): ((row: number) => RowStatus) | null {
  if (!appended) return null;
  // A record that failed produced neither an InChI nor an InChIKey, so either
  // column tells success from failure; which one is appended is the user's.
  const produced = appended.columns.includes(INCHI_COLUMN)
    ? appended.columns.indexOf(INCHI_COLUMN)
    : appended.columns.indexOf(INCHIKEY_COLUMN);
  const message = appended.columns.indexOf(MESSAGE_COLUMN);
  if (produced === -1) return null;

  return (row) => {
    const values = appended.rows[row];
    if (!values?.[produced]) return 'error';
    if (message !== -1 && values[message]) return 'warning';
    return 'ok';
  };
}
