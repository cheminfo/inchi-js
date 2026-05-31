import { Tag, Tooltip } from '@blueprintjs/core';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import type { ErrorComponentProps } from 'react-ocl';
import { MolfileSvgRenderer } from 'react-ocl';

import type { InchiStatus } from '../sdf/sdfInchi.ts';

import { CopyButton } from './CopyButton.tsx';

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

const ROW_HEIGHT = 96;
const GRID_TEMPLATE =
  '48px 104px minmax(120px, 1fr) minmax(220px, 3fr) 170px 96px';
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
      <div ref={scrollRef} style={{ overflow: 'auto', maxHeight: 620 }}>
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
                onSelect={onSelect}
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
  const message = row.message || (row.warning ? 'C library warning' : '');
  return (
    <Tooltip
      content={message}
      disabled={!message}
      placement="top"
      compact
      hoverOpenDelay={150}
      popoverClassName="molecule-table-tooltip"
      renderTarget={(targetProps) => {
        const {
          // eslint-disable-next-line no-unused-vars -- pulled out so it is not spread onto the DOM node
          isOpen,
          ref,
          className: targetClassName,
          ...rest
        } = targetProps;
        return (
          <div
            {...rest}
            ref={ref}
            className={
              targetClassName ? `${className} ${targetClassName}` : className
            }
            role="button"
            tabIndex={0}
            aria-pressed={selected}
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
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(moleculeIndex);
              }
            }}
          >
            <RowCells row={row} />
          </div>
        );
      }}
    />
  );
}

function RowCells({ row }: { row: MoleculeRow }) {
  return (
    <>
      <div className="muted" style={{ fontSize: 12 }}>
        {row.index}
      </div>
      <div className="molecule-table-structure">
        <MolfileSvgRenderer
          molfile={row.molfile}
          width={88}
          height={88}
          autoCrop
          ErrorComponent={StructureError}
        />
      </div>
      <div className="mono molecule-table-ellipsis" title={row.id}>
        {row.id}
      </div>
      <ValueCell value={row.inchi} label="InChI" />
      <ValueCell value={row.inchikey} label="InChIKey" />
      <div>
        <Tag minimal intent={STATUS_INTENT[row.status]}>
          {STATUS_LABEL[row.status]}
        </Tag>
        {row.warning && (
          <Tag minimal intent="warning" style={{ marginLeft: 4 }}>
            warn
          </Tag>
        )}
      </div>
    </>
  );
}

function ValueCell({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
      <span className="mono molecule-table-ellipsis" title={value}>
        {value || <span className="muted">—</span>}
      </span>
      {value && (
        <span
          role="presentation"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <CopyButton value={value} label={label} />
        </span>
      )}
    </div>
  );
}

function StructureError({ value }: ErrorComponentProps) {
  return (
    <span className="muted" style={{ fontSize: 11 }} title={value}>
      no structure
    </span>
  );
}
