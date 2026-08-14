import { inchiFromMolfile } from 'inchi-js';
import { Molecule } from 'openchemlib';
import { expect, test } from 'vitest';

/**
 * Minimal OCL bug reproducer
 * --------------------------
 *
 * Setup: two simple 6-ring molecules. In each case the chiral atom is a
 * ring carbon bearing exactly the same local connectivity — three single
 * single bonds to (methyl, ring-CH2, ring-CH2) plus one implicit H. The
 * only difference is the substituent on the OPPOSITE side of the ring
 * (a carbonyl in case A, an exocyclic vinyl in case B).
 *
 *   Case A : 3-methyl-cyclohexan-1-one
 *               O               H₃C
 *               ‖                \
 *               C                 C*  ← chiral, parity tested here
 *              / \               / \
 *             …   …       ←ring→
 *
 *   Case B : 4-(2-buten-1-ylidene)-1-methyl-cyclohexane (exocyclic =CH-CH=CH-CH₃)
 *
 * For each case, two molfiles are generated via OCL by calling:
 *
 *   m.setAtomParity(chiralAtom, P, false);
 *   m.setParitiesValid(0);
 *   m.inventCoordinates();
 *   m.setStereoBondsFromParity();
 *   const molfile = m.toMolfile();
 *
 * with P = 1 (cAtomParity1) and P = 2 (cAtomParity2).
 *
 * Each molfile is then:
 *   (a) re-parsed by OCL — OCL's perceived parity must equal P (self-consistency)
 *   (b) converted to InChI via the IUPAC InChI library
 *
 * Result: OCL's self-consistency check (a) PASSES in all four cases.
 *
 *   ┌────────────────────┬──────┬──────────────────────────────────────────────────────┐
 *   │ molecule           │ OCL  │ InChI                                                │
 *   │                    │ par. │                                                      │
 *   ├────────────────────┼──────┼──────────────────────────────────────────────────────┤
 *   │ Case A (cyclohex.) │  1   │ …/t6-/m0/s1                                          │
 *   │ Case A (cyclohex.) │  2   │ …/t6-/m1/s1                                          │
 *   │ Case B (vinyl)     │  1   │ …/b9-3-/t8-/m1/s1   ← /m flipped vs. Case A          │
 *   │ Case B (vinyl)     │  2   │ …/b9-3-/t8-/m0/s1                                    │
 *   └────────────────────┴──────┴──────────────────────────────────────────────────────┘
 *
 * Why this is an OCL bug: the chiral atom in both cases has the EXACT same
 * local arrangement — three single bonds to (methyl, ring-CH2, ring-CH2) +
 * implicit H — and OCL's inventCoordinates() places them in the same
 * angular pattern around the chiral atom (methyl at -150°/+30°, two ring
 * carbons at the other two corners of a triangle). OCL's
 * `setStereoBondsFromParity()` then emits a wedge DOWN on the methyl bond
 * for parity=1 in BOTH cases. So OCL is asserting that "wedge-DOWN-on-
 * methyl + this 2D layout = parity 1 = a specific chirality". The InChI
 * library, applying the MDL/IUPAC stereo standard to the SAME wedge +
 * SAME local layout, derives OPPOSITE absolute configurations (/m0 vs
 * /m1) for the two molecules. Since the local stereo geometry around the
 * chiral atom is identical, the only thing that can have changed the
 * answer is OCL's geometric reasoning being affected by a remote
 * substituent — which it must not be.
 *
 * To run:
 *   npx vitest run --no-coverage ocl-stereo-bug
 */

interface Case {
  label: string;
  atomicNos: number[];
  // [from, to, bondType (cBondType*)]
  bonds: Array<[number, number, number]>;
  chiralAtom: number;
}

