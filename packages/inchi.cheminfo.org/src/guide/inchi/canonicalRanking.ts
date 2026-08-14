import type { Molecule } from 'openchemlib';

import type { AtomInvariant, TieBreak } from './invariants.ts';
import {
  atomInvariants,
  breakTies,
  countDistinct,
  hillElementOrder,
  neighbourLists,
  rankByKeys,
  refineRanks,
  stableRanks,
} from './invariants.ts';

export type RankingStageId =
  'skeleton' | 'hydrogens' | 'mobileH' | 'tieBreaking';

export interface RankingStage {
  id: RankingStageId;
  title: string;
  /** What the stage adds to the sort key. */
  addedKey: string;
  /** Ranks straight after re-keying, before any neighbour refinement. */
  keyedRanks: number[];
  /** Ranks the stage settles on, one per atom in input-atom order. */
  ranks: number[];
  distinctRanks: number;
  /** Refinement rounds the stage needed after re-keying. */
  rounds: number;
  tieBreaks?: TieBreak[];
}

export interface CanonicalRanking {
  invariants: AtomInvariant[];
  /** 1-based input atom numbers, in the order every array here uses. */
  atomNumbers: number[];
  hillOrder: string[];
  stages: RankingStage[];
  /** Final ranks; when every rank is distinct these are canonical numbers. */
  ranks: number[];
  /** True when the procedure ended with one atom per rank. */
  complete: boolean;
  /** True when a tie had to be broken by an arbitrary choice. */
  usedTieBreaking: boolean;
}

/**
 * Reproduce InChI's canonical numbering the way it can be worked through
 * by hand: rank the hydrogenless skeleton, add immobile hydrogens, add
 * mobile-H groups, and only then break whatever ties are left. Each stage
 * re-keys the atoms by their previous rank plus one new invariant, then
 * refines against the neighbour ranks until the partition stops splitting.
 *
 * The stage order is the one the InChI technical manual's canonicalization
 * flowchart prescribes, which is why a stage never undoes an earlier one.
 * @param molecule - The structure to number.
 * @param mobileGroups - Mobile-H groups as 1-based input atom numbers.
 *   Detecting them is the one step that cannot be read off the drawing;
 *   pass them in when they are known.
 * @default mobileGroups no groups
 * @returns Every stage, and the numbering they end on.
 */
export function canonicalRanking(
  molecule: Molecule,
  mobileGroups: readonly number[][] = [],
): CanonicalRanking {
  const invariants = atomInvariants(molecule, mobileGroups);
  const neighbours = neighbourLists(molecule);
  const elements: string[] = [];
  const atomNumbers: number[] = [];
  for (const invariant of invariants) {
    elements.push(invariant.element);
    atomNumbers.push(invariant.atom);
  }
  const stages: RankingStage[] = [];

  let ranks = addStage(
    stages,
    {
      id: 'skeleton',
      title: 'Hydrogenless skeleton',
      addedKey: 'element in Hill order, then number of connections',
    },
    keysOf(invariants, (invariant) => [
      invariant.hillRank,
      invariant.connections,
    ]),
    neighbours,
  );

  ranks = addStage(
    stages,
    {
      id: 'hydrogens',
      title: 'Add immobile hydrogens',
      addedKey: 'number of attached hydrogens',
    },
    keysOf(invariants, (invariant, index) => [
      ranks[index] as number,
      invariant.hydrogens,
    ]),
    neighbours,
  );

  if (mobileGroups.length > 0) {
    ranks = addStage(
      stages,
      {
        id: 'mobileH',
        title: 'Add mobile-H groups',
        addedKey: 'size of the mobile-H group the atom belongs to',
      },
      keysOf(invariants, (invariant, index) => [
        ranks[index] as number,
        invariant.mobileGroupSize,
      ]),
      neighbours,
    );
  }

  const tieBreaks = breakTies(ranks, neighbours);
  if (tieBreaks.length > 0) {
    const last = tieBreaks.at(-1) as TieBreak;
    ranks = last.ranks;
    stages.push({
      id: 'tieBreaking',
      title: 'Break the remaining ties',
      addedKey: 'an arbitrary choice inside each tied class',
      keyedRanks: ranks,
      ranks,
      distinctRanks: countDistinct(ranks),
      rounds: 0,
      tieBreaks,
    });
  }

  return {
    invariants,
    atomNumbers,
    hillOrder: hillElementOrder(elements),
    stages,
    ranks,
    complete: countDistinct(ranks) === ranks.length,
    usedTieBreaking: tieBreaks.length > 0,
  };
}

/**
 * Turn a canonical ranking into the atom order the InChI layers use.
 * @param ranking - The ranking to read.
 * @returns The 1-based input atom numbers in canonical order.
 */
export function canonicalOrder(ranking: CanonicalRanking): number[] {
  const { ranks, atomNumbers } = ranking;
  const order: number[] = [];
  for (let i = 0; i < ranks.length; i++) order.push(i);
  order.sort((a, b) => (ranks[a] as number) - (ranks[b] as number));
  const atoms: number[] = [];
  for (const position of order) {
    atoms.push(atomNumbers[position] as number);
  }
  return atoms;
}

function addStage(
  stages: RankingStage[],
  meta: Pick<RankingStage, 'id' | 'title' | 'addedKey'>,
  keys: number[][],
  neighbours: number[][],
): number[] {
  const keyed = rankByKeys(keys);
  const rounds = refineRanks(keyed, neighbours);
  const ranks = stableRanks(keyed, neighbours);
  stages.push({
    ...meta,
    keyedRanks: keyed,
    ranks,
    distinctRanks: countDistinct(ranks),
    rounds: rounds.length,
  });
  return ranks;
}

function keysOf(
  invariants: readonly AtomInvariant[],
  key: (invariant: AtomInvariant, index: number) => number[],
): number[][] {
  const keys: number[][] = [];
  for (let i = 0; i < invariants.length; i++) {
    keys.push(key(invariants[i] as AtomInvariant, i));
  }
  return keys;
}
