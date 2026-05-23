import type {
  StructureAtom,
  StructureFromInchiResult,
  StructureStereo,
} from 'inchi-js';
import { Molecule } from 'openchemlib';

const INCHI_STEREO_TYPE_TETRAHEDRAL = 2;

const INCHI_BOND_TYPE_SINGLE = 1;
const INCHI_BOND_TYPE_DOUBLE = 2;
const INCHI_BOND_TYPE_TRIPLE = 3;
const INCHI_BOND_TYPE_AROMATIC = 4;

/**
 * Builds an `openchemlib` `Molecule` from the raw structure that
 * `structureFromInchi` extracts from the IUPAC InChI library, applies
 * the parsed 0D tetrahedral stereo as OCL atom parities, invents 2D
 * coordinates, and materialises wedge bonds.
 *
 * The result can be passed straight to `react-ocl`'s `SvgRenderer`
 * for display, or serialised with `toMolfile()` / `toIsomericSmiles()`
 * — and unlike the IUPAC `-OutputSDF` writer, the stereochemistry
 * round-trips back into the source InChI.
 *
 * Hydrogens are intentionally treated as implicit even when the InChI
 * library returns them as explicit atoms: OCL's `inventCoordinates()`
 * silently strips explicit Hs, which reshuffles the "highest-index
 * neighbour" used by OCL's parity convention and silently inverts the
 * chirality at any centre whose explicit H was the highest neighbour.
 * Skipping Hs at construction time keeps the parity translation
 * self-consistent.
 * @param structure - The parsed structure from `structureFromInchi`.
 * @returns A ready-to-render OCL `Molecule` with 2D coords and wedge bonds.
 */
export function inchiStructureToOclMolecule(
  structure: StructureFromInchiResult,
): Molecule {
  const { atoms, stereo } = structure;
  const atomCount = atoms.length;

  const molecule = new Molecule(
    Math.max(atomCount, 16),
    Math.max(atomCount * 2, 16),
  );

  // Map InChI atom indices → OCL atom indices, with `-1` for any InChI
  // atom we deliberately skip (explicit H atoms with no isotope or
  // charge — they belong on the implicit-H count of their neighbour).
  const inchiToOcl = new Array<number>(atomCount).fill(-1);
  for (let i = 0; i < atomCount; i++) {
    const atom = atoms[i];
    if (!atom) continue;
    if (isPlainHydrogen(atom)) continue;
    const atomicNo = Molecule.getAtomicNoFromLabel(atom.element);
    const oclIndex = molecule.addAtom(atomicNo);
    if (atom.charge) molecule.setAtomCharge(oclIndex, atom.charge);
    if (atom.isotopicMass) molecule.setAtomMass(oclIndex, atom.isotopicMass);
    if (atom.radical) molecule.setAtomRadical(oclIndex, atom.radical);
    inchiToOcl[i] = oclIndex;
  }

  // Each bond appears in either or both adjacency lists; iterate from
  // the low-indexed endpoint to avoid double-adding. Bonds to skipped
  // (plain-H) atoms are dropped — OCL will recover them via implicit
  // hydrogens on the heavy-atom side.
  for (let i = 0; i < atomCount; i++) {
    const fromAtom = atoms[i];
    if (!fromAtom) continue;
    const fromOcl = inchiToOcl[i];
    if (fromOcl === -1) continue;
    for (const bond of fromAtom.bonds) {
      if (i >= bond.to) continue;
      const toOcl = inchiToOcl[bond.to];
      if (toOcl === -1) continue;
      const oclBondIndex = molecule.addBond(fromOcl, toOcl);
      const oclBondType = inchiBondTypeToOcl(bond.type);
      if (oclBondType !== Molecule.cBondTypeSingle) {
        molecule.setBondType(oclBondIndex, oclBondType);
      }
    }
  }

  for (const entry of stereo) {
    if (entry.type !== INCHI_STEREO_TYPE_TETRAHEDRAL) continue;
    const centralOcl = inchiToOcl[entry.centralAtom];
    if (centralOcl === undefined || centralOcl === -1) continue;
    const oclParity = translateTetrahedralParity(entry, inchiToOcl);
    if (oclParity === Molecule.cAtomParityNone) continue;
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
 * Maps an InChI 0D tetrahedral parity to OCL's atom parity, accounting
 * for the difference in neighbour ordering (InChI uses its native
 * neighbour list; OCL sorts neighbours by atom index with the implicit
 * H / highest index in the back) and the resulting view-direction sign
 * change.
 *
 * Tracks the sign of the permutation that re-orders InChI's neighbour
 * list into OCL's canonical `[highest, others_ascending]` ordering,
 * after mapping every InChI neighbour through `inchiToOcl`. Any
 * neighbour that we skipped at construction (plain Hs) or that InChI
 * itself flagged as implicit (the `-1` `No_Neighbor` slot, or the
 * 3-explicit-neighbour case's `centralAtom`-as-sentinel) becomes a
 * pseudo-index that sorts above every real OCL atom, matching OCL's
 * "implicit H goes to the back" convention. The InChI parity sign
 * times that permutation sign is the sign in OCL's canonical ordering,
 * which translates directly to OCL parity 1 (negative) or 2 (positive).
 * @param entry - The InChI 0D stereo descriptor.
 * @param inchiToOcl - Map from InChI atom index to OCL atom index,
 *   `-1` for atoms (plain Hs) deliberately omitted from the OCL graph.
 * @returns The matching `Molecule.cAtomParity*` constant.
 */
function translateTetrahedralParity(
  entry: StructureStereo,
  inchiToOcl: number[],
): number {
  if (entry.parity === 0) return Molecule.cAtomParityNone;
  if (entry.parity === 3 || entry.parity === 4) {
    return Molecule.cAtomParityUnknown;
  }
  if (entry.parity !== 1 && entry.parity !== 2) {
    // Combined connected/disconnected parity (ParityOfConnected |
    // ParityOfDisconnected << 3) — fall back to the lower 3 bits.
    const connected = entry.parity & 0b111;
    if (connected === 1 || connected === 2) {
      return translateTetrahedralParity(
        { ...entry, parity: connected },
        inchiToOcl,
      );
    }
    return Molecule.cAtomParityUnknown;
  }

  // Any neighbour we treat as implicit-H from OCL's perspective gets a
  // pseudo-index above every real OCL atom. That covers: InChI's `-1`
  // `No_Neighbor` slot, the 3-explicit-neighbour sentinel where
  // `neighbour[0] === centralAtom`, AND every plain explicit H we
  // dropped from the OCL graph (which OCL now treats as implicit).
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

  return canonicalSign === 1 ? Molecule.cAtomParity2 : Molecule.cAtomParity1;
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

function inchiBondTypeToOcl(inchiBondType: number): number {
  switch (inchiBondType) {
    case INCHI_BOND_TYPE_SINGLE:
      return Molecule.cBondTypeSingle;
    case INCHI_BOND_TYPE_DOUBLE:
      return Molecule.cBondTypeDouble;
    case INCHI_BOND_TYPE_TRIPLE:
      return Molecule.cBondTypeTriple;
    case INCHI_BOND_TYPE_AROMATIC:
      return Molecule.cBondTypeDelocalized;
    default:
      return Molecule.cBondTypeSingle;
  }
}
