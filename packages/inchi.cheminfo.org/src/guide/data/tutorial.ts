import type { TutorialStep } from './types.ts';

/**
 * The guided derivation, in the order the InChI algorithm itself works:
 * normalize the drawing, number the atoms, then write one layer at a time.
 * Every structure here is worked live by the engine, so the numbers in the
 * procedures can always be checked against the panel beside them.
 */
export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    id: 'anatomy',
    title: 'What an InChI is made of',
    level: 'basics',
    smiles: 'CCO',
    focus: null,
    panel: 'layers',
    description:
      'An InChI is a prologue followed by [[layer]]s, each introduced by a slash and a letter. Ethanol needs only the three main layers: the formula, the `/c` connections, and the `/h` hydrogens. Layers always appear in a fixed order and any layer a structure does not need is simply absent, so a short InChI is not an incomplete one. Every layer after the formula refers to atoms by their [[canonical numbering]], which is why deriving that numbering is most of the work.',
    procedure: [
      'Read the prologue: `InChI=1S` means version 1, [[standard inchi]] — every option fixed.',
      'Split the rest at the slashes. The first piece has no letter: it is always the formula.',
      'Name each remaining piece by its letter: `c` connections, `h` hydrogens, `q`/`p` charge, `b`/`t`/`m`/`s` stereo, `i` isotopes, `f` fixed hydrogens.',
      'Note that the layers are ordered, never sorted: `/c` always precedes `/h`, which always precedes `/q`.',
    ],
  },
  {
    id: 'normalization',
    title: 'Step 1 — normalize the drawing',
    level: 'basics',
    smiles: 'C[N+](=O)[O-]',
    focus: null,
    panel: 'layers',
    description:
      'Before anything is numbered, the drawing is reduced to a single-bond skeleton plus hydrogen counts. This [[normalization]] is why the two usual nitro-group drawings, the Kekulé and aromatic forms of benzene, and every way of writing a zwitterion all give one identifier. Try redrawing this nitromethane with a pentavalent nitrogen and no charges — the InChI does not move.',
    procedure: [
      'Erase every bond order: keep only which atoms are bonded to which.',
      'Erase formal charges written as an ion pair on adjacent atoms; a charge that survives goes to the `/q` layer later.',
      'Count the hydrogens on each heavy atom and set them aside — they are the `/h` layer, not part of the skeleton.',
      'Drop the explicit hydrogens from the graph. From here on, “atom” means heavy atom.',
      'Split the structure into disconnected [[component]]s and treat each one separately.',
    ],
    caveat:
      'Normalization also disconnects salts and metals and moves acidic hydrogens into mobile groups. Those two steps are covered later, and they are the ones that need chemical judgement rather than bookkeeping.',
  },
  {
    id: 'formula',
    title: 'The formula layer',
    level: 'basics',
    smiles: 'CN1C=NC2=C1C(=O)N(C)C(=O)N2C',
    focus: { letter: '' },
    panel: 'formula',
    description:
      'The first layer is the molecular formula in [[hill order]]: carbon first, hydrogen second, then everything else alphabetically. Hydrogens are counted across the whole structure, including the ones that will later turn out to be mobile. This is the one layer you can write without numbering anything.',
    procedure: [
      'Count each element over the whole component, hydrogens included.',
      'Write carbon first, then hydrogen, then the other elements in alphabetical order.',
      'Omit a count of 1: caffeine’s two oxygens are `O2`, a single oxygen would be just `O`.',
      'Separate [[component]]s with a dot, and prefix repeated identical components with a multiplier — two waters are `2H2O`, not `H2O.H2O`.',
    ],
    caveat:
      'Careful: the element order inside the formula (C, H, then alphabetical) is not the order used to rank atoms in the next step, where hydrogen sorts last rather than second.',
  },
  {
    id: 'invariants',
    title: 'Numbering 1 — the first three invariants',
    level: 'basics',
    smiles: 'CN1C=NC2=C1C(=O)N(C)C(=O)N2C',
    focus: null,
    panel: 'numbering',
    description:
      'Numbering starts by sorting the atoms on properties that do not depend on how the structure was drawn. InChI uses three such [[invariant]]s, in this order: the element in [[hill order]] — carbon first, others alphabetically, hydrogen last — then the number of connections to heavy atoms, then the number of attached hydrogens. Sort on those and caffeine already falls into six classes.',
    procedure: [
      'List the elements present and put them in ranking order: carbon, then the others alphabetically, then hydrogen. For caffeine that is C, N, O.',
      'Give every atom the key (element rank, connections, hydrogens). A methyl carbon is (1, 1, 3); a ring-fusion carbon is (1, 3, 0).',
      'Sort the atoms on that key and read off the classes. Atoms with identical keys share a class for now.',
      'Number the classes from 1 upwards in sorted order. Carbons therefore always come before nitrogens, which come before oxygens.',
    ],
    caveat:
      'The hydrogen count used here is the immobile one. Atoms that share a [[mobile hydrogen]] count zero hydrogens of their own; that refinement is applied in a later pass, and it is why carboxylic acids are numbered as they are.',
  },
  {
    id: 'refinement',
    title: 'Numbering 2 — refine on the neighbours',
    level: 'basics',
    smiles: 'CC(C)CC',
    focus: null,
    panel: 'numbering',
    description:
      'Two atoms with the same invariants can still sit in different surroundings. [[Refinement]] separates them: re-rank every atom by its own rank followed by the sorted ranks of its neighbours, and repeat until nothing splits any further. In 2-methylbutane the three methyls start tied; one round separates the one on the ethyl arm from the two on the isopropyl end.',
    procedure: [
      'For each atom, write its current rank followed by its neighbours’ ranks in ascending order — a methyl on a rank-4 carbon is (3, [4]).',
      'Sort the atoms on that new key and re-number the classes.',
      'Repeat. A round can only split a class, never merge one, so the process always settles.',
      'Stop when a round produces the same number of classes as the one before it.',
      'If every class now holds one atom, you have the canonical numbering and can stop.',
    ],
  },
  {
    id: 'tiebreaking',
    title: 'Numbering 3 — break the remaining ties',
    level: 'basics',
    smiles: 'c1ccc2ccccc2c1',
    focus: null,
    panel: 'numbering',
    description:
      'Refinement stalls when atoms are genuinely symmetric — a benzene ring, the two halves of naphthalene. Those form an [[equivalence class]] no invariant can split, so one atom is picked out of the class by hand and refinement resumes. Which one is picked is arbitrary, and that is exactly the step this guide cannot promise you will reproduce.',
    procedure: [
      'Take the lowest-ranked class that still holds more than one atom.',
      'Give one of its atoms the lowest rank in the class, and leave the others where they are.',
      'Refine again, then repeat until every atom has its own number.',
      'Check the result against the panel: for a symmetric molecule any choice gives an equally valid numbering.',
    ],
    caveat:
      'InChI does not simply pick one: it explores the alternatives and keeps the numbering whose `/c` layer is smallest, pruning the search with the structure’s symmetry group. For a symmetric molecule every choice leads to the same string, so a hand derivation still lands on the right answer — but for a nearly symmetric one it may not, and there is no shortcut.',
  },
  {
    id: 'connections',
    title: 'The /c connections layer',
    level: 'basics',
    smiles: 'CCOC(C)=O',
    focus: { letter: 'c' },
    panel: 'connections',
    description:
      'The [[connection table]] is a depth-first walk over the numbered skeleton. Start at the atom with the fewest neighbours, walk as deep as you can, and write down the numbers you meet. Dashes join a chain, parentheses hold the branches at an atom, and a repeated number is a [[ring closure]] rather than a new atom.',
    procedure: [
      'Start at the atom with fewest connections; if several tie, take the lowest canonical number.',
      'At each atom, order the neighbours you still have to visit by how many atoms hang off them, smallest first; a ring closure counts as nothing and so goes first. Break a tie on the canonical number.',
      'Write a single continuation with a dash: `1-3`.',
      'When an atom has more than one continuation, wrap all but the last in parentheses: `4(2)5` means atom 4 carries both 2 and 5.',
      'When the walk reaches an atom already visited, write its number as a ring closure and do not descend again.',
      'Hydrogens never appear here — they are the next layer.',
    ],
  },
  {
    id: 'hydrogens',
    title: 'The /h hydrogens layer',
    level: 'basics',
    smiles: 'CN1C=NC2=C1C(=O)N(C)C(=O)N2C',
    focus: { letter: 'h' },
    panel: 'hydrogens',
    description:
      'The `/h` layer puts the hydrogens back. Atoms carrying the same number of hydrogens are collected into one run, the runs are ordered by hydrogen count, and consecutive atom numbers collapse into a range. Caffeine’s `4H,1-3H3` says atom 4 carries one hydrogen and atoms 1 to 3 carry three each.',
    procedure: [
      'Group the atoms by how many hydrogens they carry, ignoring those with none.',
      'Within a group, list the atom numbers in ascending order and collapse consecutive ones into `first-last`.',
      'Write the group as the atom list followed by `H`, then the count if it is more than one: `1-3H3`.',
      'Order the groups by hydrogen count, fewest first, separated by commas.',
      'Append any [[mobile hydrogen]] groups in parentheses at the end — the next step covers those.',
    ],
  },
  {
    id: 'mobileh',
    title: 'Mobile hydrogens and tautomers',
    level: 'variable',
    smiles: 'CC(=O)O',
    focus: { letter: 'h' },
    panel: 'hydrogens',
    description:
      'A hydrogen that moves between several atoms is not placed on any of them. Acetic acid’s acidic hydrogen belongs to both carboxyl oxygens at once, written `(H,3,4)`. This is what makes [[tautomer]]s share an identifier — and it is the single hardest thing to do by hand, because deciding whether a hydrogen is mobile is a chemical judgement, not a bookkeeping rule.',
    procedure: [
      'Look for hydrogens on heteroatoms that are connected, through an alternating bond system, to another heteroatom that could carry them — carboxyl and amide groups, imidazoles, enols.',
      'Collect each such set of atoms into one group and count the hydrogens shared over it.',
      'Write the group as `(H,` followed by the [[endpoint]] atom numbers `)`, using `H2`, `H4` and so on when the group carries more than one.',
      'Place the groups after the immobile runs in the `/h` layer, in ascending order of their first atom.',
      'Go back and redo the numbering: an [[endpoint]] counts zero hydrogens of its own, which changes where it sorts.',
    ],
    caveat:
      'InChI’s tautomer perception is a fixed list of patterns, not a general theory of tautomerism. Some tautomers it merges, others it does not — so a group you would expect on chemical grounds may be absent, and the only reliable check is the panel beside this text.',
  },
  {
    id: 'protons',
    title: 'The /q and /p charge layers',
    level: 'variable',
    smiles: 'CC(=O)[O-]',
    focus: { letter: 'p', block: 'charge' },
    panel: 'layers',
    description:
      'Charge is split in two. The `/p` layer counts [[proton]]s added to or removed from the neutral skeleton, so an acid and its conjugate base differ only there. Whatever charge is left after that goes in `/q`. Acetate is `/p-1`; a quaternary ammonium, which no proton count can neutralise, gets `/q+1` instead.',
    procedure: [
      'Work out the total charge of the component.',
      'See how much of it can be explained by removing or adding hydrogens from mobile-H groups; that count is `/p`, negative for removed.',
      'Whatever charge remains goes into `/q`, with a sign and a count.',
      'Remember that a zwitterion has a net charge of zero: glycine drawn as an ammonium carboxylate has neither layer.',
    ],
    caveat:
      'The `/p` layer is deliberately excluded from the [[inchikey]] hash — protonation states are carried by the key’s final letter instead, which is why they differ only in that character.',
  },
  {
    id: 'components',
    title: 'Several components',
    level: 'variable',
    smiles: 'CC(=O)[O-].[Na+]',
    focus: { letter: '' },
    panel: 'layers',
    description:
      'Salts and mixtures are numbered one [[component]] at a time and then serialised together. Components are sorted, joined with a dot in the formula and with semicolons everywhere else, and a component that contributes nothing to a layer leaves an empty slot rather than disappearing.',
    procedure: [
      'Split the structure at the points where it is not connected, and derive each part on its own.',
      'Order the components as InChI does — by formula — and write the formulas joined by dots.',
      'In every other layer, write the components in that same order, separated by semicolons.',
      'Leave the slot empty for a component with nothing to say: sodium contributes no connections, hence the bare `;` in `/c1-2(3)4;`.',
      'Collapse runs of identical components with a leading multiplier, as in `/h2*1H2`.',
    ],
  },
  {
    id: 'fixedh',
    title: 'The fixed-H layer',
    level: 'variable',
    smiles: 'NC(N)=O',
    focus: { letter: 'h', block: 'fixedH' },
    panel: 'layers',
    inchiOptions: '-FixedH',
    description:
      'Merging tautomers is sometimes the wrong answer. The optional [[fixed-h layer]] pins the mobile hydrogens back onto specific atoms in an extra `/f` block, so the individual tautomers separate again. Standard InChI never emits it — this panel asks the engine for it explicitly, which is why the prologue here reads `InChI=1` rather than `InChI=1S`.',
    procedure: [
      'Derive the main layers as usual, with the hydrogens mobile.',
      'Open a `/f` block. Repeat the formula there only if fixing the hydrogens changed it.',
      'Write the hydrogens where they actually sit, in the same `/h` notation but with no parentheses.',
      'Repeat any layer whose value changed; a layer identical to its counterpart in the main block is omitted entirely.',
      'Read the missing layers as “same as above” — that is what their absence means.',
    ],
  },
  {
    id: 'doublebond',
    title: 'The /b double-bond layer',
    level: 'stereo',
    smiles: 'C/C=C/C',
    focus: { letter: 'b' },
    panel: 'stereo',
    description:
      'Double-bond stereo is recorded as a [[double bond parity]] against canonical numbers, not as Z/E. At each end of the bond take the neighbour with the higher canonical number; if the two lie on the same side the parity is minus, otherwise plus. Flip this but-2-ene between the E and Z forms and only the final sign moves.',
    procedure: [
      'Find the double bonds that can support isomerism: a localised double bond, or one in a complete alternating system.',
      'Name the bond by its two atoms, higher canonical number first: `4-3`.',
      'At each end, ignore the other end and take the remaining neighbour with the higher canonical number.',
      'If those two reference neighbours are on the same side of the bond, write `-`; if opposite, write `+`.',
      'List the bonds in ascending order, separated by commas, and use `?` for a bond whose configuration is not known.',
    ],
    caveat:
      'The parity is not Z/E: it is defined on canonical numbers, where Z/E uses CIP priorities. The two agree often enough to be misleading, so never translate one into the other by eye.',
  },
  {
    id: 'tetrahedral',
    title: 'The /t tetrahedral layer',
    level: 'stereo',
    smiles: 'N[C@@H](C)C(=O)O',
    focus: { letter: 't' },
    panel: 'stereo',
    description:
      'A stereocentre gets a [[tetrahedral parity]]. Put your eye on the hydrogen — or on the neighbour with the smallest canonical number when there is no hydrogen — and look towards the centre. If the three remaining neighbours run clockwise in increasing canonical number the parity is plus, anticlockwise is minus. Alanine has one such centre, atom 2.',
    procedure: [
      'Identify the stereogenic atoms. Carbon, silicon and germanium always qualify; nitrogen, phosphorus, sulfur and selenium do so only in particular environments.',
      'For each, view from the hydrogen, or from the lowest-numbered neighbour if the atom has none.',
      'Read the other three neighbours in increasing canonical number and note whether they run clockwise.',
      'Write `+` for clockwise and `-` for anticlockwise, after the atom number: `2-`.',
      'List the centres in ascending atom order, separated by commas, and use `?` for one that is undefined.',
    ],
    caveat:
      'Allenes are recorded here too rather than in `/b`, and a wedge drawing has to be unambiguous for the parity to be read at all — InChI reports an atom as undefined rather than guess.',
  },
  {
    id: 'mirror',
    title: 'The /m and /s layers',
    level: 'stereo',
    smiles: 'O[C@H]([C@@H](O)C(=O)O)C(=O)O',
    focus: { letter: 'm' },
    panel: 'stereo',
    description:
      'A structure and its mirror image would otherwise give two unrelated `/t` layers. Instead InChI writes whichever of the two is smaller and adds a [[mirror flag]]: `/m0` if the compound is the one written, `/m1` if it is the mirror image. The `/s` layer then states the [[stereo type]] — 1 absolute, 2 relative, 3 racemic. Both tartaric acid enantiomers carry `/t1-,2-`; only `/m` tells them apart.',
    procedure: [
      'Write the parities of the structure, then those of its mirror image — every sign flips.',
      'Keep whichever of the two strings is smaller, and put it in `/t`.',
      'Write `/m0` if that string is the structure you started from, `/m1` if it is the mirror image.',
      'Add `/s1` for absolute stereochemistry — the only value standard InChI writes.',
      'For relative stereochemistry the `/m` layer is dropped entirely and `/s2` is written instead.',
    ],
  },
  {
    id: 'isotopes',
    title: 'The /i isotopic layer',
    level: 'stereo',
    smiles: '[2H]C([2H])([2H])O',
    focus: { letter: 'i', block: 'isotopic' },
    panel: 'isotopes',
    description:
      'The [[isotopic layer]] is the most mechanical of them all: name the labelled atoms by canonical number and give the shift from the rounded average mass. Labelled hydrogens are written `D` and `T` instead. Methanol labelled on the methyl gives `/i1D3` — three deuteriums on atom 1.',
    procedure: [
      'Number the structure as usual; isotopic substitution does not change the earlier layers.',
      'For each labelled heavy atom, write its number and the shift from the rounded average mass: ¹³C is `1+1`.',
      'For labelled hydrogens, append `D` or `T` with a count to the atom that carries them.',
      'Separate entries with commas, in ascending atom order.',
      'A label on an exchangeable hydrogen cannot be placed on one atom, so it moves to a sublayer of its own — `/i/hD2` means two deuteriums somewhere in the mobile-H group.',
    ],
  },
  {
    id: 'inchikey',
    title: 'The InChIKey',
    level: 'stereo',
    smiles: 'CN1C=NC2=C1C(=O)N(C)C(=O)N2C',
    focus: null,
    panel: 'inchikey',
    description:
      'The [[inchikey]] is a fixed-length hash built for search boxes and database columns. The InChI is cut in two — a skeleton part and everything else — each is hashed with SHA-256, and the leading bits are written in [[base 26]]. Every step below can be followed by hand except the SHA-256 itself, which is shown for you.',
    procedure: [
      'Cut the InChI after the last of the formula, `/c`, `/h` and `/q` segments. That prefix is the major part.',
      'The remaining segments are the minor part; the `/p` segment belongs to neither and only sets the final letter.',
      'If the minor part is non-empty and shorter than 255 characters, concatenate it with itself before hashing.',
      'Hash each part with SHA-256 and take the leading bits: 65 from the major digest, 37 from the minor one.',
      'Encode them in base 26, three letters per 14 bits and two per 9, giving a 14-letter block and an 8-letter one.',
      'Append `S` for a standard InChI, `A` for version 1, then the proton letter: `N` for neutral, `M` for −1, `O` for +1.',
    ],
    caveat:
      'The key is one-way — nothing can be recovered from it — and being a hash it can collide. Two different structures sharing a first block is expected roughly once in a database of a few billion skeletons.',
  },
] as const;
