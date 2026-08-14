import type { GlossaryEntry } from './types.ts';

/**
 * Definitions for the `[[term]]` markers used across the guide, keyed by
 * the lowercased marker text. A marker with no entry renders as plain
 * text, so linking a term before it is written is harmless.
 */
export const GLOSSARY: Record<string, GlossaryEntry> = {
  layer: {
    title: 'Layer',
    summary:
      'A slash-delimited section of an InChI describing one aspect of the structure. Each layer is computed from the ones before it, so a layer can be dropped from the end without invalidating what remains.',
    examples: [
      {
        snippet: '/c1-2-3',
        note: 'the connections layer; the letter after the slash names the layer',
      },
      {
        snippet: 'InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3',
        note: 'formula, connections and hydrogens — the three main layers',
      },
    ],
  },
  normalization: {
    title: 'Normalization',
    summary:
      'The step that strips a drawing down to what InChI actually identifies: single-bond skeleton plus hydrogen counts. Double and aromatic bonds, charges written as ion pairs, and the many ways of drawing a nitro group all collapse to one representation.',
    examples: [
      {
        snippet: 'O=N(=O)C vs [O-][N+](=O)C',
        note: 'both nitromethane drawings normalize to the same InChI',
      },
      {
        snippet: 'c1ccccc1 vs C1=CC=CC=C1',
        note: 'aromatic and Kekulé benzene give one identifier',
      },
    ],
  },
  'hill order': {
    title: 'Hill order',
    summary:
      'The convention for ordering elements: carbon first, then every other element alphabetically, then hydrogen last. InChI uses it both for the formula and as the first tie-break when numbering atoms.',
    examples: [
      { snippet: 'C8H10N4O2', note: 'caffeine — C, then H, then N, O' },
      {
        snippet: 'C, N, O, H',
        note: 'the atom-ranking order: hydrogen sorts last, not second',
      },
    ],
  },
  'canonical numbering': {
    title: 'Canonical numbering',
    summary:
      'The numbering every InChI layer refers to. It depends only on the structure, never on how it was drawn or the order atoms appeared in the file, so two drawings of one compound produce one identifier.',
    examples: [
      {
        snippet: '/c1-10-4-9-6-5(10)…',
        note: 'the numbers are canonical, not the atom order of the molfile',
      },
    ],
  },
  invariant: {
    title: 'Atom invariant',
    summary:
      'A property of an atom that does not depend on how the structure was drawn, used to give atoms a first, coarse ranking. InChI starts with three: the element in Hill order, the number of connections to heavy atoms, and the number of attached hydrogens.',
    examples: [
      {
        snippet: '(C, 1 connection, 3 H)',
        note: 'a methyl carbon — the lowest-ranking class in most organics',
      },
      {
        snippet: '(O, 1 connection, 0 H)',
        note: 'a carbonyl oxygen; oxygen ranks after carbon and nitrogen',
      },
    ],
  },
  refinement: {
    title: 'Refinement',
    summary:
      'Repeatedly re-ranking each atom by its own rank followed by the sorted ranks of its neighbours. Every round can split a class but never merges one, so it converges; for most molecules it separates every atom on its own.',
    examples: [
      {
        snippet: '(3, [8]) vs (3, [12])',
        note: 'two methyls tied at rank 3, split by what they hang off',
      },
    ],
  },
  'equivalence class': {
    title: 'Equivalence class',
    summary:
      'A set of atoms refinement cannot tell apart. Genuinely symmetric atoms — the six carbons of benzene, the three hydrogens of a methyl — stay in one class however long refinement runs.',
    examples: [
      {
        snippet: '/E:(1,2,3,4,5,6)',
        note: 'the AuxInfo field reporting benzene’s six equivalent carbons',
      },
    ],
  },
  'tie breaking': {
    title: 'Tie breaking',
    summary:
      'Singling one atom out of a tied class by hand so refinement can continue. Which atom is picked is arbitrary; InChI tries the alternatives and keeps the numbering that produces the smallest connection table.',
    examples: [
      {
        snippet: 'benzene',
        note: 'all six carbons tie, so one is picked as atom 1 and the rest follow',
      },
    ],
  },
  'connection table': {
    title: 'Connection table',
    summary:
      'The `/c` layer: a depth-first walk of the heavy-atom skeleton, written as numbers joined by dashes, with parentheses around the branches at an atom and a repeated number closing a ring.',
    examples: [
      { snippet: '/c1-2-3', on: 'ethanol', note: 'a plain chain, no branches' },
      {
        snippet: '/c1-3(2)4',
        note: 'atom 3 carries three neighbours: 1, then 2, then 4',
      },
    ],
  },
  'ring closure': {
    title: 'Ring closure',
    summary:
      'A number in the `/c` layer that repeats an atom already visited. It marks the bond that closes a ring rather than a new atom, and is always written at the later of the two atoms.',
    examples: [
      {
        snippet: '11(6)2',
        on: 'caffeine',
        note: 'atom 11 bonds back to atom 6, closing the six-membered ring',
      },
    ],
  },
  'mobile hydrogen': {
    title: 'Mobile hydrogen',
    summary:
      'A hydrogen InChI refuses to place on one atom because it moves between several — the acidic hydrogen of a carboxyl group, an amide, an imidazole. It is written as a parenthesised group in the `/h` layer, and it is the reason tautomers share an identifier.',
    examples: [
      {
        snippet: '(H,3,4)',
        on: 'acetic acid',
        note: 'one hydrogen shared over the two carboxyl oxygens',
      },
      {
        snippet: '(H4,2,3,4)',
        on: 'urea',
        note: 'four hydrogens shared over both nitrogens and the oxygen',
      },
    ],
  },
  tautomer: {
    title: 'Tautomer',
    summary:
      'One of several structures differing only by the position of a hydrogen and the bonds around it. Standard InChI perceives the common cases and gives them one identifier, so keto and enol forms do not separate.',
    examples: [
      {
        snippet: 'CC(=O)O and CC(O)=O',
        note: 'the same standard InChI, because the /h layer keeps the H mobile',
      },
    ],
  },
  endpoint: {
    title: 'Mobile-H endpoint',
    summary:
      'An atom a mobile hydrogen can sit on. Endpoints count no hydrogen of their own when atoms are ranked — the hydrogen belongs to the group — which is why a carboxyl oxygen and a phenol oxygen rank differently.',
    examples: [
      {
        snippet: '(H,7,8)',
        note: 'atoms 7 and 8 are the endpoints of this group',
      },
    ],
  },
  proton: {
    title: 'Proton layer',
    summary:
      'The `/p` layer records hydrogens added to or removed from the neutral skeleton, so that a compound and its conjugate base share every other layer. It is never hashed into the InChIKey; the count is carried by the key’s last letter instead.',
    examples: [
      { snippet: '/p-1', note: 'one proton removed — an anion' },
      { snippet: '/p+1', note: 'one proton added — a cation' },
    ],
  },
  charge: {
    title: 'Charge layer',
    summary:
      'The `/q` layer holds the net charge of a component that cannot be resolved by adding or removing protons, such as a quaternary ammonium or a metal ion.',
    examples: [
      { snippet: '/q+1', on: 'tetramethylammonium' },
      {
        snippet: '/q-1;+1',
        note: 'per component, in the order of the formula',
      },
    ],
  },
  component: {
    title: 'Component',
    summary:
      'A disconnected part of the structure. Components are numbered and serialised separately, joined by a dot in the formula and by semicolons in every other layer.',
    examples: [
      {
        snippet: 'ClH.Na',
        note: 'the formula of sodium chloride, two components',
      },
      { snippet: '/h1H;', note: 'the second component contributes nothing' },
    ],
  },
  'fixed-h layer': {
    title: 'Fixed-H layer',
    summary:
      'An optional `/f` block that pins the mobile hydrogens back onto specific atoms, distinguishing tautomers again. Standard InChI never includes it; it appears only when the engine is asked for it.',
    examples: [
      {
        snippet: '/f/h2-3H2',
        on: 'urea',
        note: 'the hydrogens fixed on the two nitrogens',
      },
    ],
  },
  parity: {
    title: 'Parity',
    summary:
      'The sign InChI records for a stereo element. It is defined against canonical numbers rather than CIP priorities, so it is not R/S and does not change when a distant substituent changes.',
    examples: [
      { snippet: '/t4-', note: 'atom 4 has parity minus' },
      {
        snippet: '/b6-5+',
        note: 'the double bond between atoms 5 and 6 is plus',
      },
    ],
  },
  'tetrahedral parity': {
    title: 'Tetrahedral parity',
    summary:
      'Look from the hydrogen — or from the neighbour with the smallest canonical number — towards the stereocentre. If the three remaining neighbours run clockwise in increasing canonical number, the parity is plus; anticlockwise is minus.',
    examples: [
      {
        snippet: '/t1-,2-',
        on: 'tartaric acid',
        note: 'both stereocentres carry the minus parity',
      },
    ],
  },
  'double bond parity': {
    title: 'Double-bond parity',
    summary:
      'For each end of the double bond take the neighbour with the higher canonical number. If those two lie on the same side of the bond the parity is minus, otherwise plus. It is not the same thing as Z/E, which uses CIP priorities.',
    examples: [
      { snippet: '/b2-1+', on: 'E-but-2-ene' },
      { snippet: '/b2-1-', on: 'Z-but-2-ene' },
    ],
  },
  'mirror flag': {
    title: 'Mirror flag',
    summary:
      'The `/m` layer. InChI writes whichever of the two enantiomers gives the smaller `/t` layer, then records with `/m0` that the compound is that one, or with `/m1` that it is the mirror image.',
    examples: [
      { snippet: '/t1-,2-/m0/s1', note: 'the structure as written' },
      {
        snippet: '/t1-,2-/m1/s1',
        note: 'its enantiomer — same /t, flipped /m',
      },
    ],
  },
  'stereo type': {
    title: 'Stereo type',
    summary:
      'The `/s` layer says how the stereo description should be read: 1 for absolute, 2 for relative, 3 for racemic. Standard InChI only ever writes 1.',
    examples: [
      { snippet: '/s1', note: 'absolute — the default for standard InChI' },
      { snippet: '/s2', note: 'relative; the /m layer is dropped' },
    ],
  },
  'isotopic layer': {
    title: 'Isotopic layer',
    summary:
      'The `/i` layer names the labelled atoms by canonical number and gives the shift from the rounded average mass, with `D` and `T` used for labelled hydrogens.',
    examples: [
      { snippet: '/i1+1', note: 'atom 1 is one mass unit heavier — ¹³C' },
      {
        snippet: '/i/hD2',
        note: 'two deuteriums, on atoms the layer cannot pin down',
      },
    ],
  },
  auxinfo: {
    title: 'AuxInfo',
    summary:
      'A companion string the engine can emit alongside the InChI. It is not part of the identifier, but its `/N:` field lists the input atom numbers in canonical order — which is how this guide can show you the numbering the engine chose.',
    examples: [
      {
        snippet: '/N:1,14,10,3,…',
        note: 'canonical atom 1 was input atom 1, canonical 2 was input atom 14',
      },
      { snippet: '/E:(1,2,3,4,5,6)', note: 'the equivalence classes it found' },
    ],
  },
  inchikey: {
    title: 'InChIKey',
    summary:
      'A fixed-length 27-character hash of an InChI, made for database lookup and web search. It cannot be turned back into a structure, and being a hash it can in principle collide.',
    examples: [
      {
        snippet: 'RYYVLZVUVIJVGH-UHFFFAOYSA-N',
        on: 'caffeine',
        note: 'skeleton block, stereo/isotope block, flags, proton letter',
      },
    ],
  },
  'base 26': {
    title: 'Base-26 encoding',
    summary:
      'The InChIKey alphabet: 26 uppercase letters, three of which carry 14 bits. Because 26³ is 17576 and 2¹⁴ is 16384, 1192 triplets are discarded so the mapping stays exact.',
    examples: [
      {
        snippet: 'AAA … ZZZ minus E** and TAA…TTV',
        note: 'the 16384 triplets that survive, in that order',
      },
    ],
  },
  'standard inchi': {
    title: 'Standard InChI',
    summary:
      'The default flavour, marked by the `1S` in the prologue. It fixes every option — tautomers perceived, metals disconnected, absolute stereo — so that two people generating an identifier for one compound always agree.',
    examples: [
      { snippet: 'InChI=1S/…', note: 'standard' },
      { snippet: 'InChI=1/…', note: 'non-standard: options were changed' },
    ],
  },
};
