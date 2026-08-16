import type * as OCLNamespace from 'openchemlib';

import { structureFromInchi } from './structureFromInchi.ts';
import type {
  StructureAtom,
  StructureFromInchiOptions,
  StructureFromInchiResult,
  StructureStereo,
} from './types.ts';

type OCL = typeof OCLNamespace;
type Molecule = OCLNamespace.Molecule;

const INCHI_STEREO_TYPE_TETRAHEDRAL = 2;

const INCHI_BOND_TYPE_SINGLE = 1;
const INCHI_BOND_TYPE_DOUBLE = 2;
const INCHI_BOND_TYPE_TRIPLE = 3;
const INCHI_BOND_TYPE_AROMATIC = 4;

/**
 * Result of `oclMoleculeFromInchi`.
 */
export interface OclMoleculeFromInchiResult {
  /**
   * The OCL `Molecule` (with 2D coords and wedge bonds), or `null` when
   * the InChI could not be parsed (`returnCode === -1`).
   */
  molecule: Molecule | null;
  /** Return code from the underlying C API (`-1` error, `0` ok, `1` warning). */
  returnCode: -1 | 0 | 1;
  /** Human-readable message (warnings/errors). */
  message: string;
  /** Detailed log from the C API. */
  log: string;
}

/**
 * Parses an InChI string into an `openchemlib` `Molecule` with 2D
 * coordinates, wedge bonds, and tetrahedral parities materialised from
 * the InChI 0D stereo layer.
 *
 * `openchemlib` is **not** a runtime dependency of `inchi-js` — the
 * caller passes their own `OCL` namespace so the same `Molecule` build
 * (regular, debug, …) is used end-to-end and only one copy ends up in
 * the consumer's bundle. Use {@link oclMoleculeFromStructure}
 * synchronously if you already hold a parsed structure.
 * @param inchi - The full InChI string.
 * @param OCL - The `openchemlib` module (e.g. `import * as OCL from 'openchemlib'`).
 * @param options - Optional InChI option string passed to `structureFromInchi`.
 * @returns The OCL `Molecule` (or `null` on error) plus the C API status.
 */
export async function oclMoleculeFromInchi(
  inchi: string,
  OCL: OCL,
  options: StructureFromInchiOptions = {},
): Promise<OclMoleculeFromInchiResult> {
  const structure = await structureFromInchi(inchi, options);
  const molecule =
    structure.returnCode === -1
      ? null
      : oclMoleculeFromStructure(structure, OCL);
  return {
    molecule,
    returnCode: structure.returnCode,
    message: structure.message,
    log: structure.log,
  };
}

/**
 * Builds an `openchemlib` `Molecule` from the raw structure that
 * {@link structureFromInchi} extracts from the IUPAC InChI library,
 * applies the parsed 0D tetrahedral stereo as OCL atom parities,
 * invents 2D coordinates, and materialises wedge bonds.
 *
 * Plain explicit Hs returned by the InChI library are deliberately
 * skipped — OCL manages them as implicit Hs and `inventCoordinates()`
 * would strip them anyway. The parity translation maps any skipped H
 * (or any InChI `No_Neighbor` / centralAtom-as-sentinel slot) to a
 * pseudo-index above every real atom, which matches OCL's "implicit H
 * goes to the back" convention.
 * @param structure - The parsed structure from `structureFromInchi`.
 * @param OCL - The `openchemlib` module (e.g. `import * as OCL from 'openchemlib'`).
 * @returns A ready-to-render OCL `Molecule` with 2D coords and wedge bonds.
 */
export function oclMoleculeFromStructure(
  structure: StructureFromInchiResult,
  OCL: OCL,
): Molecule {
  const { atoms, stereo } = structure;
  const atomCount = atoms.length;

  const molecule = new OCL.Molecule(
    Math.max(atomCount, 16),
    Math.max(atomCount * 2, 16),
  );

  const inchiToOcl = new Array<number>(atomCount).fill(-1);
  for (let i = 0; i < atomCount; i++) {
    const atom = atoms[i];
    if (!atom) continue;
    if (isPlainHydrogen(atom)) continue;
    const atomicNo = OCL.Molecule.getAtomicNoFromLabel(atom.element);
    const oclIndex = molecule.addAtom(atomicNo);
    if (atom.charge) molecule.setAtomCharge(oclIndex, atom.charge);
    if (atom.isotopicMass) molecule.setAtomMass(oclIndex, atom.isotopicMass);
    if (atom.radical) molecule.setAtomRadical(oclIndex, atom.radical);
    inchiToOcl[i] = oclIndex;
  }

  for (let i = 0; i < atomCount; i++) {
    const fromAtom = atoms[i];
    if (!fromAtom) continue;
    const fromOcl = inchiToOcl[i];
    if (fromOcl === undefined || fromOcl === -1) continue;
    for (const bond of fromAtom.bonds) {
      if (i >= bond.to) continue;
      const toOcl = inchiToOcl[bond.to];
      if (toOcl === undefined || toOcl === -1) continue;
      const oclBondIndex = molecule.addBond(fromOcl, toOcl);
      const oclBondType = inchiBondTypeToOcl(bond.type, OCL);
      if (oclBondType !== OCL.Molecule.cBondTypeSingle) {
        molecule.setBondType(oclBondIndex, oclBondType);
      }
    }
  }

  for (const entry of stereo) {
    if (entry.type !== INCHI_STEREO_TYPE_TETRAHEDRAL) continue;
    const centralOcl = inchiToOcl[entry.centralAtom];
    if (centralOcl === undefined || centralOcl === -1) continue;
    const oclParity = translateTetrahedralParity(entry, inchiToOcl, OCL);
    if (oclParity === OCL.Molecule.cAtomParityNone) continue;
    molecule.setAtomParity(centralOcl, oclParity, false);
  }

  // Declare the just-set parities as authoritative so the Canonizer
  // doesn't recompute them from (still-missing) 2D coordinates.
  molecule.setParitiesValid(0);
  molecule.inventCoordinates();
  molecule.setStereoBondsFromParity();

  return molecule;
}

