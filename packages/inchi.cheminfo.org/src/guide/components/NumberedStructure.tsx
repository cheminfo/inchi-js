import { Molecule } from 'openchemlib';
import { useMemo } from 'react';
import { MolfileSvgRenderer } from 'react-ocl';

/**
 * Draw a structure with its canonical numbers written beside the atoms.
 * The numbers travel to the renderer as custom labels prefixed with `]`,
 * which OpenChemLib draws as a superscript beside the element symbol
 * rather than in place of it.
 * @default height 260
 * @param props - Component props.
 * @param props.molfile - The structure to draw.
 * @param props.numbers - Input atom number (1-based) → number to display.
 * @param props.height - Height of the drawing in pixels.
 * @returns The rendered structure.
 */
export function NumberedStructure(props: {
  molfile: string;
  numbers: ReadonlyMap<number, number>;
  height?: number;
}) {
  const { molfile, numbers, height = 260 } = props;

  const numbered = useMemo(() => {
    try {
      const molecule = Molecule.fromMolfile(molfile);
      for (const [atom, label] of numbers) {
        if (atom >= 1 && atom <= molecule.getAllAtoms()) {
          molecule.setAtomCustomLabel(atom - 1, `]${label}`);
        }
      }
      return molecule.toMolfile();
    } catch {
      return molfile;
    }
  }, [molfile, numbers]);

  return (
    <div className="structure-svg-wrap" style={{ minHeight: height }}>
      <MolfileSvgRenderer
        molfile={numbered}
        width={460}
        height={height}
        maxAVBL={30}
        factorTextSize={1.15}
        noCarbonLabelWithCustomLabel
        suppressChiralText
      />
    </div>
  );
}
