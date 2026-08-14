import { Callout, HTMLTable } from '@blueprintjs/core';
import { useEffect, useState } from 'react';

import { messageOf } from '../../messageOf.ts';
import type { InchikeyDerivation } from '../inchi/inchikey.ts';
import { deriveInchikey } from '../inchi/inchikey.ts';

interface KeyState {
  inchi: string;
  derivation?: InchikeyDerivation;
  error?: string;
}

/**
 * Derive an InChIKey step by step and check the result against the key
 * the library produced. Everything shown here can be followed by hand
 * except the SHA-256 digests, which are printed rather than derived.
 * @param props - Component props.
 * @param props.inchi - The InChI to hash.
 * @param props.inchikey - The key the library produced, for comparison.
 * @returns The derivation table.
 */
export function InchikeyPanel(props: { inchi: string; inchikey: string }) {
  const { inchi, inchikey } = props;

  const [state, setState] = useState<KeyState>({ inchi: '' });

  useEffect(() => {
    let cancelled = false;
    // Web Crypto is asynchronous, so the result lands outside render.
    void deriveInchikey(inchi).then(
      (derived) => {
        if (!cancelled) setState({ inchi, derivation: derived });
      },
      (error: unknown) => {
        if (!cancelled) {
          setState({ inchi, error: messageOf(error) });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [inchi]);

  if (state.inchi !== inchi) return <div className="muted">Hashing…</div>;
  if (state.error) return <div className="error-card">{state.error}</div>;
  const { derivation } = state;
  if (!derivation) return <div className="muted">Hashing…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <HTMLTable compact striped className="guide-table">
        <tbody>
          <Row
            label="Major part"
            note="formula, /c, /h and /q — the skeleton"
            value={derivation.major}
          />
          <Row
            label="Minor part"
            note="every remaining layer; /p is excluded"
            value={derivation.minor || '(empty)'}
          />
          <Row
            label="Hashed as"
            note="a non-empty minor part shorter than 255 characters is doubled first"
            value={derivation.minorHashed || '(empty string)'}
          />
          <Row
            label="SHA-256 of the major part"
            note="the one step that cannot be done by hand"
            value={derivation.majorDigest}
          />
          <Row
            label="SHA-256 of the minor part"
            note=""
            value={derivation.minorDigest}
          />
          <Row
            label="First block"
            note="65 bits: four triplets of 14 bits and a dublet of 9"
            value={derivation.firstBlock}
          />
          <Row
            label="Second block"
            note="37 bits: two triplets and a dublet"
            value={derivation.secondBlock}
          />
          <Row
            label="Flags"
            note={`${derivation.standardFlag === 'S' ? 'standard' : 'non-standard'} InChI, version 1`}
            value={`${derivation.standardFlag}${derivation.versionFlag}`}
          />
          <Row
            label="Proton letter"
            note={
              derivation.protons === 0
                ? 'neutral'
                : `${derivation.protons > 0 ? 'added' : 'removed'} ${Math.abs(derivation.protons)} proton(s)`
            }
            value={derivation.protonFlag}
          />
        </tbody>
      </HTMLTable>
      <div className="result-card">
        <div className="muted" style={{ fontSize: 12 }}>
          Derived key
        </div>
        <div className="mono">{derivation.inchikey}</div>
      </div>
      {inchikey && (
        <Callout
          compact
          intent={derivation.inchikey === inchikey ? 'success' : 'danger'}
        >
          {derivation.inchikey === inchikey
            ? 'Identical to the key the InChI library produced.'
            : `The library produced ${inchikey}.`}
        </Callout>
      )}
    </div>
  );
}

function Row({
  label,
  note,
  value,
}: {
  label: string;
  note: string;
  value: string;
}) {
  return (
    <tr>
      <td style={{ whiteSpace: 'nowrap' }}>
        <div>{label}</div>
        {note && (
          <div className="muted" style={{ fontSize: 11 }}>
            {note}
          </div>
        )}
      </td>
      <td className="mono">{value}</td>
    </tr>
  );
}
