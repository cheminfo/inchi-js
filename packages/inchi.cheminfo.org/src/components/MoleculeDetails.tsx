import { Button, Tag } from '@blueprintjs/core';
import type { ErrorComponentProps } from 'react-ocl';
import { MolfileSvgRenderer } from 'react-ocl';
import type { Molecule } from 'sdf-parser';

import { CopyButton } from './CopyButton.tsx';
import type { MoleculeRow, RowStatus } from './MoleculeTable.tsx';

const STATUS_INTENT: Record<RowStatus, 'success' | 'danger' | 'none'> = {
  ok: 'success',
  error: 'danger',
  pending: 'none',
};

const STATUS_LABEL: Record<RowStatus, string> = {
  ok: 'OK',
  error: 'error',
  pending: 'pending',
};

/**
 * Detail pane shown beside the molecule table when a row is selected.
 * Renders the structure at a larger size and lists every SDF data
 * field of the record (everything except the raw molfile), together
 * with the computed InChI / InChIKey and conversion status.
 * @param props - Component props.
 * @param props.molecule - The selected molecule, with its raw `> <field>` data.
 * @param props.row - The matching table row holding computed values and status.
 * @param props.onClose - Called when the user dismisses the pane.
 * @returns The detail pane JSX.
 */
export function MoleculeDetails({
  molecule,
  row,
  onClose,
}: {
  molecule: Molecule;
  row: MoleculeRow;
  onClose: () => void;
}) {
  const fields = Object.entries(molecule).filter(
    ([key, value]) =>
      key !== 'molfile' && value !== undefined && value !== null,
  );
  return (
    <div className="molecule-detail">
      <div className="molecule-detail-head">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minWidth: 0,
          }}
        >
          <Tag minimal>#{row.index}</Tag>
          <span
            className="mono molecule-table-ellipsis"
            title={row.id}
            style={{ fontWeight: 600 }}
          >
            {row.id}
          </span>
        </div>
        <Button
          icon="cross"
          variant="minimal"
          size="small"
          title="Close details"
          onClick={onClose}
        />
      </div>

      <div className="molecule-detail-structure">
        <MolfileSvgRenderer
          molfile={molecule.molfile}
          width={220}
          height={220}
          autoCrop
          ErrorComponent={StructureError}
        />
      </div>

      <div className="molecule-detail-section">
        <span className="molecule-detail-section-title">Computed</span>
        <DetailField label="InChI" value={row.inchi} />
        <DetailField label="InChIKey" value={row.inchikey} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Tag minimal intent={STATUS_INTENT[row.status]}>
            {STATUS_LABEL[row.status]}
          </Tag>
          {row.warning && (
            <Tag minimal intent="warning">
              warning
            </Tag>
          )}
        </div>
        {row.message && (
          <span
            className="muted"
            style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}
          >
            {row.message}
          </span>
        )}
      </div>

      <div className="molecule-detail-section">
        <span className="molecule-detail-section-title">
          SDF fields ({fields.length})
        </span>
        {fields.length === 0 ? (
          <span className="muted" style={{ fontSize: 13, fontStyle: 'italic' }}>
            This record has no data fields.
          </span>
        ) : (
          fields.map(([key, value]) => (
            <DetailField key={key} label={key} value={String(value)} />
          ))
        )}
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="molecule-detail-field">
      <div className="molecule-detail-field-head">
        <span className="molecule-detail-field-label" title={label}>
          {label}
        </span>
        {value && <CopyButton value={value} label={label} />}
      </div>
      <span className="mono molecule-detail-field-value">
        {value || <span className="muted">—</span>}
      </span>
    </div>
  );
}

function StructureError({ value }: ErrorComponentProps) {
  return (
    <span className="muted" style={{ fontSize: 12 }} title={value}>
      no structure
    </span>
  );
}
