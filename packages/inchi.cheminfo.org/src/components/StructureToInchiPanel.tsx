import { Button, Icon } from '@blueprintjs/core';
import type { InchiFromMolfileResult, InchikeyFromInchiResult } from 'inchi-js';
import { inchiFromMolfile, inchikeyFromInchi } from 'inchi-js';
import { Molecule } from 'openchemlib';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CanvasEditorOnChangeMolecule } from 'react-ocl';
import { CanvasMoleculeEditor } from 'react-ocl';

const INITIAL_SMILES = 'CC(=O)OCC';
const STORAGE_KEY = 'inchi.cheminfo.org:structure-to-inchi:idcode:v1';

interface Result {
  inchi: string;
  inchikey: string;
  auxinfo: string;
  message: string;
  log: string;
  warning: boolean;
  error: string | null;
  smiles: string;
  idCode: string;
}

const EMPTY_RESULT: Result = {
  inchi: '',
  inchikey: '',
  auxinfo: '',
  message: '',
  log: '',
  warning: false,
  error: null,
  smiles: '',
  idCode: '',
};

function defaultIdCode(): string {
  try {
    return Molecule.fromSmiles(INITIAL_SMILES).getIDCode();
  } catch {
    return '';
  }
}

function loadInitialIdCode(): string {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (stored) return stored;
  } catch {
    // localStorage may be unavailable.
  }
  return defaultIdCode();
}

/**
 * Live structure → InChI panel. Each edit in the OCL canvas editor
 * pushes the molfile through `inchiFromMolfile` and `inchikeyFromInchi`,
 * surfacing the InChI string, InChIKey, AuxInfo, and any warning/error
 * messages from the engine.
 * @returns The panel JSX.
 */
export function StructureToInchiPanel() {
  const storedIdCode = useMemo(() => loadInitialIdCode(), []);
  const lastIdCodeRef = useRef<string>(storedIdCode);
  const [result, setResult] = useState<Result>(EMPTY_RESULT);
  const [pending, setPending] = useState(false);

  const runConversion = useCallback(async (idCode: string) => {
    if (!idCode) {
      setResult(EMPTY_RESULT);
      return;
    }
    let molecule: Molecule;
    let smiles = '';
    let molfile = '';
    try {
      molecule = Molecule.fromIDCode(idCode);
      smiles = molecule.toIsomericSmiles();
      molfile = molecule.toMolfile();
    } catch (error) {
      setResult({
        ...EMPTY_RESULT,
        idCode,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }
    if (molecule.getAllAtoms() === 0) {
      setResult({ ...EMPTY_RESULT, idCode, smiles });
      return;
    }
    setPending(true);
    try {
      const inchiResult = await inchiFromMolfile(molfile);
      let keyResult: InchikeyFromInchiResult = {
        returnCode: 0,
        inchikey: '',
        message: '',
      };
      if (inchiResult.inchi) {
        keyResult = await inchikeyFromInchi(inchiResult.inchi);
      }
      setResult(buildResult(inchiResult, keyResult, smiles, idCode));
    } catch (error) {
      setResult({
        ...EMPTY_RESULT,
        idCode,
        smiles,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setPending(false);
    }
  }, []);

  const handleChange = useCallback(
    (event: CanvasEditorOnChangeMolecule) => {
      const fullIdcode = event.getIdcode();
      const [idCodeOnly] = fullIdcode.split(' ');
      const canonical = idCodeOnly ?? '';
      if (canonical === lastIdCodeRef.current) return;
      lastIdCodeRef.current = canonical;
      void runConversion(canonical);
    },
    [runConversion],
  );

  useEffect(() => {
    // The conversion calls into WebAssembly (an external system), so
    // running it from an effect is the right shape even though the
    // resolve setState() lives outside React.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external WASM call
    void runConversion(storedIdCode);
  }, [runConversion, storedIdCode]);

  useEffect(() => {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, result.idCode);
    } catch {
      // localStorage may be unavailable; persistence is best-effort.
    }
  }, [result.idCode]);

  const initialMolfile = useMemo(() => {
    try {
      return Molecule.fromIDCode(storedIdCode).toMolfile();
    } catch {
      return Molecule.fromSmiles(INITIAL_SMILES).toMolfile();
    }
  }, [storedIdCode]);

  return (
    <div className="panel">
      <h2 className="section-title">
        <Icon icon="arrow-right" /> Structure → InChI
      </h2>
      <div className="muted">
        Draw or edit a molecule. The InChI string and InChIKey are regenerated
        on every change.
      </div>
      <div className="editor-frame" style={{ height: 380 }}>
        <CanvasMoleculeEditor
          inputFormat="molfile"
          inputValue={initialMolfile}
          onChange={handleChange}
        />
      </div>

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
        <summary className="muted" style={{ cursor: 'pointer', fontSize: 12 }}>
          AuxInfo & canonical SMILES
        </summary>
        <div className="result-card" style={{ marginTop: 8 }}>
          <KeyValue label="SMILES" value={result.smiles} />
          <KeyValue label="AuxInfo" value={result.auxinfo} />
        </div>
      </details>
    </div>
  );
}

function ResultRow({
  label,
  value,
  placeholder,
}: {
  label: string;
  value: string;
  placeholder?: string;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    void navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      globalThis.setTimeout(() => setCopied(false), 1500);
    });
  }, [value]);
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
        {value && (
          <Button
            size="small"
            icon={copied ? 'tick' : 'duplicate'}
            variant="minimal"
            title={`Copy ${label} to clipboard`}
            onClick={handleCopy}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        )}
      </div>
      <div className="mono">
        {value || <span className="muted">{placeholder ?? '—'}</span>}
      </div>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 12 }}>
        {label}
      </div>
      <div className="mono">{value || '—'}</div>
    </div>
  );
}

function buildResult(
  inchi: InchiFromMolfileResult,
  inchikey: InchikeyFromInchiResult,
  smiles: string,
  idCode: string,
): Result {
  if (inchi.returnCode === -1) {
    return {
      ...EMPTY_RESULT,
      smiles,
      idCode,
      error: inchi.message || inchi.log || 'InChI generation failed.',
    };
  }
  return {
    inchi: inchi.inchi,
    inchikey: inchikey.inchikey,
    auxinfo: inchi.auxinfo,
    message: inchi.message,
    log: inchi.log,
    warning: inchi.returnCode === 1,
    error: null,
    smiles,
    idCode,
  };
}
