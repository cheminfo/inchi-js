import type { Exercise } from './types.ts';

/**
 * Layer and full-InChI exercises are checked against the InChI the engine
 * computes for the same structure, so they cannot drift out of date.
 * Reading exercises carry the expected answer, and each one was taken
 * from an InChI the engine produced.
 */
export const EXERCISES: readonly Exercise[] = [
  {
    id: 'formula-paracetamol',
    title: 'Write the formula of paracetamol',
    level: 'basics',
    kind: 'layer',
    letter: '',
    smiles: 'CC(=O)Nc1ccc(O)cc1',
    placeholder: 'C…H…',
    description:
      'Count every atom in the structure and write the formula in [[hill order]]. Remember that the hydrogens on the drawing are implicit, and that the amide hydrogen counts too.',
    hints: [
      'Hill order is carbon, then hydrogen, then the remaining elements alphabetically.',
      'The ring contributes four hydrogens, the methyl three, and there is one on the nitrogen and one on the oxygen.',
      'The heavy atoms are eight carbons, one nitrogen and two oxygens.',
    ],
  },
  {
    id: 'c-propanol',
    title: 'Connect up propan-1-ol',
    level: 'basics',
    kind: 'layer',
    letter: 'c',
    smiles: 'CCCO',
    placeholder: '1-2-…',
    description:
      'Number the four heavy atoms and write the `/c` layer. An unbranched chain needs nothing but dashes — the only question is where the numbering starts.',
    hints: [
      'Carbon ranks before oxygen, and within carbon the fewest connections rank first.',
      'The methyl carbon is 1, the middle carbon 2, the carbon bearing the oxygen 3, and the oxygen 4.',
      'Walk from the atom with fewest neighbours and join the numbers with dashes.',
    ],
  },
  {
    id: 'h-propanol',
    title: 'Place the hydrogens of propan-1-ol',
    level: 'basics',
    kind: 'layer',
    letter: 'h',
    smiles: 'CCCO',
    placeholder: '4H,…',
    description:
      'Using the same numbering, write the `/h` layer. Group the atoms by hydrogen count, fewest first, and collapse consecutive atom numbers into a range.',
    hints: [
      'Three groups: one hydrogen on the oxygen, two on each of the middle carbons, three on the methyl.',
      'A group with one hydrogen is written with a bare `H`, with no count after it.',
      'The two CH₂ carbons are numbers 2 and 3, so they collapse into `2-3H2`.',
    ],
  },
  {
    id: 'c-isobutane',
    title: 'Branch at a single atom',
    level: 'basics',
    kind: 'layer',
    letter: 'c',
    smiles: 'CC(C)C',
    placeholder: '1-…',
    description:
      'Isobutane has one branch point carrying three methyls. Write the `/c` layer, and watch how parentheses hold the branches rather than marking them.',
    hints: [
      'The three methyls are equivalent, so they take numbers 1 to 3 and the central carbon takes 4.',
      'Start at a methyl, walk to the central atom, and it then has two further neighbours to write.',
      'With two continuations left, the first goes in parentheses and the second follows it.',
    ],
  },
  {
    id: 'c-cyclohexane',
    title: 'Close a ring',
    level: 'basics',
    kind: 'layer',
    letter: 'c',
    smiles: 'C1CCCCC1',
    placeholder: '1-2-…',
    description:
      'Every carbon of cyclohexane is equivalent, so the numbering comes entirely from [[tie breaking]]. Write the `/c` layer and note how the walk ends by returning to atom 1.',
    hints: [
      'All six atoms tie, so atom 1 is chosen arbitrarily and refinement numbers the rest.',
      'The walk visits every atom once and then meets atom 1 again — that repeat is the [[ring closure]].',
      'The numbering that gives the smallest layer runs 1-2-4-6-5-3 before closing.',
    ],
  },
  {
    id: 'full-acetone',
    title: 'Write the whole InChI of acetone',
    level: 'basics',
    kind: 'full',
    smiles: 'CC(C)=O',
    placeholder: 'InChI=1S/…',
    description:
      'Put the three main layers together for acetone. You may leave the `InChI=1S/` prologue off if you prefer — it is added for you.',
    hints: [
      'Three carbons and one oxygen, so the formula is C3H6O.',
      'The two methyls are equivalent and take numbers 1 and 2; the carbonyl carbon is 3 and the oxygen 4.',
      'Only the methyls carry hydrogens, three each, and they are consecutive numbers.',
    ],
  },
  {
    id: 'c-toluene',
    title: 'Connect up toluene',
    level: 'basics',
    kind: 'layer',
    letter: 'c',
    smiles: 'Cc1ccccc1',
    placeholder: '1-7-…',
    description:
      'Toluene mixes a substituent with a symmetric ring. Write the `/c` layer, starting from the atom that has fewest neighbours.',
    hints: [
      'The methyl is the only atom with one connection, so the walk starts there.',
      'Refinement separates the ring into the ipso carbon, the two ortho, the two meta and the para — but the pairs stay tied.',
      'The substituted ring carbon ends up as number 7, the last of the carbons.',
    ],
  },
  {
    id: 'read-caffeine-methyls',
    title: 'Read the methyls off caffeine',
    level: 'basics',
    kind: 'read',
    inchi:
      'InChI=1S/C8H10N4O2/c1-10-4-9-6-5(10)7(13)12(3)8(14)11(6)2/h4H,1-3H3',
    expected: '1-3',
    placeholder: 'e.g. 4-7',
    description:
      'Without drawing anything, read off which canonical numbers belong to caffeine’s three methyl groups. Write the answer exactly as the `/h` layer does.',
    hints: [
      'A methyl carbon carries three hydrogens.',
      'The `/h` layer groups atoms by hydrogen count and collapses consecutive numbers.',
      'Look at the run ending in `H3`.',
    ],
  },
  {
    id: 'h-acetic',
    title: 'A hydrogen that will not sit still',
    level: 'variable',
    kind: 'layer',
    letter: 'h',
    smiles: 'CC(=O)O',
    placeholder: '1H3,(…)',
    description:
      'Acetic acid’s acidic hydrogen is [[mobile hydrogen|mobile]]: it belongs to both carboxyl oxygens rather than to either. Write the whole `/h` layer, immobile run first.',
    hints: [
      'The methyl carbon is 1 and carries three hydrogens; the two oxygens are 3 and 4.',
      'A mobile group is written in parentheses, starting with the hydrogen count.',
      'One hydrogen shared over atoms 3 and 4 is written `(H,3,4)`.',
    ],
  },
  {
    id: 'p-acetate',
    title: 'Deprotonate it',
    level: 'variable',
    kind: 'layer',
    letter: 'p',
    block: 'charge',
    smiles: 'CC(=O)[O-]',
    placeholder: '-1 or +1',
    description:
      'Acetate is acetic acid minus one [[proton]]. Every other layer is identical — write only the `/p` layer that records the difference.',
    hints: [
      'The layer holds a signed count, not a charge symbol.',
      'One proton was removed rather than added.',
      'Removing one proton is written `-1`.',
    ],
  },
  {
    id: 'read-sodium-acetate',
    title: 'Find the charge of a salt',
    level: 'variable',
    kind: 'read',
    inchi: 'InChI=1S/C2H4O2.Na/c1-2(3)4;/h1H3,(H,3,4);/q;+1/p-1',
    expected: ';+1',
    placeholder: 'e.g. +1;-1',
    description:
      'This is sodium acetate, two [[component]]s in one identifier. Write out its `/q` layer exactly, including the punctuation that keeps the components lined up.',
    hints: [
      'Components appear in every layer in the same order as in the formula, separated by semicolons.',
      'The acetate part contributes no `/q` charge — its charge is in `/p` instead.',
      'An empty slot is still written, so the layer starts with the separator.',
    ],
  },
  {
    id: 'full-glycine',
    title: 'Write the whole InChI of glycine',
    level: 'variable',
    kind: 'full',
    smiles: 'NCC(=O)O',
    placeholder: 'InChI=1S/…',
    description:
      'Glycine brings together everything from the first two levels: a small skeleton, an amine, and a carboxyl group whose hydrogen is mobile. Note that the zwitterion gives the same answer — it has the same number of protons.',
    hints: [
      'Carbon ranks first, then nitrogen, then oxygen: the two carbons are 1 and 2, nitrogen is 3, the oxygens are 4 and 5.',
      'The CH₂ and the NH₂ both carry two hydrogens, so they share a run.',
      'The carboxyl hydrogen is mobile over atoms 4 and 5.',
    ],
  },
  {
    id: 'b-cis-butene',
    title: 'Give a double bond its sign',
    level: 'stereo',
    kind: 'layer',
    letter: 'b',
    block: 'stereo',
    smiles: String.raw`C/C=C\C`,
    placeholder: 'e.g. 4-3+',
    description:
      'This is Z-but-2-ene, with the two methyls on the same side. Write its `/b` layer — remembering that the sign follows canonical numbers, not CIP priorities.',
    hints: [
      'The bond is named by its two atoms with the higher canonical number first.',
      'The double bond joins atoms 3 and 4; the reference neighbour at each end is a methyl.',
      'Reference neighbours on the same side means the parity is minus.',
    ],
  },
  {
    id: 't-alanine',
    title: 'Give a stereocentre its parity',
    level: 'stereo',
    kind: 'layer',
    letter: 't',
    block: 'stereo',
    smiles: 'N[C@@H](C)C(=O)O',
    placeholder: 'e.g. 2+',
    description:
      'L-alanine has one stereocentre. Write the `/t` layer: look from the hydrogen towards the centre and read the other three neighbours in increasing canonical number.',
    hints: [
      'The stereocentre is the carbon bearing the amine, the methyl and the carboxyl.',
      'Its canonical number is 2 — carbons rank first, and it has three heavy neighbours.',
      'Running anticlockwise in increasing canonical number gives the minus parity.',
    ],
  },
  {
    id: 'm-tartaric',
    title: 'Say which enantiomer it is',
    level: 'stereo',
    kind: 'layer',
    letter: 'm',
    block: 'stereo',
    smiles: 'O[C@H]([C@@H](O)C(=O)O)C(=O)O',
    placeholder: '0 or 1',
    description:
      'Both tartaric acid enantiomers carry `/t1-,2-`; the [[mirror flag]] is what separates them. Write the `/m` layer for this one.',
    hints: [
      'InChI writes the smaller of the two mirror-image parity strings in `/t`.',
      '`/m0` means the structure is the one written, `/m1` means it is the mirror image.',
      'This structure’s own parities are both plus, so the layer written is its mirror.',
    ],
  },
  {
    id: 'i-acetic',
    title: 'Label a carbon',
    level: 'stereo',
    kind: 'layer',
    letter: 'i',
    block: 'isotopic',
    smiles: '[13CH3]C(=O)O',
    placeholder: 'e.g. 2+1',
    description:
      'This is acetic acid with a ¹³C on the methyl. Write the `/i` layer: the atom number followed by the shift from the rounded average mass.',
    hints: [
      'The isotopic layer never changes the numbering that came before it.',
      'The methyl carbon is atom 1.',
      'Carbon 13 is one unit above carbon 12, so the shift is written `+1`.',
    ],
  },
  {
    id: 'read-key-proton',
    title: 'Read a protonation state off a key',
    level: 'stereo',
    kind: 'read',
    inchi: 'InChI=1S/C2H4O2/c1-2(3)4/h1H3,(H,3,4)/p-1',
    expected: 'M',
    placeholder: 'a single letter',
    description:
      'Acetate’s [[inchikey]] is `QTBSBXVTEAMEQO-UHFFFAOYSA-M`, acetic acid’s ends in `-N`. Give the final letter of the key for this InChI, and note that it is the only thing that changes.',
    hints: [
      'The `/p` layer is never hashed; its value is carried by the final letter instead.',
      'Neutral is `N`; removing protons walks backwards through the alphabet from `M`.',
      'One proton removed is `M`.',
    ],
  },
] as const;
