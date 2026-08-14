import { HTMLTable } from '@blueprintjs/core';
import type { ReactNode } from 'react';

/** How many rows are rendered before the table is truncated. */
const MAX_VISIBLE_ROWS = 500;

/**
 * The scrollable results table both test panels render: the same header,
 * the same 500-row cap, and the same footer telling the reader how much
 * was left out. Rows come from the caller since the columns differ.
 * @param props - Component props.
 * @param props.rows - Every result matching the current filter.
 * @param props.headers - Column headings, in order.
 * @param props.renderRow - Renders one `<tr>` for a result.
 * @param props.rowKey - Stable React key for a result.
 * @returns The table, or a note when the filter matches nothing.
 */
export function ResultsTable<TResult>(props: {
  rows: TResult[];
  headers: string[];
  rowKey: (row: TResult) => string;
  renderRow: (row: TResult) => ReactNode;
}) {
  const { rows, headers, rowKey, renderRow } = props;

  if (rows.length === 0) {
    return (
      <div className="muted" style={{ fontSize: 13, fontStyle: 'italic' }}>
        No structures match the current filter.
      </div>
    );
  }

  const visible = rows.slice(0, MAX_VISIBLE_ROWS);
  return (
    <div style={{ overflow: 'auto', maxHeight: 600 }}>
      <HTMLTable bordered compact striped style={{ width: '100%' }}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => (
            <tr key={rowKey(row)}>{renderRow(row)}</tr>
          ))}
        </tbody>
      </HTMLTable>
      {rows.length > visible.length && (
        <div
          className="muted"
          style={{ fontSize: 12, marginTop: 8, fontStyle: 'italic' }}
        >
          Showing the first {visible.length.toLocaleString()} of{' '}
          {rows.length.toLocaleString()} matching rows.
        </div>
      )}
    </div>
  );
}
