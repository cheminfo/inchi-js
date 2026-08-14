import type { Molecule } from 'openchemlib';

import { canonicalToOriginal, originalToCanonical } from './auxinfo.ts';
import type { CanonicalRanking } from './canonicalRanking.ts';
import { canonicalOrder, canonicalRanking } from './canonicalRanking.ts';
import { parseMobileHydrogens } from './hydrogens.ts';
import type { SplitInchi } from './layers.ts';
import { findSegment, splitInchi } from './layers.ts';

export interface Derivation {
  split: SplitInchi;
  ranking: CanonicalRanking;
  /** Mobile-H groups as 1-based input atom numbers. */
  mobileGroups: number[][];
  /** Input atom number → canonical number, as the engine numbered them. */
  engineNumbers: Map<number, number>;
  /** Input atom number → canonical number, as the hand procedure numbered them. */
  handNumbers: Map<number, number>;
  /** True when the hand procedure reproduced the engine's numbering. */
  matchesEngine: boolean;
  /** Number of disconnected components the engine numbered separately. */
  componentCount: number;
}

/**
 * Work an InChI back to the numbering it was built on, both the way the
 * engine did it (read from AuxInfo) and the way it can be derived by hand,
 * so the two can be shown side by side.
 * @param molecule - The structure the InChI was computed from.
 * @param inchi - The InChI string.
 * @param auxinfo - The AuxInfo string returned alongside it.
 * @returns The parsed layers, the staged hand derivation, and both numberings.
 */
export function buildDerivation(
  molecule: Molecule,
  inchi: string,
  auxinfo: string,
): Derivation {
  const split = splitInchi(inchi);
  const components = canonicalToOriginal(auxinfo);
  const engineOrder = components[0] ?? [];
  const engineNumbers = originalToCanonical(engineOrder);
  const mobileGroups = mobileGroupsFromInchi(split, engineOrder);
  const ranking = canonicalRanking(molecule, mobileGroups);
  const handOrder = canonicalOrder(ranking);
  const handNumbers = originalToCanonical(handOrder);
  return {
    split,
    ranking,
    mobileGroups,
    engineNumbers,
    handNumbers,
    componentCount: components.length,
    matchesEngine:
      components.length === 1 &&
      ranking.complete &&
      sameOrder(handOrder, engineOrder),
  };
}

/**
 * Read the mobile-H groups out of an InChI's `/h` layer and translate the
 * canonical numbers they use back to input atom numbers.
 * @param split - The parsed InChI.
 * @param engineOrder - Input atom numbers in canonical order, from AuxInfo.
 * @returns One array of 1-based input atom numbers per mobile-H group.
 */
export function mobileGroupsFromInchi(
  split: SplitInchi,
  engineOrder: readonly number[],
): number[][] {
  const hydrogenLayer = findSegment(split, 'h');
  if (!hydrogenLayer) return [];
  const groups: number[][] = [];
  for (const group of parseMobileHydrogens(hydrogenLayer.value)) {
    const atoms: number[] = [];
    for (const atom of group.atoms) {
      const original = engineOrder[atom - 1];
      if (original !== undefined) atoms.push(original);
    }
    if (atoms.length > 0) groups.push(atoms);
  }
  return groups;
}

function sameOrder(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
