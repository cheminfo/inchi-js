import type { Molecule } from 'sdf-parser';

import { getMolfileId } from '../roundtrip/sdfParsing.ts';
import type { InchiComputation } from '../sdf/sdfInchi.ts';

import type { MoleculeRow } from './MoleculeTable.tsx';

/** One of the three toggleable status buckets shown in the stats bar. */
export type StatusFilter = 'ok' | 'error' | 'warning';

/** Aggregated counts over every computed molecule. */
export interface Stats {
  total: number;
  ok: number;
  error: number;
  warning: number;
}

/**
 * Build the table rows from the parsed molecules and, optionally, their
 * InChI computations. Before a run, `computations` is `null` and every
 * row is `pending`.
 * @param molecules - The parsed SDF molecules, in file order.
 * @param computations - The computations aligned by index, or `null` before a run.
 * @returns One row per molecule, in file order.
 */
export function buildRows(
  molecules: Molecule[],
  computations: InchiComputation[] | null,
): MoleculeRow[] {
  return molecules.map((molecule, index) => {
    const computation = computations?.[index];
    return {
      index: index + 1,
      id: getMolfileId(molecule) || `record-${index + 1}`,
      molfile: molecule.molfile,
      inchi: computation?.inchi ?? '',
      inchikey: computation?.inchikey ?? '',
      status: computation?.status ?? 'pending',
      message: computation?.message ?? '',
      warning: computation?.warning ?? false,
    };
  });
}

/**
 * Aggregate the per-molecule computations into totals.
 * @param computations - The computations, or `null` before a run.
 * @returns The totals, or `null` when there is nothing computed yet.
 */
export function computeStats(
  computations: InchiComputation[] | null,
): Stats | null {
  if (!computations) return null;
  let ok = 0;
  let error = 0;
  let warning = 0;
  for (const computation of computations) {
    if (computation.status === 'ok') ok += 1;
    else error += 1;
    if (computation.warning) warning += 1;
  }
  return { total: computations.length, ok, error, warning };
}

/**
 * Keep only the rows matching at least one active status filter. An
 * empty filter set means "no filter" and returns every row. A row with
 * a warning matches the `warning` filter regardless of its `ok` /
 * `error` status, so the buckets overlap (union semantics).
 * @param rows - Every table row, in file order.
 * @param filters - The active status filters.
 * @returns The rows to display.
 */
export function filterRows(
  rows: MoleculeRow[],
  filters: Set<StatusFilter>,
): MoleculeRow[] {
  if (filters.size === 0) return rows;
  return rows.filter(
    (row) =>
      (filters.has('ok') && row.status === 'ok') ||
      (filters.has('error') && row.status === 'error') ||
      (filters.has('warning') && row.warning),
  );
}

/**
 * Derive the download file name for the InChI-augmented SDF from the
 * loaded file name.
 * @param fileName - The loaded file name, or `null`.
 * @returns The `*.inchi.sdf` download name.
 */
export function downloadName(fileName: string | null): string {
  const base = (fileName ?? 'molecules')
    .replace(/\.gz$/i, '')
    .replace(/\.sdf$/i, '')
    .replace(/\.mol$/i, '');
  return `${base}.inchi.sdf`;
}
