import { Molecule } from 'openchemlib';
import { expect, test } from 'vitest';

import { canonicalOrder, canonicalRanking } from '../canonicalRanking.ts';
import { atomInvariants, hillElementOrder } from '../invariants.ts';

test('orders elements carbon first, then alphabetically, hydrogen last', () => {
  expect(hillElementOrder(['O', 'H', 'N', 'C', 'C'])).toStrictEqual([
    'C',
    'N',
    'O',
    'H',
  ]);
  expect(hillElementOrder(['S', 'Cl', 'Br'])).toStrictEqual(['Br', 'Cl', 'S']);
});

test('reads the three invariants off ethanol', () => {
  const invariants = atomInvariants(Molecule.fromSmiles('CCO'));

  expect(invariants).toStrictEqual([
    {
      atom: 1,
      element: 'C',
      hillRank: 1,
      connections: 1,
      hydrogens: 3,
      mobileGroupSize: 0,
    },
    {
      atom: 2,
      element: 'C',
      hillRank: 1,
      connections: 2,
      hydrogens: 2,
      mobileGroupSize: 0,
    },
    {
      atom: 3,
      element: 'O',
      hillRank: 2,
      connections: 1,
      hydrogens: 1,
      mobileGroupSize: 0,
    },
  ]);
});

test('numbers caffeine exactly as the engine does', () => {
  const caffeine = Molecule.fromSmiles('CN1C=NC2=C1C(=O)N(C)C(=O)N2C');
  const ranking = canonicalRanking(caffeine);

  expect(ranking.complete).toBe(true);
  expect(ranking.usedTieBreaking).toBe(false);
  // AuxInfo of caffeine: /N:1,14,10,3,6,5,7,11,4,2,13,9,8,12
  expect(canonicalOrder(ranking)).toStrictEqual([
    1, 14, 10, 3, 6, 5, 7, 11, 4, 2, 13, 9, 8, 12,
  ]);
});

test('keying caffeine on element and degree leaves six classes', () => {
  const caffeine = Molecule.fromSmiles('CN1C=NC2=C1C(=O)N(C)C(=O)N2C');
  const [skeleton] = canonicalRanking(caffeine).stages;

  expect(skeleton?.id).toBe('skeleton');
  // Three methyls tie at rank 3, the lone CH is 4, four ring carbons tie at 8.
  expect(skeleton?.keyedRanks).toStrictEqual([
    3, 12, 4, 9, 8, 8, 8, 14, 12, 3, 8, 14, 12, 3,
  ]);
  // Refining against the neighbour ranks then separates all fourteen.
  expect(skeleton?.distinctRanks).toBe(14);
  expect(skeleton?.rounds).toBe(3);
});

test('benzene needs tie breaking and every atom stays equivalent', () => {
  const ranking = canonicalRanking(Molecule.fromSmiles('c1ccccc1'));

  expect(ranking.usedTieBreaking).toBe(true);
  expect(ranking.complete).toBe(true);
  expect(canonicalOrder(ranking)).toStrictEqual([1, 2, 6, 3, 5, 4]);
});

test('the mobile-H groups of tartaric acid decide the oxygen order', () => {
  const tartaric = Molecule.fromSmiles('OC(=O)C(O)C(O)C(=O)O');
  // Each carboxyl group shares one hydrogen over its two oxygens.
  const engineOrder = [4, 6, 2, 8, 5, 7, 1, 3, 9, 10];

  expect(
    canonicalOrder(
      canonicalRanking(tartaric, [
        [1, 3],
        [9, 10],
      ]),
    ),
  ).toStrictEqual(engineOrder);
  // Treating those hydrogens as immobile numbers the oxygens differently.
  expect(canonicalOrder(canonicalRanking(tartaric))).not.toStrictEqual(
    engineOrder,
  );
});
