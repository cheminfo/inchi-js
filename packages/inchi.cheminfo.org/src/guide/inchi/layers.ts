export type InchiBlock =
  | 'main'
  | 'charge'
  | 'stereo'
  | 'isotopic'
  | 'fixedH'
  | 'reconnected'
  | 'polymer';

export interface InchiSegment {
  /** Prefix letter of the segment, or `''` for the leading formula. */
  letter: string;
  /** Segment content, without the leading `/` and prefix letter. */
  value: string;
  /** Top-level block the segment belongs to. */
  block: InchiBlock;
  /** Short human-readable name of the segment in its context. */
  name: string;
}

export interface SplitInchi {
  /** The `InChI=1S` prologue. */
  version: string;
  segments: InchiSegment[];
}

type Section = 'main' | 'isotopic' | 'fixedH' | 'reconnected';

/**
 * Split an InChI string into its layer segments, tagging each with the
 * block it belongs to. The block matters because the same prefix letter
 * means different things depending on where it appears — `/h` is the
 * hydrogen layer in the main block and the exchangeable-isotopic-H
 * sublayer inside `/i`.
 * @param inchi - A full InChI string, with or without the `InChI=` prologue.
 * @returns The version prologue and the ordered list of segments.
 */
export function splitInchi(inchi: string): SplitInchi {
  const trimmed = inchi.trim();
  if (!trimmed) return { version: '', segments: [] };
  const parts = trimmed.split('/');
  const version = parts[0] ?? '';
  const segments: InchiSegment[] = [];
  let section: Section = 'main';
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i] ?? '';
    const isFormula = i === 1 && !isPrefixed(part);
    const letter = isFormula ? '' : (part[0] ?? '');
    const value = isFormula ? part : part.slice(1);
    section = nextSection(section, letter);
    const block = section === 'main' ? blockOfMainLetter(letter) : section;
    segments.push({ letter, value, block, name: segmentName(letter, block) });
  }
  return { version, segments };
}

function nextSection(section: Section, letter: string): Section {
  if (letter === 'r') return 'reconnected';
  if (letter === 'f') return 'fixedH';
  // An /i inside the fixed-H section is that section's isotopic part.
  if (letter === 'i' && section === 'main') return 'isotopic';
  return section;
}

/**
 * Find a segment by prefix letter within a given block.
 * @param split - Result of `splitInchi`.
 * @param letter - The prefix letter (`'c'`, `'h'`, `'t'`, …), `''` for the formula.
 * @param block - The block to look in; defaults to the one that letter
 *   lands in when it appears in the main section.
 * @returns The matching segment, or `undefined`.
 */
export function findSegment(
  split: SplitInchi,
  letter: string,
  block: InchiBlock = defaultBlockFor(letter),
): InchiSegment | undefined {
  for (const segment of split.segments) {
    if (segment.letter === letter && segment.block === block) return segment;
  }
  return undefined;
}

function isPrefixed(part: string): boolean {
  const first = part[0];
  if (first === undefined) return false;
  return first >= 'a' && first <= 'z';
}

/**
 * The block a prefix letter belongs to when it appears in the main
 * section — `/q` and `/p` are the charge block, `/b`, `/t`, `/m` and `/s`
 * the stereo block. Use it rather than assuming `'main'`, which is the
 * mistake that makes a lookup for `/t` silently find nothing.
 * @param letter - The prefix letter.
 * @returns The block that letter lands in.
 */
export function defaultBlockFor(letter: string): InchiBlock {
  return blockOfMainLetter(letter);
}

function blockOfMainLetter(letter: string): InchiBlock {
  if (['q', 'p'].includes(letter)) return 'charge';
  if (letter === 'z') return 'polymer';
  if (['b', 't', 'm', 's'].includes(letter)) {
    return 'stereo';
  }
  return 'main';
}

const MAIN_NAMES: Record<string, string> = {
  '': 'Chemical formula',
  c: 'Connections (skeleton)',
  h: 'Hydrogen positions',
  q: 'Net charge',
  p: 'Added / removed protons',
  z: 'Polymer connectivity',
  b: 'Double-bond (Z/E) stereo',
  t: 'Tetrahedral (sp3) parities',
  m: 'Parity of the mirror image',
  s: 'Stereo type (1 abs, 2 rel, 3 rac)',
};

const ISOTOPIC_NAMES: Record<string, string> = {
  i: 'Isotopically labelled atoms',
  h: 'Exchangeable isotopic hydrogens',
  b: 'Isotopic double-bond stereo',
  t: 'Isotopic tetrahedral parities',
  m: 'Isotopic mirror-image parity',
  s: 'Isotopic stereo type',
};

const FIXED_H_NAMES: Record<string, string> = {
  f: 'Fixed-H formula',
  h: 'Fixed hydrogen positions',
  q: 'Fixed-H charge',
  b: 'Fixed-H double-bond stereo',
  t: 'Fixed-H tetrahedral parities',
  m: 'Fixed-H mirror-image parity',
  s: 'Fixed-H stereo type',
  i: 'Fixed-H isotopic atoms',
  o: 'Transposition',
};

function segmentName(letter: string, block: InchiBlock): string {
  if (block === 'isotopic') {
    return ISOTOPIC_NAMES[letter] ?? `/${letter} segment`;
  }
  if (block === 'fixedH') return FIXED_H_NAMES[letter] ?? `/${letter} segment`;
  if (block === 'reconnected') return 'Reconnected-metal structure';
  return MAIN_NAMES[letter] ?? `/${letter} segment`;
}
