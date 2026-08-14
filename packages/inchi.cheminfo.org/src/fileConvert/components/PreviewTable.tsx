import { Tag } from '@blueprintjs/core';
import type { StructureKind } from 'inchi-api/convert';
import { useMemo } from 'react';
import { Table, createTableColumnHelper } from 'react-science/ui';

import type { PreviewRow } from '../previewFilter.ts';
import type { PreviewModel, RowStatus } from '../previewModel.ts';

import { PreviewCell } from './PreviewCell.tsx';
import { StructureCell } from './StructureCell.tsx';

/** Size of a drawn molecule, in pixels. */
const DRAWING_WIDTH = 130;
const DRAWING_HEIGHT = 84;
/** Height of the header row, in pixels. */
const HEADER_HEIGHT = 32;
/** Height of one body row, in pixels, with and without the drawings. */
const ROW_HEIGHT = 26;
const STRUCTURE_ROW_HEIGHT = DRAWING_HEIGHT + 8;
/** Width of the leading record-number column. */
const INDEX_WIDTH = 72;
/** Width of the structure column. */
const STRUCTURE_WIDTH = DRAWING_WIDTH + 20;
/** Records sampled to size the columns. */
const WIDTH_SAMPLE = 50;
/** Narrowest and widest a column may be sized to, in pixels. */
const MIN_WIDTH = 90;
const MAX_WIDTH = 420;
/** Approximate width of one character in the table font, in pixels. */
const CHARACTER_WIDTH = 7.2;

/** Background of a row whose record did not convert cleanly. */
const STATUS_BACKGROUND: Partial<Record<RowStatus, string>> = {
  warning: '#fdf3e0',
  error: '#fdeceb',
};

const helper = createTableColumnHelper<PreviewRow>();

/** Props of {@link PreviewTable}. */
export interface PreviewTableProps {
  /** The loaded file plus the computed columns, once there are any. */
  model: PreviewModel;
  /** The records to show, already filtered. */
  rows: PreviewRow[];
  /** Column highlighted as the structure source. */
  structureColumn: string;
  /** Whether the values of that column are SMILES or molfiles. */
  structureKind: StructureKind;
  /** Whether the molecules are drawn in a leading column. */
  showStructures: boolean;
  /** Columns left out of the table. */
  hiddenColumns?: ReadonlySet<string>;
  /** Largest height the scroll viewport may take, in pixels. */
  maxHeight?: number;
}

/**
 * The preview table: every record of the loaded file, with the InChI columns
 * appended once a conversion has run.
 *
 * Rows are virtualized, so an SDF of hundreds of thousands of records mounts
 * only the twenty or so cells that are on screen.
 * @param props - The model, the filtered records, and the display options.
 * @returns The table JSX.
 */
