export interface MobileHydrogenGroup {
  /** Number of hydrogens shared over the group. */
  hydrogens: number;
  /** Number of negative charges shared over the group. */
  charges: number;
  /** Canonical numbers of the atoms the hydrogens move between. */
  atoms: number[];
}

export interface FixedHydrogenGroup {
  /** Number of hydrogens each listed atom carries. */
  hydrogens: number;
  /** Canonical numbers of the atoms carrying them. */
  atoms: number[];
}

/**
 * Parse the mobile-hydrogen groups of an `/h` layer — the parenthesised
 * runs such as `(H,4,5)` (one hydrogen shared over atoms 4 and 5) or
 * `(H2,1,2,3)`.
 * @param hLayer - Content of the `/h` segment, without the `h` prefix.
 * @returns One entry per parenthesised group, in the order they appear.
 */
export function parseMobileHydrogens(hLayer: string): MobileHydrogenGroup[] {
  const groups: MobileHydrogenGroup[] = [];
  const pattern = /\((?<body>[^)]*)\)/g;
  let match = pattern.exec(hLayer);
  while (match !== null) {
    const group = parseMobileGroup(match.groups?.body ?? '');
    if (group) groups.push(group);
    match = pattern.exec(hLayer);
  }
  return groups;
}

/**
 * Parse the immobile part of an `/h` layer — the runs such as `4H` or
 * `1-3H3` that state how many hydrogens sit on named atoms.
 * @param hLayer - Content of the `/h` segment, without the `h` prefix.
 * @returns One entry per run, in the order they appear.
 */
export function parseFixedHydrogens(hLayer: string): FixedHydrogenGroup[] {
  const withoutMobile = hLayer.replaceAll(/\([^)]*\)/g, '');
  const groups: FixedHydrogenGroup[] = [];
  const pattern = /(?<atoms>[\d,-]+)H(?<count>\d*)/g;
  let match = pattern.exec(withoutMobile);
  while (match !== null) {
    const atoms = expandAtomList(match.groups?.atoms ?? '');
    if (atoms.length > 0) {
      const raw = match.groups?.count ?? '';
      groups.push({ hydrogens: raw ? Number.parseInt(raw, 10) : 1, atoms });
    }
    match = pattern.exec(withoutMobile);
  }
  return groups;
}

/**
 * Expand an InChI atom list such as `1-3,7` into explicit numbers.
 * @param list - The comma- and dash-separated list.
 * @returns The atom numbers it denotes.
 */
export function expandAtomList(list: string): number[] {
  const atoms: number[] = [];
  for (const chunk of list.split(',')) {
    if (!chunk) continue;
    const dash = chunk.indexOf('-');
    if (dash > 0) {
      const from = Number.parseInt(chunk.slice(0, dash), 10);
      const to = Number.parseInt(chunk.slice(dash + 1), 10);
      if (!Number.isFinite(from) || !Number.isFinite(to)) continue;
      for (let atom = from; atom <= to; atom++) atoms.push(atom);
    } else {
      const atom = Number.parseInt(chunk, 10);
      if (Number.isFinite(atom)) atoms.push(atom);
    }
  }
  return atoms;
}

const MOBILE_GROUP =
  /^(?:H(?<h>\d*))?(?:-(?<neg>\d*))?(?:\+(?<pos>\d*))?,?(?<atoms>[\d,-]*)$/;

function parseMobileGroup(body: string): MobileHydrogenGroup | null {
  const match = MOBILE_GROUP.exec(body);
  if (!match) return null;
  const groups = match.groups ?? {};
  return {
    hydrogens: countOf(groups.h),
    charges: countOf(groups.neg),
    atoms: expandAtomList(groups.atoms ?? ''),
  };
}

function countOf(raw: string | undefined): number {
  if (raw === undefined) return 0;
  return raw ? Number.parseInt(raw, 10) : 1;
}
