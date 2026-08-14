import type { StructureKind } from 'inchi-api/convert';
import type { ErrorComponentProps } from 'react-ocl';
import { MolfileSvgRenderer, SmilesSvgRenderer } from 'react-ocl';

/** Props of {@link StructureCell}. */
export interface StructureCellProps {
  /**
   * The structure to draw, `null` when the file was too large for it to be
   * kept for the preview.
   */
  value: string | null;
  /** Whether `value` is a SMILES or a molfile. */
  kind: StructureKind;
  /** Size of the drawing, in pixels. */
  width: number;
  height: number;
}

/**
 * Draw the structure of one record.
 *
 * `react-ocl` parses the value on every mount, so the renderers are given
 * primitive props only and memoized upstream by the table.
 * @param props - The structure and its kind.
 * @returns The molecule drawing, or a note on why there is none.
 */
export function StructureCell(props: StructureCellProps) {
  const { value, kind, width, height } = props;

  if (value === null) {
    return (
      <span className="muted" title="Too many records to keep every structure">
        not kept
      </span>
    );
  }
  if (!value.trim()) return <span className="muted">empty</span>;

  return kind === 'smiles' ? (
    <SmilesSvgRenderer
      smiles={value}
      width={width}
      height={height}
      autoCrop
      ErrorComponent={StructureError}
    />
  ) : (
    <MolfileSvgRenderer
      molfile={value}
      width={width}
      height={height}
      autoCrop
      ErrorComponent={StructureError}
    />
  );
}

/**
 * Shown in place of a molecule that openchemlib could not read.
 * @param props - The failed value and the error.
 * @returns The note JSX.
 */
function StructureError(props: ErrorComponentProps) {
  return (
    <span className="structure-error" title={props.error.message}>
      unreadable
    </span>
  );
}
