import type { InchiReturnCode } from 'inchi-js';
import { inchiFromMolfile, inchikeyFromInchi } from 'inchi-js';
import { Molecule } from 'openchemlib';

import { messageOf } from './errors.ts';
import type { StructureKind } from './types.ts';

/** Options of {@link structureToInchi}. */
export interface StructureToInchiOptions {
  /**
   * Whether the value is a SMILES or a molfile. Guessed from the value when
   * omitted.
   */
  kind?: StructureKind;
  /**
   * Raw InChI option string forwarded to the C API, e.g. `'-FixedH -SNon'`.
   * @default ''
   */
  inchiOptions?: string;
}

/** Result of {@link structureToInchi}. */
export interface StructureToInchiResult {
  /** The molfile the InChI was computed from (empty when the input was unusable). */
  molfile: string;
  /** The SMILES of the structure (empty when it could not be derived). */
  smiles: string;
  /** The InChI string (empty on failure). */
  inchi: string;
  /** The InChIKey (empty on failure). */
  inchikey: string;
  /** The AuxInfo layer (empty on failure). */
  auxinfo: string;
  /** Warning or error message, empty when the structure converted cleanly. */
  message: string;
  /** Return code from the InChI C API (`-1` error, `0` ok, `1` warning). */
  returnCode: InchiReturnCode;
}

/**
 * Convert one SMILES or molfile into its InChI and InChIKey.
 *
 * A SMILES is first turned into a molfile with `openchemlib`, which invents 2D
 * coordinates and wedge bonds so the stereochemistry survives into the InChI.
 * A molfile takes the opposite trip, so every record carries both notations.
 * Failures never throw: they come back as `returnCode: -1` plus a message, so a
 * single bad record cannot abort a whole file conversion.
 * @param structure - The SMILES or molfile to convert.
 * @param options - Structure kind and InChI options.
 * @returns The InChI, InChIKey, SMILES, and the molfile they were derived from.
 */
export async function structureToInchi(
  structure: string,
  options: StructureToInchiOptions = {},
): Promise<StructureToInchiResult> {
  const { kind = guessKind(structure), inchiOptions = '' } = options;
  if (!structure.trim()) {
    return failure('', 'empty structure');
  }

  // A molfile is passed through verbatim: its first line is the title and
  // trimming it would shift the whole connection table.
  let molfile = structure;
  let smiles = structure.trim();
  if (kind === 'smiles') {
    try {
      molfile = Molecule.fromSmiles(smiles).toMolfile();
    } catch (error) {
      return failure('', `invalid SMILES: ${messageOf(error)}`);
    }
  } else {
    smiles = molfileToSmiles(molfile);
  }

  const result = await inchiFromMolfile(molfile, { options: inchiOptions });
  if (result.returnCode === -1) {
    return failure(
      molfile,
      result.message || 'InChI generation failed',
      smiles,
    );
  }

  // The InChI, the InChIKey and the AuxInfo are always computed: which of them
  // a caller keeps is a display and export choice, made after the fact. The
  // AuxInfo comes back from the call above at no cost, and the key is one
  // cheap hash, so nothing is gained by skipping either.
  const key = await inchikeyFromInchi(result.inchi);
  return {
    molfile,
    smiles,
    inchi: result.inchi,
    inchikey: key.inchikey,
    auxinfo: result.auxinfo,
    message: result.message || (key.returnCode === -1 ? key.message : ''),
    returnCode: result.returnCode,
  };
}

/**
 * Guess whether a value is a molfile or a SMILES.
 * @param structure - The raw value.
 * @returns `'molfile'` when the value carries a connection-table marker.
 */
export function guessKind(structure: string): StructureKind {
  return /^M {2}END\s*$/m.test(structure) || /\bV[23]000\b/.test(structure)
    ? 'molfile'
    : 'smiles';
}

// A molfile that openchemlib cannot read comes back as an empty molecule, so
// an unusable record yields an empty SMILES rather than throwing.
function molfileToSmiles(molfile: string): string {
  try {
    return Molecule.fromMolfile(molfile).toIsomericSmiles();
  } catch {
    return '';
  }
}

function failure(
  molfile: string,
  message: string,
  smiles = '',
): StructureToInchiResult {
  return {
    molfile,
    smiles,
    inchi: '',
    inchikey: '',
    auxinfo: '',
    message,
    returnCode: -1,
  };
}
