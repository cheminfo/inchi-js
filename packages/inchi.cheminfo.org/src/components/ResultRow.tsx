import type { ReactNode } from 'react';

import { CopyButton } from './CopyButton.tsx';

/**
 * A labelled read-only value with a copy button: the row every convert
 * panel reports an InChI, an InChIKey, a SMILES or a Molfile with.
 *
 * The value renders as a single monospace line unless `children` is
 * given, which replaces the body entirely (used for the multi-line
 * Molfile block).
 * @param props - Component props.
 * @param props.label - Name of the value, shown above it.
 * @param props.value - The value itself, and what the copy button copies.
 * @param props.placeholder - Shown instead of an empty value.
 * @param props.children - Replaces the default single-line body.
 * @default placeholder '—'
 * @returns The result row.
 */
export function ResultRow(props: {
  label: string;
  value: string;
  placeholder?: string;
  children?: ReactNode;
}) {
  const { label, value, placeholder, children } = props;

  return (
    <div className="result-card">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div className="muted" style={{ fontSize: 12 }}>
          {label}
        </div>
        <CopyButton value={value} label={label} />
      </div>
      {children ?? (
        <div className="mono">
          {value || <span className="muted">{placeholder ?? '—'}</span>}
        </div>
      )}
    </div>
  );
}