export function PreviewTable(props: PreviewTableProps) {
  const {
    model,
    rows,
    structureColumn,
    structureKind,
    showStructures,
    hiddenColumns,
    maxHeight = 460,
  } = props;

  const widths = useMemo(() => columnWidths(model), [model]);

  const dataColumns = useMemo(
    () =>
      model.columns
        .map((column, index) => ({ column, index }))
        .filter((entry) => !hiddenColumns?.has(entry.column)),
    [model, hiddenColumns],
  );

  const columns = useMemo(
    () => [
      helper.display({
        id: 'record',
        header: '#',
        cell: (info) => (info.row.original.index + 1).toLocaleString(),
        meta: {
          thStyle: { width: INDEX_WIDTH },
          tdStyle: { width: INDEX_WIDTH, textAlign: 'right', color: '#5f6b7c' },
        },
      }),
      ...(showStructures
        ? [
            helper.display({
              id: 'structure',
              header: 'Structure',
              cell: (info) => (
                <StructureCell
                  value={model.getStructure(info.row.original.index)}
                  kind={structureKind}
                  width={DRAWING_WIDTH}
                  height={DRAWING_HEIGHT}
                />
              ),
              meta: {
                thStyle: { width: STRUCTURE_WIDTH },
                tdStyle: { width: STRUCTURE_WIDTH, textAlign: 'center' },
              },
            }),
          ]
        : []),
      ...dataColumns.map(({ column, index }) => {
        const width = widths[index];
        const computed = model.computedColumns.has(column);
        const structure = column === structureColumn;
        return helper.accessor((row) => model.getCell(row.index, index), {
          id: `column-${index}`,
          header: () => (
            <span className="preview-header">
              {column}
              {structure && !namesTheKind(column, structureKind) && (
                <Tag minimal intent="primary">
                  {structureKind}
                </Tag>
              )}
            </span>
          ),
          cell: (info) => (
            <PreviewCell
              model={model}
              row={info.row.original.index}
              column={index}
            />
          ),
          meta: {
            thStyle: { width },
            tdStyle: {
              width,
              fontFamily:
                structure || computed
                  ? 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
                  : undefined,
              background: structure
                ? '#e8f1fc'
                : computed
                  ? '#eafaf0'
                  : undefined,
            },
          },
        });
      }),
    ],
    [
      model,
      dataColumns,
      widths,
      showStructures,
      structureColumn,
      structureKind,
    ],
  );

  const rowHeight = showStructures ? STRUCTURE_ROW_HEIGHT : ROW_HEIGHT;
  const statusOf = model.statusOf;
  // Shrink to the rows when there are few, so a 4-record file gets no void
  // under it.
  const height = Math.min(
    maxHeight,
    HEADER_HEIGHT + Math.max(rows.length, 1) * rowHeight + 2,
  );

  return (
    <div className="preview-table" style={{ height }}>
      <Table
        data={rows}
        columns={columns}
        virtualizeRows
        estimatedRowHeight={() => rowHeight}
        getRowId={(row) => String(row.index)}
        stickyHeader
        bordered
        compact
        emptyContent="No record matches the filter"
        tableProps={{
          style: {
            tableLayout: 'fixed',
            width: totalWidth(
              dataColumns.map((entry) => widths[entry.index] as number),
              showStructures,
            ),
          },
        }}
        tdStyle={{
          height: rowHeight,
          verticalAlign: 'middle',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        getTdProps={
          statusOf
            ? (cell) => {
                const background =
                  STATUS_BACKGROUND[statusOf(cell.row.original.index)];
                return background ? { style: { background } } : {};
              }
            : undefined
        }
      />
    </div>
  );
}

/**
 * Whether a column name already says what kind it holds, so the badge beside
 * it would just repeat the header ("smiles" tagged `smiles`).
 * @param column - The column name.
 * @param kind - The detected structure kind.
 * @returns `true` when the badge would be redundant.
 */
function namesTheKind(column: string, kind: string): boolean {
  return column.toLowerCase().replaceAll(/[^a-z]/g, '') === kind.toLowerCase();
}

/**
 * Size each column to the longest value in the first records, so an InChI gets
 * the room it needs while an `id` column stays narrow.
 * @param model - The preview model.
 * @returns One width in pixels per column.
 */
function columnWidths(model: PreviewModel): number[] {
  const sampled = Math.min(model.rowCount, WIDTH_SAMPLE);
  const widths: number[] = new Array(model.columns.length);
  for (let column = 0; column < model.columns.length; column++) {
    let longest = (model.columns[column] as string).length;
    for (let row = 0; row < sampled; row++) {
      const length = model.getCell(row, column).length;
      if (length > longest) longest = length;
    }
    widths[column] = Math.min(
      MAX_WIDTH,
      Math.max(MIN_WIDTH, Math.round(longest * CHARACTER_WIDTH) + 24),
    );
  }
  return widths;
}

/**
 * Total width the table needs, so wide files scroll sideways instead of
 * squeezing every column.
 * @param widths - Width of each data column.
 * @param showStructures - Whether the structure column is drawn.
 * @returns The width in pixels.
 */
function totalWidth(widths: number[], showStructures: boolean): number {
  let total = INDEX_WIDTH + (showStructures ? STRUCTURE_WIDTH : 0);
  for (const width of widths) {
    total += width;
  }
  return total;
}
