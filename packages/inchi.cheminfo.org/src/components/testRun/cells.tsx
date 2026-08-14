/**
 * A table cell holding one long InChI string, clipped to a readable width
 * with the full value on the title attribute.
 * @param props - Component props.
 * @param props.value - The InChI string.
 * @returns The cell.
 */
export function InchiCell(props: { value: string }) {
  return (
    <td
      className="mono"
      style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}
      title={props.value}
    >
      {props.value || <span className="muted">—</span>}
    </td>
  );
}

/**
 * A table cell holding the diagnostic message of a failed record, or a
 * dash when the record converted cleanly.
 * @param props - Component props.
 * @param props.value - The InChI string.
 * @returns The cell.
 */
export function MessageCell(props: { value: string }) {
  return (
    <td style={{ fontSize: 12 }}>
      {props.value ? (
        <span style={{ color: '#8e292c' }}>{props.value}</span>
      ) : (
        <span className="muted">—</span>
      )}
    </td>
  );
}

/**
 * A table cell holding a short identifier that must not wrap.
 * @param props - Component props.
 * @param props.value - The InChI string.
 * @returns The cell.
 */
export function IdCell(props: { value: string }) {
  return (
    <td className="mono" style={{ whiteSpace: 'nowrap' }}>
      {props.value || <span className="muted">—</span>}
    </td>
  );
}
