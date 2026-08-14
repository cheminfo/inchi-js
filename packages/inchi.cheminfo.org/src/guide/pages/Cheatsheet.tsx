import { HTMLTable, Tooltip } from '@blueprintjs/core';

import { REFERENCE_SECTIONS } from '../data/reference.ts';
import type { ReferenceRow } from '../data/types.ts';

/**
 * The lookup table: every layer and every piece of punctuation, grouped
 * the way the identifier is ordered. Rows carrying a longer explanation
 * open it on hover; the page is laid out to print on one or two sheets.
 * @returns The cheatsheet page.
 */
export function Cheatsheet() {
  return (
    <div className="panel guide-cheatsheet">
      <h2 className="section-title">InChI layer cheatsheet</h2>
      <div className="muted" style={{ fontSize: 12 }}>
        Layers always appear in this order, and any the structure does not need
        is absent. Hover a row with a dotted underline for the detail.
      </div>
      <div className="guide-cheatsheet-grid">
        {REFERENCE_SECTIONS.map((section) => (
          <section key={section.title}>
            <h3
              className="guide-cheatsheet-heading"
              style={{ color: section.colour, borderColor: section.colour }}
            >
              {section.title}
            </h3>
            <HTMLTable compact className="guide-table">
              <tbody>
                {section.rows.map((row) => (
                  <Row key={row.syntax} row={row} />
                ))}
              </tbody>
            </HTMLTable>
          </section>
        ))}
      </div>
    </div>
  );
}

function Row({ row }: { row: ReferenceRow }) {
  const rich = Boolean(row.detail && row.example && row.name);
  const cells = (
    <>
      <td className="mono guide-token">{row.syntax}</td>
      <td className={rich ? 'guide-rich-row' : undefined}>{row.description}</td>
    </>
  );
  if (!rich) return <tr>{cells}</tr>;
  return (
    <Tooltip
      content={<RowDetail row={row} />}
      placement="right"
      hoverOpenDelay={150}
      popoverClassName="guide-glossary-popover"
      renderTarget={(targetProps) => (
        <tr {...withoutIsOpen(targetProps)}>{cells}</tr>
      )}
    />
  );
}

function RowDetail({ row }: { row: ReferenceRow }) {
  return (
    <div style={{ maxWidth: 360 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
        <code className="guide-code">{row.syntax}</code>
        <strong>{row.name}</strong>
      </div>
      <div style={{ margin: '6px 0' }}>{row.detail}</div>
      {row.example && (
        <div className="guide-tooltip-example">
          <div>
            <span className="muted">Example: </span>
            <code className="guide-code">{row.example.snippet}</code>
          </div>
          <div>
            <span className="muted">On: </span>
            {row.example.input}
          </div>
          <div style={{ fontStyle: 'italic' }}>{row.example.note}</div>
        </div>
      )}
    </div>
  );
}

/**
 * Strip the popover's `isOpen` flag, which is not a valid attribute on a
 * table row, from the props Blueprint hands to the tooltip target.
 * @param targetProps - The props Blueprint supplies.
 * @returns The same props without `isOpen`.
 */
function withoutIsOpen<T extends { isOpen?: boolean }>(
  targetProps: T,
): Omit<T, 'isOpen'> {
  const rest = { ...targetProps };
  delete rest.isOpen;
  return rest;
}
