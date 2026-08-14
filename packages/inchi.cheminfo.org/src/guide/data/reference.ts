import type { ReferenceSection } from './types.ts';

/**
 * The printable cheatsheet: every layer, every piece of punctuation, and
 * the two parity conventions, grouped the way the identifier is ordered.
 */
export const REFERENCE_SECTIONS: readonly ReferenceSection[] = [
  {
    title: 'Prologue',
    colour: '#4c9a68',
    rows: [
      {
        syntax: 'InChI=1S/',
        description: 'Standard InChI, version 1',
        name: 'Standard prologue',
        detail:
          'The S means every option was left at its standard value: tautomers perceived, metals disconnected, stereo absolute. Two people generating a standard InChI for one compound always agree.',
        example: {
          snippet: 'InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3',
          input: 'ethanol',
          note: 'the prologue is not part of any layer',
        },
      },
      {
        syntax: 'InChI=1/',
        description: 'Non-standard: some option was changed',
        name: 'Non-standard prologue',
        detail:
          'Produced when the engine is asked for a fixed-H layer, reconnected metals, relative stereo, and so on. Non-standard identifiers should never be compared with standard ones.',
        example: {
          snippet: 'InChI=1/CH4N2O/c2-1(3)4/h(H4,2,3,4)/f/h2-3H2',
          input: 'urea with -FixedH',
          note: 'the /f layer forces the non-standard prologue',
        },
      },
      {
        syntax: 'AuxInfo=',
        description: 'Companion string, not part of the identifier',
        name: 'AuxInfo',
        detail:
          'Carries the mapping back to the input atom numbering in its /N: field and the equivalence classes in /E:. Never store it as an identifier — it depends on the input order.',
        example: {
          snippet: 'AuxInfo=1/0/N:1,14,10,3,…',
          input: 'caffeine',
          note: 'canonical atom 2 was input atom 14',
        },
      },
    ],
  },
  {
    title: 'Main layer',
    colour: '#4c9a68',
    rows: [
      {
        syntax: 'C8H10N4O2',
        description: 'Formula: C, then H, then alphabetical',
        name: 'Chemical formula',
        detail:
          'Hill order. Counts of 1 are omitted. Components are joined with a dot, and repeated identical components carry a leading multiplier.',
        example: {
          snippet: 'C2H4O2.Na',
          input: 'sodium acetate',
          note: 'two components, joined by a dot',
        },
      },
      {
        syntax: '/c1-2-3',
        description: 'Connections, as a depth-first walk',
        name: 'Connections layer',
        detail:
          'Starts at the atom with fewest neighbours, lowest canonical number breaking the tie. Neighbours are visited in order of how much hangs off them, smallest first.',
        example: {
          snippet: '/c1-3-6-4(2)5',
          input: 'ethyl acetate',
          note: 'atom 4 carries both 2 and 5',
        },
      },
      {
        syntax: '( )',
        description: 'Holds all but the last neighbour of an atom',
        name: 'Branch parentheses',
        detail:
          'Not a branch marker in the SMILES sense: when an atom has more than one continuation, every one but the last is parenthesised, and the last follows the closing bracket.',
        example: {
          snippet: '5(10)7',
          input: 'caffeine',
          note: 'atom 5 continues to both 10 and 7',
        },
      },
      {
        syntax: '…(6)…',
        description: 'A repeated number closes a ring',
        name: 'Ring closure',
        detail:
          'Written at the later of the two atoms, and the walk does not descend into it again. The number of ring closures equals the number of rings.',
        example: {
          snippet: '/c1-2-4-6-5-3-1',
          input: 'benzene',
          note: 'the final 1 closes the ring',
        },
      },
      {
        syntax: '/h4H,1-3H3',
        description: 'Hydrogens, grouped by count',
        name: 'Hydrogen layer',
        detail:
          'Runs are ordered by hydrogen count, fewest first. Consecutive atom numbers collapse into a range. A count of 1 is written as a bare H.',
        example: {
          snippet: '/h3H,2H2,1H3',
          input: 'ethanol',
          note: 'one H on atom 3, two on atom 2, three on atom 1',
        },
      },
      {
        syntax: '(H,3,4)',
        description: 'A hydrogen shared over several atoms',
        name: 'Mobile-H group',
        detail:
          'The reason tautomers share an identifier. The count follows the H, and the atoms after it are the endpoints. Endpoints count no hydrogen of their own when atoms are ranked.',
        example: {
          snippet: '/h(H4,2,3,4)',
          input: 'urea',
          note: 'four hydrogens over both nitrogens and the oxygen',
        },
      },
      {
        syntax: ';',
        description: 'Separates components inside a layer',
        name: 'Component separator',
        detail:
          'Every layer keeps one slot per component, in the order of the formula. A component with nothing to contribute leaves its slot empty rather than disappearing.',
        example: {
          snippet: '/c1-2(3)4;',
          input: 'sodium acetate',
          note: 'the sodium contributes no connections',
        },
      },
      {
        syntax: '2*',
        description: 'Multiplier for identical components',
        name: 'Component multiplier',
        detail:
          'Used in every layer but the formula, where a plain leading number is used instead.',
        example: {
          snippet: '/h2*1H2',
          input: 'two waters',
          note: 'the same layer for both components',
        },
      },
    ],
  },
  {
    title: 'Charge',
    colour: '#bf7326',
    rows: [
      {
        syntax: '/q+1',
        description: 'Net charge that protons cannot explain',
        name: 'Charge layer',
        detail:
          'Used for permanent charges — a quaternary ammonium, a metal ion. Written per component, separated by semicolons.',
        example: {
          snippet: '/q;+1',
          input: 'sodium acetate',
          note: 'the charge belongs to the second component',
        },
      },
      {
        syntax: '/p-1',
        description: 'Protons removed from the neutral skeleton',
        name: 'Proton layer',
        detail:
          'A compound and its conjugate base differ only here. Not hashed into the InChIKey — the count is carried by the key’s final letter instead.',
        example: {
          snippet: '/p-1',
          input: 'acetate',
          note: 'acetic acid minus one proton',
        },
      },
    ],
  },
  {
    title: 'Stereo',
    colour: '#c2405a',
    rows: [
      {
        syntax: '/b4-3+',
        description: 'Double-bond parity, higher atom first',
        name: 'Double-bond stereo',
        detail:
          'Take the higher-numbered neighbour at each end of the bond. Same side is minus, opposite sides is plus. This is not Z/E: it follows canonical numbers, not CIP priorities.',
        example: {
          snippet: '/b4-3+ vs /b4-3-',
          input: 'E- and Z-but-2-ene',
          note: 'the only difference between the two identifiers',
        },
      },
      {
        syntax: '/t2-',
        description: 'Tetrahedral parity',
        name: 'Tetrahedral stereo',
        detail:
          'View from the hydrogen, or from the lowest-numbered neighbour when there is none. Clockwise in increasing canonical number is plus, anticlockwise is minus.',
        example: {
          snippet: '/t1-,2-',
          input: 'tartaric acid',
          note: 'both centres, in ascending atom order',
        },
      },
      {
        syntax: '?',
        description: 'Configuration not known',
        name: 'Undefined stereo',
        detail:
          'Written in place of a sign. An InChI with a ? is not the same as one with the layer absent: absent means no stereocentre, ? means one that was not specified.',
        example: {
          snippet: '/t3-,4?',
          input: 'a partly specified diol',
          note: 'atom 4 was drawn ambiguously',
        },
      },
      {
        syntax: '/m0',
        description: 'The structure as written',
        name: 'Mirror flag',
        detail:
          'InChI writes the smaller of the two mirror-image parity strings in /t, then records here whether the compound is that one (/m0) or its mirror image (/m1).',
        example: {
          snippet: '/t1-,2-/m1/s1',
          input: 'the other tartaric acid enantiomer',
          note: 'same /t, different /m',
        },
      },
      {
        syntax: '/s1',
        description: 'Stereo type: 1 absolute, 2 relative, 3 racemic',
        name: 'Stereo type',
        detail:
          'Standard InChI only ever writes /s1. Relative stereochemistry drops the /m layer entirely.',
        example: {
          snippet: '/s2',
          input: 'relative stereochemistry',
          note: 'no /m layer accompanies it',
        },
      },
    ],
  },
  {
    title: 'Isotopes and fixed H',
    colour: '#c2405a',
    rows: [
      {
        syntax: '/i1+1',
        description: 'Atom 1 is one mass unit heavier',
        name: 'Isotopic layer',
        detail:
          'The shift is measured from the rounded average atomic mass, so ¹³C is +1 and ¹⁵N is +1. Entries are comma-separated in ascending atom order.',
        example: {
          snippet: '/i1+1,4+1',
          input: 'doubly ¹³C-labelled benzene',
          note: 'two labelled atoms',
        },
      },
      {
        syntax: '/i1D3',
        description: 'Labelled hydrogens on a named atom',
        name: 'Labelled hydrogen',
        detail:
          'D and T replace the numeric shift for hydrogen. The count follows the letter.',
        example: {
          snippet: '/i1D3',
          input: 'methanol-d3',
          note: 'three deuteriums on atom 1',
        },
      },
      {
        syntax: '/i/hD2',
        description: 'Labelled hydrogens that cannot be placed',
        name: 'Exchangeable label',
        detail:
          'A label on a mobile hydrogen has no single home, so it moves to a sublayer that names only the count. The bare /i marks the isotopic block.',
        example: {
          snippet: '/i/hD2',
          input: 'urea-d2',
          note: 'two deuteriums somewhere in the mobile group',
        },
      },
      {
        syntax: '/f',
        description: 'Fixed-H block: tautomers separated again',
        name: 'Fixed-H layer',
        detail:
          'Never present in a standard InChI. Inside it, a layer identical to its counterpart in the main block is omitted, so its absence means “as above”.',
        example: {
          snippet: '/f/h2-3H2',
          input: 'urea',
          note: 'the hydrogens pinned onto the two nitrogens',
        },
      },
      {
        syntax: '/r',
        description: 'The same structure with metals reconnected',
        name: 'Reconnected layer',
        detail:
          'Standard InChI disconnects bonds to metals; this optional block repeats the whole identifier for the reconnected form.',
        example: {
          snippet: '…/rC10H16N2O8.2Na/…',
          input: 'a sodium chelate',
          note: 'everything after /r describes the reconnected structure',
        },
      },
    ],
  },
  {
    title: 'InChIKey',
    colour: '#5a4fa3',
    rows: [
      {
        syntax: 'AAAAAAAAAAAAAA',
        description: '14 letters: the skeleton',
        name: 'First block',
        detail:
          '65 bits of the SHA-256 of the formula, /c, /h and /q layers, written in base 26. Two compounds sharing it have the same skeleton and connectivity.',
        example: {
          snippet: 'RYYVLZVUVIJVGH',
          input: 'caffeine',
          note: 'four triplets of 14 bits plus a dublet of 9',
        },
      },
      {
        syntax: 'BBBBBBBB',
        description: '8 letters: stereo and isotopes',
        name: 'Second block',
        detail:
          '37 bits of the SHA-256 of the remaining layers. UHFFFAOY is the value for an InChI with no layers left over, so it appears on most achiral, unlabelled compounds.',
        example: {
          snippet: 'UHFFFAOY',
          input: 'any structure with no stereo or isotopes',
          note: 'the hash of an empty second part',
        },
      },
      {
        syntax: 'SA',
        description: 'Standard flag, then version',
        name: 'Flags',
        detail:
          'S for a standard InChI and N otherwise; A for version 1. They sit at the end of the second block, before the final dash.',
        example: {
          snippet: '-UHFFFAOYSA-N',
          input: 'a standard key',
          note: 'S then A then the proton letter',
        },
      },
      {
        syntax: '-N',
        description: 'Proton count: N neutral, M −1, O +1',
        name: 'Proton letter',
        detail:
          'Walks backwards from M for each proton removed and forwards from O for each added, up to twelve either way; beyond that it is A.',
        example: {
          snippet: '-M',
          input: 'acetate',
          note: 'one proton removed',
        },
      },
    ],
  },
] as const;
