import { Button, Icon } from '@blueprintjs/core';
import { useSignals } from '@preact/signals-react/runtime';
import { Molecule } from 'openchemlib';
import { useCallback, useState } from 'react';
import type { CanvasEditorOnChangeMolecule } from 'react-ocl';
import { CanvasMoleculeEditor } from 'react-ocl';

import { messageOf } from '../messageOf.ts';
import { setIdCode, state } from '../state/index.ts';

import { ResultRow } from './ResultRow.tsx';
import { INITIAL_SMILES } from './structureToInchiResult.ts';

/**
 * Live structure → InChI panel. Each edit in the OCL canvas editor
 * writes the drawing to `state.preferences.idCode`, which pushes it through
 * `inchiFromMolfile` and `inchikeyFromInchi`, surfacing the InChI
 * string, InChIKey, AuxInfo, and any warning/error from the engine.
 * @returns The panel JSX.
 */
export function StructureToInchiPanel() {
  useSignals();
  const result = state.data.structure.value;
  const pending = state.view.structurePending.value;

  const [pasteError, setPasteError] = useState<string | null>(null);
  const [editorMolfile, setEditorMolfile] = useState<string>(() =>
    molfileOf(state.preferences.idCode.peek()),
  );

  const handleChange = useCallback((event: CanvasEditorOnChangeMolecule) => {
    const [idCodeOnly] = event.getIdcode().split(' ');
    const canonical = idCodeOnly ?? '';
    // The editor fires on every stroke; the signal already holds the last
    // drawing, so comparing against it is what stops a redundant run.
    if (canonical === state.preferences.idCode.peek()) return;
    setIdCode(canonical);
  }, []);

  const handlePaste = useCallback(async () => {
    setPasteError(null);
    try {
      const text = await navigator.clipboard?.readText();
      if (!text?.trim()) {
        setPasteError('Clipboard is empty.');
        return;
      }
      const molecule = Molecule.fromText(text);
      if (!molecule || molecule.getAllAtoms() === 0) {
        setPasteError(
          'Could not parse clipboard content as Molfile, SMILES, or idCode.',
        );
        return;
      }
      setEditorMolfile(molecule.toMolfile());
      setIdCode(molecule.getIDCode());
    } catch (error) {
      setPasteError(messageOf(error));
    }
  }, []);

  return (
    <div className="panel">
      <div className="panel-head">
        <h2 className="section-title">
          <Icon icon="arrow-right" /> Structure → InChI
        </h2>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div className="muted">
            Draw or edit a molecule. The InChI string and InChIKey are
            regenerated on every change.
          </div>
          <Button
            size="small"
            icon="clipboard"
            variant="minimal"
            title="Paste a Molfile, SMILES, or idCode from the clipboard"
            onClick={() => {
              void handlePaste();
            }}
          >
            Paste
          </Button>
        </div>
      </div>

      <div className="editor-frame panel-molecule-tall">
        <CanvasMoleculeEditor
          inputFormat="molfile"
          inputValue={editorMolfile}
          onChange={handleChange}
        />
      </div>

      <div className="panel-section">
        {pasteError && <div className="error-card">{pasteError}</div>}
        {result.error && <div className="error-card">{result.error}</div>}
        {result.warning && result.message && (
          <div className="warning-card">{result.message}</div>
        )}

        <ResultRow
          label="InChI"
          value={result.inchi}
          placeholder={pending ? 'Computing…' : '(empty molecule)'}
        />
        <ResultRow
          label="InChIKey"
          value={result.inchikey}
          placeholder={pending ? 'Computing…' : ''}
        />

        <details>
          <summary
            className="muted"
            style={{ cursor: 'pointer', fontSize: 12 }}
          >
            AuxInfo & canonical SMILES
          </summary>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginTop: 8,
            }}
          >
            <ResultRow label="SMILES" value={result.smiles} />
            <ResultRow label="AuxInfo" value={result.auxinfo} />
          </div>
        </details>
      </div>
    </div>
  );
}

function molfileOf(idCode: string): string {
  try {
    return Molecule.fromIDCode(idCode).toMolfile();
  } catch {
    return Molecule.fromSmiles(INITIAL_SMILES).toMolfile();
  }
}
