import type { Intent } from '@blueprintjs/core';
import { Tag } from '@blueprintjs/core';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import type { ErrorComponentProps } from 'react-ocl';
import { MolfileSvgRenderer } from 'react-ocl';

import type { InchiStatus } from '../sdf/sdfInchi.ts';

import { EllipsisTooltip, FastTooltip } from './FastTooltip.tsx';

export type RowStatus = InchiStatus | 'pending';

export interface MoleculeRow {
  /** 1-based position in the SDF. */
  index: number;
  id: string;
  molfile: string;
  inchi: string;
  inchikey: string;
  status: RowStatus;
  message: string;
  warning: boolean;
}

const ROW_HEIGHT = 168;
const GRID_TEMPLATE =
  '48px 176px minmax(120px, 1fr) minmax(220px, 3fr) 170px 96px';
const COLUMNS = ['#', 'Structure', 'ID', 'InChI', 'InChIKey', 'Status'];

const STATUS_INTENT: Record<RowStatus, 'success' | 'danger' | 'none'> = {
  ok: 'success',
  error: 'danger',
  pending: 'none',
};

const STATUS_LABEL: Record<RowStatus, string> = {
  ok: 'OK',
  error: 'error',
  pending: '—',
};

/**
 * Windowed table of SDF molecules. Only the visible rows are rendered
 * (via `@tanstack/react-virtual`), so the whole file — tens of
 * thousands of structures — can be listed without overwhelming the
 * DOM. Each row shows the structure, identifier, computed InChI /
 * InChIKey and conversion status.
 * @param props - Component props.
 * @param props.rows - The molecules to display (already filtered), in file order.
 * @param props.selectedIndex - 0-based index of the highlighted molecule, or `null`.
 * @param props.onSelect - Called with a molecule's 0-based index when its row is clicked.
 * @returns The virtualized table JSX.
 */
export function MoleculeTable({
  rows,
  selectedIndex,
  onSelect,
}: {
  rows: MoleculeRow[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/incompatible-library -- useVirtualizer returns live getters; React Compiler intentionally skips memoizing this component, which is correct here
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  // Selection is the molecule's stable 0-based index, but navigation moves
  // through the filtered `rows` array — so translate between the two here.
  function selectArrayIndex(arrayIndex: number) {
    const row = rows[arrayIndex];
    if (!row || row.index - 1 === selectedIndex) return;
    virtualizer.scrollToIndex(arrayIndex);
    onSelect(row.index - 1);
  }

  function moveSelection(delta: number) {
    const currentArrayIndex = rows.findIndex(
      (row) => row.index - 1 === selectedIndex,
    );
    if (currentArrayIndex === -1) {
      selectArrayIndex(delta > 0 ? 0 : rows.length - 1);
    } else {
      selectArrayIndex(currentArrayIndex + delta);
    }
  }

  // Clicking a row also focuses the scroll container so the arrow keys work
  // immediately afterwards, even though the rows themselves are not tab stops.
  function handleSelect(moleculeIndex: number) {
    scrollRef.current?.focus({ preventScroll: true });
    onSelect(moleculeIndex);
  }

  if (rows.length === 0) {
    return (
      <div className="muted" style={{ fontSize: 13, fontStyle: 'italic' }}>
        No molecules to display.
      </div>
    );
  }

  return (
    <div className="molecule-table">
      <div
        className="molecule-table-head"
        style={{ gridTemplateColumns: GRID_TEMPLATE }}
      >
        {COLUMNS.map((column) => (
          <div
            key={column}
            className="muted"
            style={{ fontSize: 12, fontWeight: 600 }}
          >
            {column}
          </div>
        ))}
      </div>
      <div
        ref={scrollRef}
        role="listbox"
        aria-label="Molecules"
        aria-activedescendant={
          selectedIndex === null
            ? undefined
            : `molecule-table-row-${selectedIndex + 1}`
        }
        tabIndex={0}
        onKeyDown={(event) => {
          switch (event.key) {
            case 'ArrowDown':
              event.preventDefault();
              moveSelection(1);
              break;
            case 'ArrowUp':
              event.preventDefault();
              moveSelection(-1);
              break;
            case 'Home':
              event.preventDefault();
              selectArrayIndex(0);
              break;
            case 'End':
              event.preventDefault();
              selectArrayIndex(rows.length - 1);
              break;
            default:
              break;
          }
        }}
        style={{ flex: 1, minHeight: 0, overflow: 'auto', outline: 'none' }}
      >
        <div
          style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
        >
          {virtualizer.getVirtualItems().map((item) => {
            const row = rows[item.index];
            if (!row) return null;
            return (
              <MoleculeTableRow
                key={item.key}
                row={row}
                top={item.start}
                // Selection is tracked by the molecule's stable 0-based
                // index (not the array position) so it survives filtering.
                selected={row.index - 1 === selectedIndex}
                onSelect={handleSelect}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MoleculeTableRow({
  row,
  top,
  selected,
  onSelect,
}: {
  row: MoleculeRow;
  top: number;
  selected: boolean;
  onSelect: (moleculeIndex: number) => void;
}) {
  const moleculeIndex = row.index - 1;
  const className = `molecule-table-row${selected ? ' is-selected' : ''}${
    row.warning ? ' has-warning' : ''
  }`;
  return (
    <div
      id={`molecule-table-row-${row.index}`}
      className={className}
      role="option"
      aria-selected={selected}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: ROW_HEIGHT,
        transform: `translateY(${top}px)`,
        gridTemplateColumns: GRID_TEMPLATE,
      }}
      onClick={() => onSelect(moleculeIndex)}
    >
      <RowCells row={row} />
    </div>
  );
}

function RowCells({ row }: { row: MoleculeRow }) {
  const message = row.message || (row.warning ? 'C library warning' : '');
  return (
    <>
      <div className="muted" style={{ fontSize: 12 }}>
        {row.index}
      </div>
      <div className="molecule-table-structure">
        <MolfileSvgRenderer
          molfile={row.molfile}
          width={160}
          height={160}
          autoCrop
          ErrorComponent={StructureError}
        />
      </div>
      <EllipsisTooltip
        className="mono molecule-table-ellipsis"
        value={row.id}
      />
      <ValueCell value={row.inchi} />
      <ValueCell value={row.inchikey} />
      <div>
        <StatusTag
          intent={STATUS_INTENT[row.status]}
          label={STATUS_LABEL[row.status]}
          message={row.status === 'error' ? message : undefined}
        />
        {row.warning && (
          <StatusTag
            intent="warning"
            label="warn"
            message={message}
            marginLeft={4}
          />
        )}
      </div>
    </>
  );
}

function StatusTag({
  intent,
  label,
  message,
  marginLeft,
}: {
  intent: Intent;
  label: string;
  message?: string;
  marginLeft?: number;
}) {
  const tag = (
    <Tag
      minimal
      intent={intent}
      style={marginLeft ? { marginLeft } : undefined}
    >
      {label}
    </Tag>
  );
  if (!message) return tag;
  return (
    <FastTooltip content={message} popoverClassName="molecule-table-tooltip">
      {tag}
    </FastTooltip>
  );
}

function ValueCell({ value }: { value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
      <EllipsisTooltip
        tag="span"
        className="mono molecule-table-ellipsis"
        value={value}
      >
        {value || <span className="muted">—</span>}
      </EllipsisTooltip>
    </div>
  );
}

function StructureError({ value }: ErrorComponentProps) {
  return (
    <FastTooltip content={value}>
      <span className="muted" style={{ fontSize: 11 }}>
        no structure
      </span>
    </FastTooltip>
  );
}
