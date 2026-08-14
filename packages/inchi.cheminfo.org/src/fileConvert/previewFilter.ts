import type { PreviewModel, RowStatus } from './previewModel.ts';

/** Every status a record can end up in, in the order the capsules show them. */
export const ROW_STATUSES: readonly RowStatus[] = ['ok', 'warning', 'error'];

/**
 * One record of the preview table. The table is handed positions rather than
 * values, so filtering a 200 000-record file copies indices, never cells.
 */
export interface PreviewRow {
  /** Position of the record in the file. */
  index: number;
}

/** What the table toolbar narrows the preview down to. */
export interface RowFilter {
  /** Case-insensitive text every kept record must hold in one of its cells. */
  query: string;
  /** Statuses to keep; an empty set keeps every record. */
  statuses: ReadonlySet<RowStatus>;
}

/**
 * Select the records the table shows.
 * @param model - The preview model.
 * @param filter - The active search text and statuses.
 * @returns The kept records, in file order.
 */
export function filterRows(
  model: PreviewModel,
  filter: RowFilter,
): PreviewRow[] {
  const query = filter.query.trim().toLowerCase();
  const statuses = filter.statuses;
  const byStatus = statuses.size > 0 ? model.statusOf : null;
  const rows: PreviewRow[] = [];

  for (let index = 0; index < model.rowCount; index++) {
    if (byStatus && !statuses.has(byStatus(index))) continue;
    if (query && !matches(model, index, query)) continue;
    rows.push({ index });
  }
  return rows;
}

/**
 * Count how many records ended in each status.
 * @param model - The preview model.
 * @returns One count per status, all zero while no conversion has run.
 */
export function countStatuses(model: PreviewModel): Record<RowStatus, number> {
  const counts: Record<RowStatus, number> = { ok: 0, warning: 0, error: 0 };
  const statusOf = model.statusOf;
  if (!statusOf) return counts;

  for (let index = 0; index < model.rowCount; index++) {
    counts[statusOf(index)]++;
  }
  return counts;
}

/**
 * Whether any cell of a record holds the searched text.
 * @param model - The preview model.
 * @param row - Position of the record.
 * @param query - The searched text, already lowercased and trimmed.
 * @returns `true` when one cell holds it.
 */
function matches(model: PreviewModel, row: number, query: string): boolean {
  for (let column = 0; column < model.columns.length; column++) {
    if (model.getCell(row, column).toLowerCase().includes(query)) return true;
  }
  return false;
}
