import type { Molecule } from 'openchemlib';

export interface AtomInvariant {
  /** 1-based atom number in the input connection table. */
  atom: number;
  element: string;
  /** 1-based position of the element in the Hill order of this structure. */
  hillRank: number;
  /** Number of connections to non-hydrogen atoms. */
  connections: number;
  /** Number of attached hydrogens; 0 on a mobile-H endpoint. */
  hydrogens: number;
  /** Size of the mobile-H group this atom belongs to, 0 when it is in none. */
  mobileGroupSize: number;
}

/**
 * Order the elements of a structure the way InChI's first atom invariant
 * does: carbon first, every other element alphabetically after it, and
 * hydrogen last.
 * @param elements - Element symbols occurring in the structure.
 * @returns The distinct symbols in Hill order.
 */
export function hillElementOrder(elements: Iterable<string>): string[] {
  const rest: string[] = [];
  let hasCarbon = false;
  let hasHydrogen = false;
  for (const element of elements) {
    if (element === 'C') hasCarbon = true;
    else if (element === 'H') hasHydrogen = true;
    else if (!rest.includes(element)) rest.push(element);
  }
  rest.sort();
  const order: string[] = [];
  if (hasCarbon) order.push('C');
  order.push(...rest);
  if (hasHydrogen) order.push('H');
  return order;
}

/**
 * List the heavy atoms of a structure. InChI numbers the skeleton only,
 * so explicitly drawn hydrogens — including labelled ones — are left out
 * of the graph and counted as attached hydrogens instead.
 * @param molecule - The structure to analyse.
 * @returns The 0-based indices of the non-hydrogen atoms.
 */
export function heavyAtoms(molecule: Molecule): number[] {
  const indices: number[] = [];
  const atomCount = molecule.getAllAtoms();
  for (let i = 0; i < atomCount; i++) {
    if (molecule.getAtomLabel(i) !== 'H') indices.push(i);
  }
  return indices;
}

/**
 * Compute the per-atom invariants the canonical numbering is built from.
 * @param molecule - The structure to analyse.
 * @param mobileGroups - Mobile-H groups, each listing the 1-based numbers
 *   of the atoms a hydrogen moves between. A hydrogen inside such a group
 *   belongs to the group rather than to one atom, so it is not counted on
 *   any of them.
 * @default mobileGroups no groups
 * @returns One entry per heavy atom, in input-atom order.
 */
export function atomInvariants(
  molecule: Molecule,
  mobileGroups: readonly number[][] = [],
): AtomInvariant[] {
  const groupSize = new Map<number, number>();
  for (const group of mobileGroups) {
    for (const atom of group) {
      groupSize.set(atom, group.length);
    }
  }
  const indices = heavyAtoms(molecule);
  const elements: string[] = [];
  for (const index of indices) {
    elements.push(molecule.getAtomLabel(index));
  }
  const order = hillElementOrder(elements);
  const invariants: AtomInvariant[] = [];
  for (let i = 0; i < indices.length; i++) {
    const index = indices[i] as number;
    const element = elements[i] ?? 'C';
    const inGroup = groupSize.get(index + 1) ?? 0;
    invariants.push({
      atom: index + 1,
      element,
      hillRank: order.indexOf(element) + 1,
      connections: countHeavyNeighbours(molecule, index),
      hydrogens: inGroup > 0 ? 0 : molecule.getAllHydrogens(index),
      mobileGroupSize: inGroup,
    });
  }
  return invariants;
}

/**
 * Build the adjacency list of the heavy-atom skeleton, indexed the same
 * way `atomInvariants` indexes its result.
 * @param molecule - The structure to analyse.
 * @returns For each heavy atom, the positions of its heavy neighbours.
 */
export function neighbourLists(molecule: Molecule): number[][] {
  const indices = heavyAtoms(molecule);
  const position = new Map<number, number>();
  for (let i = 0; i < indices.length; i++) {
    position.set(indices[i] as number, i);
  }
  const lists: number[][] = [];
  for (const index of indices) {
    const neighbours: number[] = [];
    const connected = molecule.getConnAtoms(index);
    for (let k = 0; k < connected; k++) {
      const neighbour = position.get(molecule.getConnAtom(index, k));
      if (neighbour !== undefined) neighbours.push(neighbour);
    }
    lists.push(neighbours);
  }
  return lists;
}

function countHeavyNeighbours(molecule: Molecule, index: number): number {
  let count = 0;
  const connected = molecule.getConnAtoms(index);
  for (let k = 0; k < connected; k++) {
    if (molecule.getAtomLabel(molecule.getConnAtom(index, k)) !== 'H') count++;
  }
  return count;
}

/**
 * Rank atoms by a sort key, giving tied atoms the same rank. Following
 * InChI, the rank of a class is the highest 1-based position its members
 * occupy in the sorted order, so a numbering is final exactly when every
 * rank is distinct.
 * @param keys - One sort key per atom; keys are compared element by element.
 * @returns The rank of each atom, in the same order.
 */