function isPlainHydrogen(atom: StructureAtom): boolean {
  return (
    atom.element === 'H' &&
    atom.charge === 0 &&
    atom.radical === 0 &&
    atom.isotopicMass === 0
  );
}

/**
 * Maps an InChI 0D tetrahedral parity to OCL's atom parity.
 *
 * InChI's convention (`inchi_Stereo0D`): given `neighbour[0..3]` with
 * `parity` = `'e'` (even, value 2) or `'o'` (odd, value 1), parity `'e'`
 * means `(neighbour[1], neighbour[2], neighbour[3])` appear clockwise
 * when viewed from `neighbour[0]`.
 *
 * OCL's convention (`Molecule.setAtomParity`): with the highest-indexed
 * neighbour (or the implicit H) in the back and the remaining three
 * listed in ascending atom index, parity 1 means CW from the front and
 * parity 2 means CCW.
 *
 * Translation: compute the sign of the permutation that re-orders
 * InChI's neighbour list into `[highest, others_ascending]` (mapping
 * every InChI atom index through `inchiToOcl`, and replacing any
 * implicit-H slot — InChI's `-1` `No_Neighbor`, the 3-explicit-
 * neighbour `centralAtom`-as-sentinel, or any plain H we omitted from
 * the OCL graph — with a pseudo-index above every real OCL atom). The
 * InChI parity sign times that permutation sign is the sign in OCL's
 * canonical ordering, which maps directly to OCL parity 1 (negative)
 * or 2 (positive).
 * @param entry - The InChI 0D stereo descriptor.
 * @param inchiToOcl - Map from InChI atom index to OCL atom index,
 *   `-1` for atoms (plain Hs) deliberately omitted from the OCL graph.
 * @param OCL - The `openchemlib` module.
 * @returns The matching `Molecule.cAtomParity*` constant.
 */
function translateTetrahedralParity(
  entry: StructureStereo,
  inchiToOcl: number[],
  OCL: OCL,
): number {
  if (entry.parity === 0) return OCL.Molecule.cAtomParityNone;
  if (entry.parity === 3 || entry.parity === 4) {
    return OCL.Molecule.cAtomParityUnknown;
  }
  if (entry.parity !== 1 && entry.parity !== 2) {
    // Combined connected/disconnected parity (ParityOfConnected |
    // ParityOfDisconnected << 3) — fall back to the lower 3 bits.
    const connected = entry.parity & 0b111;
    if (connected === 1 || connected === 2) {
      return translateTetrahedralParity(
        { ...entry, parity: connected },
        inchiToOcl,
        OCL,
      );
    }
    return OCL.Molecule.cAtomParityUnknown;
  }

  const phantomBase = inchiToOcl.length;
  let phantomCounter = 0;
  const indexed = entry.neighbors.map((nb) => {
    if (nb === -1) return phantomBase + phantomCounter++;
    if (nb === entry.centralAtom) return phantomBase + phantomCounter++;
    const ocl = inchiToOcl[nb];
    if (ocl === undefined || ocl === -1) {
      return phantomBase + phantomCounter++;
    }
    return ocl;
  });

  const ascending = [...indexed].toSorted((a, b) => a - b);
  const canonical = [ascending[3], ascending[0], ascending[1], ascending[2]];
  const permSign = permutationSign(indexed, canonical as number[]);

  const inchiSign = entry.parity === 2 ? 1 : -1;
  const canonicalSign = inchiSign * permSign;

  return canonicalSign === 1
    ? OCL.Molecule.cAtomParity2
    : OCL.Molecule.cAtomParity1;
}

function permutationSign(from: number[], to: number[]): number {
  const perm = from.map((value) => to.indexOf(value));
  const work = [...perm];
  let swaps = 0;
  for (let i = 0; i < work.length; i++) {
    while (work[i] !== i) {
      const target = work[i];
      if (target === undefined) break;
      const tmp = work[target];
      if (tmp === undefined) break;
      work[target] = target;
      work[i] = tmp;
      swaps++;
    }
  }
  return swaps % 2 === 0 ? 1 : -1;
}

function inchiBondTypeToOcl(inchiBondType: number, OCL: OCL): number {
  switch (inchiBondType) {
    case INCHI_BOND_TYPE_SINGLE:
      return OCL.Molecule.cBondTypeSingle;
    case INCHI_BOND_TYPE_DOUBLE:
      return OCL.Molecule.cBondTypeDouble;
    case INCHI_BOND_TYPE_TRIPLE:
      return OCL.Molecule.cBondTypeTriple;
    case INCHI_BOND_TYPE_AROMATIC:
      return OCL.Molecule.cBondTypeDelocalized;
    default:
      return OCL.Molecule.cBondTypeSingle;
  }
}
