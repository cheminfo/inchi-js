/**
 * Return code from the underlying C API.
 *
 *  -  `0` — OK.
 *  -  `1` — Warning (the result is still usable; check `message`/`log`).
 *  - `-1` — Error (the result is empty or invalid).
 */
export type InchiReturnCode = -1 | 0 | 1;

/**
 * Result of `inchiFromMolfile`.
 */
export interface InchiFromMolfileResult {
  /** Return code from the C API. */
  returnCode: InchiReturnCode;
  /** The InChI string (empty on error). */
  inchi: string;
  /** The AuxInfo string (empty on error). */
  auxinfo: string;
  /** Human-readable message (warnings/errors). */
  message: string;
  /** Detailed log from the C API (warnings/errors). */
  log: string;
}

/**
 * Result of `inchikeyFromInchi`.
 */
export interface InchikeyFromInchiResult {
  /** Return code from the C API. */
  returnCode: InchiReturnCode;
  /** The 27-character InChIKey (empty on error). */
  inchikey: string;
  /** Human-readable message (errors). */
  message: string;
}

/**
 * Result of `molfileFromInchi` or `molfileFromAuxinfo`.
 */
export interface MolfileFromInchiResult {
  /** Return code from the C API. */
  returnCode: InchiReturnCode;
  /** The reconstructed Molfile (empty on error). */
  molfile: string;
  /** Human-readable message (warnings/errors). */
  message: string;
  /** Detailed log from the C API (warnings/errors). */
  log: string;
}

/**
 * Options for `inchiFromMolfile`.
 * @see https://www.inchi-trust.org/download/104/InChI_TechMan.pdf
 */
export interface InchiFromMolfileOptions {
  /**
   * Raw InChI option string passed verbatim to the C API. Each option
   * begins with `-` on Linux/macOS, e.g. `'-AuxNone'`, `'-DoNotAddH'`,
   * `'-FixedH'`, `'-RecMet'`, `'-SLUUD'`. Pass multiple options as a
   * single space-separated string: `'-AuxNone -DoNotAddH'`.
   * @default ''
   */
  options?: string;
}

/**
 * Options for `molfileFromInchi`.
 */
export interface MolfileFromInchiOptions {
  /**
   * Raw option string passed verbatim to the C API (`GetStructFromINCHIEx`).
   * Example: `'-OutputSDF'`.
   * @default ''
   */
  options?: string;
}

/**
 * 0D stereo type, mirroring `inchi_StereoType0D` in the C API.
 *
 *  - `0` — None.
 *  - `1` — Double bond / cumulene (stereogenic >A=B< or >A=C=…=B<).
 *  - `2` — Tetrahedral.
 *  - `3` — Allene.
 */
export type StereoType = 0 | 1 | 2 | 3;

/**
 * 0D stereo parity, mirroring `inchi_StereoParity0D` in the C API.
 *
 *  - `0` — None.
 *  - `1` — Odd (`'o'`).
 *  - `2` — Even (`'e'`).
 *  - `3` — Unknown (`'u'`).
 *  - `4` — Undefined (`'?'`).
 *
 * For stereobonds with metal disconnection, the value may pack two
 * parities: `connected | (disconnected << 3)`.
 */
export type StereoParity = number;

/**
 * One bond from the perspective of a single atom in `StructureAtom`.
 * Bonds appear in the adjacency list of one or both endpoints; do not
 * double-count when iterating bonds.
 */
export interface StructureBond {
  /** 0-indexed neighbour atom. */
  to: number;
  /**
   * Bond order: `1` single, `2` double, `3` triple, `4` aromatic,
   * `5`–`8` various alternating / tautomeric variants.
   */
  type: number;
  /**
   * 2D wedge encoding from the InChI parser. Negative values mean the
   * pointed end is at the opposite atom. `0` when no 2D wedge was set.
   */
  stereo: number;
}

/**
 * One atom from the parsed InChI structure.
 */
export interface StructureAtom {
  /** Element symbol, e.g. `"C"`, `"Si"`. */
  element: string;
  /** Formal charge. */
  charge: number;
  /** Radical indicator (`0` none, `1` singlet, `2` doublet, `3` triplet). */
  radical: number;
  /**
   * `0` for natural abundance; otherwise isotopic mass or
   * `ISOTOPIC_SHIFT_FLAG + mass - <average atomic mass>` per the C API.
   */
  isotopicMass: number;
  /**
   * Implicit hydrogen counts `[auto, 1H, 2H, 3H]`. `auto[0] === -1`
   * means the InChI library adds implicit Hs based on valence.
   */
  implicitH: [number, number, number, number];
  /** Adjacency list — bonds incident on this atom. */
  bonds: StructureBond[];
}

/**
 * One 0D stereo descriptor (tetrahedral centre, stereobond, or allene).
 */
export interface StructureStereo {
  /**
   * Central atom (0-indexed) for tetrahedral / allene centres. `-1`
   * for stereobonds (where the geometry is on the two end-atoms).
   */
  centralAtom: number;
  /**
   * Four atom indices defining the stereo arrangement. `-1` denotes
   * `No_Neighbor` (implicit H slot for a 3-neighbour tetrahedral
   * centre, or non-existent endpoint for bonds).
   */
  neighbors: [number, number, number, number];
  /** See {@link StereoType}. */
  type: StereoType;
  /** See {@link StereoParity}. */
  parity: StereoParity;
}

/**
 * Result of `structureFromInchi`.
 */
export interface StructureFromInchiResult {
  /** Return code from the C API. */
  returnCode: InchiReturnCode;
  /** Human-readable message (warnings/errors). */
  message: string;
  /** Detailed log from the C API. */
  log: string;
  /** Atoms with adjacency lists. */
  atoms: StructureAtom[];
  /** 0D stereo descriptors (empty if the InChI carried no stereo layer). */
  stereo: StructureStereo[];
}

/**
 * Options for `structureFromInchi`.
 */
export interface StructureFromInchiOptions {
  /**
   * Raw option string passed verbatim to `GetStructFromINCHIEx`.
   * @default ''
   */
  options?: string;
}

/**
 * Options for `molfileFromAuxinfo`.
 */
export interface MolfileFromAuxinfoOptions {
  /**
   * Do not add explicit hydrogens to the reconstructed structure.
   * @default false
   */
  doNotAddH?: boolean;
  /**
   * Differentiate "unknown" from "undefined" stereo when interpreting
   * the AuxInfo. Mirrors the C API `bDiffUnkUndfStereo` flag.
   * @default false
   */
  diffUnkUndfStereo?: boolean;
}
