import { Callout } from '@blueprintjs/core';

import type { PanelKind } from '../data/types.ts';
import { findSegment } from '../inchi/layers.ts';
import type { DerivationResult } from '../useDerivation.ts';

import { ConnectionsPanel } from './ConnectionsPanel.tsx';
import { FormulaPanel } from './FormulaPanel.tsx';
import { HydrogenPanel } from './HydrogenPanel.tsx';
import { InchikeyPanel } from './InchikeyPanel.tsx';
import { NumberingTable } from './NumberingTable.tsx';
import { StereoPanel } from './StereoPanel.tsx';

/**
 * Show the working behind whichever part of the identifier a step is
 * about, always computed from the structure currently in the editor.
 * @param props - Component props.
 * @param props.kind - Which panel to show.
 * @param props.result - Engine output and hand derivation.
 * @returns The panel.
 */
export function DerivationPanel(props: {
  kind: PanelKind;
  result: DerivationResult;
}) {
  const { kind, result } = props;

  const { derivation, molecule, inchi, inchikey } = result;
  if (!derivation || !molecule) {
    return <div className="muted">Waiting for a structure…</div>;
  }
  if (kind === 'formula') {
    return (
      <FormulaPanel
        molecule={molecule}
        formula={findSegment(derivation.split, '')?.value ?? ''}
      />
    );
  }
  if (kind === 'numbering') return <NumberingTable derivation={derivation} />;
  if (kind === 'connections') {
    return (
      <ConnectionsPanel
        layer={findSegment(derivation.split, 'c')?.value ?? ''}
      />
    );
  }
  if (kind === 'hydrogens') {
    return (
      <HydrogenPanel layer={findSegment(derivation.split, 'h')?.value ?? ''} />
    );
  }
  if (kind === 'stereo') return <StereoPanel split={derivation.split} />;
  if (kind === 'isotopes') {
    return <StereoPanel split={derivation.split} showIsotopes />;
  }
  if (kind === 'inchikey') {
    return <InchikeyPanel inchi={inchi} inchikey={inchikey} />;
  }
  return (
    <Callout compact intent="primary">
      Hover any layer above to see what it is. The layers are always in this
      order, and any the structure does not need is simply absent.
    </Callout>
  );
}
