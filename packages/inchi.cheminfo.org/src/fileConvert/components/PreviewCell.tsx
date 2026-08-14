import { Tooltip } from '@blueprintjs/core';
import { Fragment } from 'react';

import type { PreviewModel } from '../previewModel.ts';

/** Longest a value is shown in the tooltip; a molfile would fill the screen. */
const MAX_VALUE_LENGTH = 300;

/** Props of {@link PreviewCell}. */
export interface PreviewCellProps {
  /** The preview model the record is read from. */
  model: PreviewModel;
  /** Position of the record in the file. */
  row: number;
  /** Position of the column in the model. */
  column: number;
}

/**
 * One data cell: the value, clipped to the column width, with the whole record
 * in a tooltip so a truncated message can be read without widening anything.
 * @param props - The model and the cell position.
 * @returns The cell JSX, or nothing when the cell is empty.
 */
export function PreviewCell(props: PreviewCellProps) {
  const { model, row, column } = props;
  const value = model.getCell(row, column);
  if (!value) return null;

  return (
    <Tooltip
      className="preview-cell"
      popoverClassName="preview-tooltip"
      placement="top"
      hoverOpenDelay={250}
      compact
      content={<RecordTooltip model={model} row={row} column={column} />}
    >
      <span>{value}</span>
    </Tooltip>
  );
}

/**
 * The hovered record, one line per column, with the hovered one highlighted.
 * @param props - The model and the cell position.
 * @returns The tooltip body JSX.
 */
function RecordTooltip(props: PreviewCellProps) {
  const { model, row, column } = props;

  return (
    <div className="preview-tooltip-body">
      <div className="preview-tooltip-title">
        Record #{(row + 1).toLocaleString()}
      </div>
      <dl className="preview-tooltip-grid">
        {model.columns.map((name, index) => {
          const value = model.getCell(row, index);
          if (!value) return null;
          const active = index === column;
          return (
            <Fragment key={name}>
              <dt className={active ? 'is-active' : undefined}>{name}</dt>
              <dd className={active ? 'is-active' : undefined}>
                {clamp(value)}
              </dd>
            </Fragment>
          );
        })}
      </dl>
    </div>
  );
}

/**
 * Shorten a value that would take over the tooltip.
 * @param value - The cell value.
 * @returns The value, cut at {@link MAX_VALUE_LENGTH} characters.
 */
function clamp(value: string): string {
  return value.length > MAX_VALUE_LENGTH
    ? `${value.slice(0, MAX_VALUE_LENGTH)}…`
    : value;
}
