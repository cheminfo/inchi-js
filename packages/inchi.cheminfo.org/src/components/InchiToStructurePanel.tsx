import { Icon, InputGroup } from '@blueprintjs/core';
import { useSignals } from '@preact/signals-react/runtime';
import { SvgRenderer } from 'react-ocl';

import { setInchi, state } from '../state/index.ts';

import { ResultRow } from './ResultRow.tsx';

/**
 * Live InChI → structure panel. As the user types or pastes an InChI,
 * the structure (atoms + bonds + 0D stereo) is extracted via
 * `structureFromInchi`, materialised into an OCL `Molecule` with 2D
 * coords and wedge bonds, and rendered as an SVG. The InChIKey is
 * recomputed in parallel via `inchikeyFromInchi`.
 * @returns The panel JSX.
 */
export function InchiToStructurePanel() {
  useSignals();
  const inchi = state.preferences.inchi.value;
  const result = state.data.inchiStructure.value;
  const pending = state.view.inchiPending.value;

  return (
    <div className="panel">
      <div className="panel-head">
        <h2 className="section-title">
          <Icon icon="arrow-left" /> InChI → Structure
        </h2>
        <div className="muted">
          Paste an InChI string. The structure (atoms, bonds, and 0D stereo) is
          extracted via <code>structureFromInchi</code>, laid out in 2D by OCL,
          and rendered with wedge bonds.
        </div>
      </div>

      <InputGroup
        size="large"
        leftIcon="paragraph"
        placeholder="InChI=1S/…"
        value={inchi}
        onValueChange={setInchi}
      />

      <div className="structure-svg-wrap">
        {result.molecule ? (
          <SvgRenderer
            molecule={result.molecule}
            width={420}
            height={260}
            suppressChiralText={false}
            suppressESR={false}
            suppressCIPParity={false}
          />
        ) : (
          <span className="muted">
            {pending ? 'Computing…' : 'No structure yet.'}
          </span>
        )}
      </div>

      <div className="panel-section">
        {result.error && <div className="error-card">{result.error}</div>}
        {result.warning && result.message && (
          <div className="warning-card">{result.message}</div>
        )}

        <ResultRow label="InChIKey" value={result.inchikey} />
        <ResultRow label="SMILES" value={result.smiles} />

        <details>
          <summary
            className="muted"
            style={{ cursor: 'pointer', fontSize: 12 }}
          >
            Reconstructed Molfile
          </summary>
          <div style={{ marginTop: 8 }}>
            <ResultRow label="Molfile" value={result.molfile}>
              <pre
                className="mono"
                style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  maxHeight: 240,
                  overflow: 'auto',
                }}
              >
                {result.molfile || '—'}
              </pre>
            </ResultRow>
          </div>
        </details>
      </div>
    </div>
  );
}