const CASE_A: Case = {
  label: '3-methylcyclohexan-1-one',
  atomicNos: [6, 6, 6, 6, 6, 6, 6, 8],
  bonds: [
    [0, 1, Molecule.cBondTypeSingle], // methyl - C*
    [1, 2, Molecule.cBondTypeSingle], // ring C* - CH2
    [2, 3, Molecule.cBondTypeSingle], // ring CH2 - CH2
    [3, 4, Molecule.cBondTypeSingle], // ring CH2 - CH2
    [4, 5, Molecule.cBondTypeSingle], // ring CH2 - C(=O)
    [5, 7, Molecule.cBondTypeDouble], // C=O
    [5, 6, Molecule.cBondTypeSingle], // C(=O) - CH2
    [6, 1, Molecule.cBondTypeSingle], // CH2 - C* (close ring)
  ],
  chiralAtom: 1,
};

const CASE_B: Case = {
  label: '4-(2-buten-1-ylidene)-1-methylcyclohexane',
  atomicNos: [6, 6, 6, 6, 6, 6, 6, 6, 6],
  bonds: [
    [0, 2, Molecule.cBondTypeSingle], // vinyl-terminal CH3 - CH
    [2, 8, Molecule.cBondTypeDouble], // CH = C (exocyclic)
    [8, 5, Molecule.cBondTypeSingle], // ring
    [5, 3, Molecule.cBondTypeSingle], // ring
    [3, 7, Molecule.cBondTypeSingle], // ring CH2 - C*
    [7, 1, Molecule.cBondTypeSingle], // C* - methyl
    [7, 4, Molecule.cBondTypeSingle], // C* - ring CH2
    [4, 6, Molecule.cBondTypeSingle], // ring
    [6, 8, Molecule.cBondTypeSingle], // ring (close)
  ],
  chiralAtom: 7,
};

function buildMolfile(spec: Case, parity: 1 | 2): string {
  const m = new Molecule(64, 64);
  for (const z of spec.atomicNos) m.addAtom(z);
  for (const [a, b, t] of spec.bonds) {
    const bondIdx = m.addBond(a, b);
    if (t !== Molecule.cBondTypeSingle) m.setBondType(bondIdx, t);
  }
  m.setAtomParity(spec.chiralAtom, parity, false);
  m.setParitiesValid(0);
  m.inventCoordinates();
  m.setStereoBondsFromParity();
  return m.toMolfile();
}

test('OCL is internally self-consistent: parity in == parity re-parsed', () => {
  for (const spec of [CASE_A, CASE_B]) {
    for (const parity of [1, 2] as const) {
      const molfile = buildMolfile(spec, parity);
      const reparsed = Molecule.fromMolfile(molfile);
      reparsed.ensureHelperArrays(Molecule.cHelperParities);

      expect(reparsed.getAtomParity(spec.chiralAtom)).toBe(parity);
    }
  }
});

async function inchiOf(molfile: string) {
  const result = await inchiFromMolfile(molfile);
  return result.inchi;
}

function mFlag(inchi: string) {
  return inchi.match(/\/m(?<flag>[01])\b/)?.groups?.flag;
}

test('BUG: OCL parity ↔ InChI /m mapping flips between case A and case B', async () => {
  const mfA1 = buildMolfile(CASE_A, 1);
  const mfA2 = buildMolfile(CASE_A, 2);
  const mfB1 = buildMolfile(CASE_B, 1);
  const mfB2 = buildMolfile(CASE_B, 2);

  const [iA1, iA2, iB1, iB2] = await Promise.all([
    inchiOf(mfA1),
    inchiOf(mfA2),
    inchiOf(mfB1),
    inchiOf(mfB2),
  ]);

  // eslint-disable-next-line no-console
  console.log(
    `\nA p=1 → ${iA1}\n` +
      `A p=2 → ${iA2}\n` +
      `B p=1 → ${iB1}\n` +
      `B p=2 → ${iB2}\n`,
  );

  // Case A: parity 1 → /m0, parity 2 → /m1
  expect(mFlag(iA1)).toBe('0');
  expect(mFlag(iA2)).toBe('1');
  // Case B: parity 1 → /m1, parity 2 → /m0 — INVERTED vs. case A.
  expect(mFlag(iB1)).toBe('1');
  expect(mFlag(iB2)).toBe('0');
});