export function rankByKeys(keys: readonly number[][]): number[] {
  const order: number[] = [];
  for (let i = 0; i < keys.length; i++) order.push(i);
  const compare = (a: number, b: number) => compareKeys(keys[a], keys[b]);
  order.sort(compare);
  return ranksFromSortedOrder(order, compare);
}

export interface RefinementRound {
  ranks: number[];
  distinctRanks: number;
}

/**
 * Refine ranks until the partition stops splitting, the classical
 * equitable-refinement step: each round re-ranks an atom by its current
 * rank followed by the sorted ranks of its neighbours.
 * @param ranks - Starting ranks, one per atom.
 * @param neighbours - 0-based adjacency list.
 * @param maxRounds - Safety bound on the number of rounds.
 * @default maxRounds 20
 * @returns Every round that split the partition, last one first stable.
 */
export function refineRanks(
  ranks: number[],
  neighbours: number[][],
  maxRounds = 20,
): RefinementRound[] {
  const rounds: RefinementRound[] = [];
  let current = ranks;
  let distinct = countDistinct(current);
  for (let round = 0; round < maxRounds; round++) {
    const next = rankByKeys(refinementKeys(current, neighbours));
    const nextDistinct = countDistinct(next);
    if (nextDistinct === distinct) break;
    rounds.push({ ranks: next, distinctRanks: nextDistinct });
    current = next;
    distinct = nextDistinct;
  }
  return rounds;
}

/**
 * Refine and return only the stable partition.
 * @param ranks - Starting ranks, one per atom.
 * @param neighbours - 0-based adjacency list.
 * @returns The ranks refinement settles on.
 */
export function stableRanks(ranks: number[], neighbours: number[][]): number[] {
  const rounds = refineRanks(ranks, neighbours);
  const last = rounds.at(-1);
  return last ? last.ranks : ranks;
}

export interface TieBreak {
  /** Atom (0-based) singled out of its class. */
  atom: number;
  /** Rank the class had before the split. */
  rank: number;
  /** Size of the class before the split. */
  classSize: number;
  ranks: number[];
}

/**
 * Drive the partition down to one atom per rank the way a canonicalizer
 * does: whenever refinement stalls with a tied class left, single one of
 * its atoms out and refine again.
 * @param ranks - The stable ranks refinement ended on.
 * @param neighbours - 0-based adjacency list.
 * @returns One entry per tie broken, in order.
 */
export function breakTies(ranks: number[], neighbours: number[][]): TieBreak[] {
  const breaks: TieBreak[] = [];
  let current = ranks;
  // Bounded by the atom count: each pass singles one more atom out.
  let guard = ranks.length;
  while (guard-- > 0) {
    const target = firstTiedClass(current);
    if (!target) break;
    const next = current.slice();
    next[target.atom] = target.rank - target.classSize + 1;
    const after = stableRanks(next, neighbours);
    breaks.push({ ...target, ranks: after });
    current = after;
  }
  return breaks;
}

/**
 * Count how many distinct ranks a partition has.
 * @param ranks - Ranks, one per atom.
 * @returns The number of classes.
 */
export function countDistinct(ranks: readonly number[]): number {
  const seen = new Set<number>();
  for (const rank of ranks) seen.add(rank);
  return seen.size;
}

function firstTiedClass(
  ranks: number[],
): { atom: number; rank: number; classSize: number } | null {
  const counts = new Map<number, number>();
  for (const rank of ranks) {
    counts.set(rank, (counts.get(rank) ?? 0) + 1);
  }
  let bestRank = Number.POSITIVE_INFINITY;
  for (const [rank, count] of counts) {
    if (count > 1 && rank < bestRank) bestRank = rank;
  }
  if (!Number.isFinite(bestRank)) return null;
  for (let i = 0; i < ranks.length; i++) {
    if (ranks[i] === bestRank) {
      return {
        atom: i,
        rank: bestRank,
        classSize: counts.get(bestRank) as number,
      };
    }
  }
  return null;
}

function refinementKeys(ranks: number[], neighbours: number[][]): number[][] {
  const keys: number[][] = [];
  for (let i = 0; i < ranks.length; i++) {
    const list = neighbours[i] ?? [];
    const neighbourRanks: number[] = [];
    for (const neighbour of list) {
      neighbourRanks.push(ranks[neighbour] as number);
    }
    neighbourRanks.sort((a, b) => a - b);
    keys.push([ranks[i] as number, ...neighbourRanks]);
  }
  return keys;
}

function compareKeys(
  a: readonly number[] | undefined,
  b: readonly number[] | undefined,
): number {
  if (!a || !b) return 0;
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    const difference = (a[i] as number) - (b[i] as number);
    if (difference !== 0) return difference;
  }
  return a.length - b.length;
}

function ranksFromSortedOrder(
  order: number[],
  compare: (a: number, b: number) => number,
): number[] {
  const ranks = new Array<number>(order.length).fill(0);
  if (order.length === 0) return ranks;
  let currentRank = order.length;
  ranks[order.at(-1) as number] = currentRank;
  for (let i = order.length - 1; i > 0; i--) {
    if (compare(order[i - 1] as number, order[i] as number) !== 0) {
      currentRank = i;
    }
    ranks[order[i - 1] as number] = currentRank;
  }
  return ranks;
}
