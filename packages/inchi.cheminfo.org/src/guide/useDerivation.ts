import { inchiFromMolfile, inchikeyFromInchi } from 'inchi-js';
import { Molecule } from 'openchemlib';
import { useEffect, useState } from 'react';

import { messageOf } from '../messageOf.ts';

import type { Derivation } from './inchi/derivation.ts';
import { buildDerivation } from './inchi/derivation.ts';

export interface DerivationResult {
  molecule: Molecule | null;
  molfile: string;
  inchi: string;
  auxinfo: string;
  inchikey: string;
  derivation: Derivation | null;
  warning: string;
  error: string | null;
  pending: boolean;
  /** The structure this result was computed from. */
  smiles: string;
}

const EMPTY: DerivationResult = {
  molecule: null,
  molfile: '',
  inchi: '',
  auxinfo: '',
  inchikey: '',
  derivation: null,
  warning: '',
  error: null,
  pending: false,
  smiles: '',
};

/**
 * Run a structure through the engine and through the hand derivation, so
 * a panel can show the two side by side.
 * @param smiles - The structure to work on.
 * @param options - Extra options for the InChI engine, e.g. `-FixedH`.
 * @default options no extra options
 * @returns The engine output, the derivation, and the request state.
 */
export function useDerivation(
  smiles: string,
  options?: string,
): DerivationResult {
  const [result, setResult] = useState<DerivationResult>(EMPTY);
  const trimmed = smiles.trim();

  useEffect(() => {
    let cancelled = false;
    // The conversion calls into WebAssembly, an external system, so the
    // state lands from the promise rather than during render.
    void run(trimmed, options).then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [trimmed, options]);

  // Anything still being computed is reported as pending rather than
  // written into state up front, which would re-render for nothing.
  if (result.smiles === trimmed) return result;
  return { ...EMPTY, pending: trimmed !== '', smiles: result.smiles };
}

async function run(
  smiles: string,
  options: string | undefined,
): Promise<DerivationResult> {
  if (!smiles) return { ...EMPTY, smiles };
  let molecule: Molecule;
  let molfile: string;
  try {
    molecule = Molecule.fromSmiles(smiles);
    if (molecule.getAllAtoms() === 0) {
      return { ...EMPTY, smiles, error: 'The structure is empty.' };
    }
    molfile = molecule.toMolfile();
  } catch (error) {
    return { ...EMPTY, smiles, error: messageOf(error) };
  }
  try {
    const inchi = await inchiFromMolfile(
      molfile,
      options ? { options } : undefined,
    );
    if (inchi.returnCode === -1 || !inchi.inchi) {
      return {
        ...EMPTY,
        smiles,
        molecule,
        molfile,
        error: inchi.message || inchi.log || 'InChI generation failed.',
      };
    }
    const key = await inchikeyFromInchi(inchi.inchi);
    return {
      molecule,
      molfile,
      inchi: inchi.inchi,
      auxinfo: inchi.auxinfo,
      inchikey: key.inchikey,
      derivation: buildDerivation(molecule, inchi.inchi, inchi.auxinfo),
      warning: inchi.returnCode === 1 ? inchi.message : '',
      error: null,
      pending: false,
      smiles,
    };
  } catch (error) {
    return { ...EMPTY, smiles, molecule, molfile, error: messageOf(error) };
  }
}
