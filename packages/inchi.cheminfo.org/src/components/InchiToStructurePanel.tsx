import { Icon, InputGroup } from '@blueprintjs/core';
import {
  inchikeyFromInchi,
  oclMoleculeFromStructure,
  structureFromInchi,
} from 'inchi-js';
import type { Molecule } from 'openchemlib';
import * as OCL from 'openchemlib';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SvgRenderer } from 'react-ocl';

import { CopyableValue } from './CopyableValue.tsx';

const STORAGE_KEY = 'inchi.cheminfo.org:inchi-to-structure:input:v1';
const DEFAULT_INCHI =
  'InChI=1S/C9H18O2/c1-5-7(3)8(4)11-9(10)6-2/h7-8H,5-6H2,1-4H3/t7-,8+/m0/s1';

interface Result {
  molecule: Molecule | null;
  molfile: string;
  smiles: string;
  inchikey: string;
  message: string;
  log: string;
  warning: boolean;
  error: string | null;
}

const EMPTY: Result = {
  molecule: null,
  molfile: '',
  smiles: '',
  inchikey: '',
  message: '',
  log: '',
  warning: false,
  error: null,
};

function loadInitialInchi(): string {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? DEFAULT_INCHI;
  } catch {
    return DEFAULT_INCHI;
  }
}

/**
 * Live InChI → structure panel. As the user types or pastes an InChI,
 * the structure (atoms + bonds + 0D stereo) is extracted via
 * `structureFromInchi`, materialised into an OCL `Molecule` with 2D
 * coords and wedge bonds, and rendered as an SVG. The InChIKey is
 * recomputed in parallel via `inchikeyFromInchi`.
 * @returns The panel JSX.
 */
export function InchiToStructurePanel() {
  const [inchi, setInchi] = useState<string>(() => loadInitialInchi());
  const [result, setResult] = useState<Result>(EMPTY);
  const [pending, setPending] = useState(false);

  const runConversion = useCallback(async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) {
      setResult(EMPTY);
      return;
    }
    setPending(true);
    try {
      const [structure, keyResult] = await Promise.all([
        structureFromInchi(trimmed),
        inchikeyFromInchi(trimmed),
      ]);
      if (structure.returnCode === -1) {
        setResult({
          ...EMPTY,
          error:
            structure.message || structure.log || 'InChI could not be parsed.',
        });
        return;
      }
      const molecule = oclMoleculeFromStructure(structure, OCL);
      setResult({
        molecule,
        molfile: molecule.toMolfile(),
        smiles: molecule.toIsomericSmiles(),
        inchikey: keyResult.inchikey,
        message: structure.message,
        log: structure.log,
        warning: structure.returnCode === 1,
        error: null,
      });
    } catch (error) {
      setResult({
        ...EMPTY,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setPending(false);
    }
  }, []);

  useEffect(() => {
    // The conversion calls into WebAssembly (an external system), so
    // running it from an effect is the right shape even though the
    // resolve setState() lives outside React.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external WASM call
    void runConversion(inchi);
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, inchi);
    } catch {
      // Persistence is best-effort.
    }
  }, [inchi, runConversion]);

  const hasStructure = useMemo(
    () => result.molecule !== null,
    [result.molecule],
  );

  return (
    <div className="panel">
      <h2 className="section-title">
        <Icon icon="arrow-left" /> InChI → Structure
      </h2>
      <div className="muted">
        Paste an InChI string. The structure (atoms, bonds, and 0D stereo) is
        extracted via <code>structureFromInchi</code>, laid out in 2D by OCL,
        and rendered with wedge bonds.
      </div>
      <InputGroup
        size="large"
        leftIcon="paragraph"
        placeholder="InChI=1S/…"
        value={inchi}
        onValueChange={setInchi}
      />

      {result.error && <div className="error-card">{result.error}</div>}
      {result.warning && result.message && (
        <div className="warning-card">{result.message}</div>
      )}

      <div className="structure-svg-wrap" style={{ minHeight: 280 }}>
        {hasStructure && result.molecule ? (
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

      <ResultRow label="InChIKey" value={result.inchikey} />
      <ResultRow label="SMILES" value={result.smiles} />

      <details>
        <summary className="muted" style={{ cursor: 'pointer', fontSize: 12 }}>
          Reconstructed Molfile
        </summary>
        <div className="result-card" style={{ marginTop: 8 }}>
          <div className="muted" style={{ fontSize: 12 }}>
            Molfile
          </div>
          <CopyableValue
            value={result.molfile}
            label="Molfile"
            style={{
              width: '100%',
              margin: 0,
              padding: '4px 0',
              whiteSpace: 'pre-wrap',
              maxHeight: 240,
              overflow: 'auto',
            }}
          />
        </div>
      </details>
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="result-card">
      <div className="muted" style={{ fontSize: 12 }}>
        {label}
      </div>
      <CopyableValue value={value} label={label} />
    </div>
  );
}
