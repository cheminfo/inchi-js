export interface InchikeyDerivation {
  /** The part of the InChI that feeds the first hash block. */
  major: string;
  /** The part that feeds the second hash block, before it is doubled. */
  minor: string;
  /** What is actually hashed for the second block. */
  minorHashed: string;
  /** Full SHA-256 of the major part, as lowercase hex. */
  majorDigest: string;
  /** Full SHA-256 of the (possibly doubled) minor part, as lowercase hex. */
  minorDigest: string;
  /** 14 letters encoding the first 65 bits of the major digest. */
  firstBlock: string;
  /** 8 letters encoding the first 37 bits of the minor digest. */
  secondBlock: string;
  /** `S` for a standard InChI, `N` otherwise. */
  standardFlag: string;
  /** `A` for InChI version 1. */
  versionFlag: string;
  /** Letter encoding the `/p` proton count. */
  protonFlag: string;
  /** Number of protons the `/p` layer added or removed. */
  protons: number;
  inchikey: string;
}

const PLUS = 'OPQRSTUVWXYZ';
const MINUS = 'MLKJIHGFEDCB';

/**
 * Derive an InChIKey from an InChI string, following the same steps the
 * C library takes: split the InChI into a major part (skeleton) and a
 * minor part (everything else), SHA-256 each, and encode the leading bits
 * of the digests in base 26.
 *
 * Every step but the SHA-256 itself can be followed with pen and paper,
 * which is why the intermediate values are returned rather than only the
 * key.
 * @param inchi - A full InChI string.
 * @returns The key and every intermediate value used to build it.
 */
export async function deriveInchikey(
  inchi: string,
): Promise<InchikeyDerivation> {
  const source = inchi.trim();
  const firstSlash = source.indexOf('/');
  if (firstSlash === -1) throw new Error('Not an InChI string.');
  const standard = source.slice(0, firstSlash).endsWith('1S');
  const { major, minor, protons } = splitForHashing(source, firstSlash);

  const minorHashed =
    minor.length > 0 && minor.length < 255 ? minor + minor : minor;
  const majorBytes = await sha256(major);
  const minorBytes = await sha256(minorHashed);

  const firstBlock =
    triplet(majorBytes, 1) +
    triplet(majorBytes, 2) +
    triplet(majorBytes, 3) +
    triplet(majorBytes, 4) +
    dubletBits56To64(majorBytes);
  const secondBlock =
    triplet(minorBytes, 1) +
    triplet(minorBytes, 2) +
    dubletBits28To36(minorBytes);
  const standardFlag = standard ? 'S' : 'N';
  const versionFlag = 'A';
  const protonFlag = protonCharacter(protons);

  return {
    major,
    minor,
    minorHashed,
    majorDigest: toHex(majorBytes),
    minorDigest: toHex(minorBytes),
    firstBlock,
    secondBlock,
    standardFlag,
    versionFlag,
    protonFlag,
    protons,
    inchikey: `${firstBlock}-${secondBlock}${standardFlag}${versionFlag}-${protonFlag}`,
  };
}

/**
 * Split an InChI the way the key generator does. The major part runs from
 * the formula up to the first segment that is not `/c`, `/h` or `/q`; the
 * `/p` segment belongs to neither part and only sets the proton flag.
 * @param source - The full InChI string.
 * @param firstSlash - Index of the slash that ends the version prologue.
 * @returns The two parts and the proton count.
 */
export function splitForHashing(
  source: string,
  firstSlash: number,
): { major: string; minor: string; protons: number } {
  let cut = source.length;
  let protonAt = -1;
  let protons = 0;
  for (let i = firstSlash + 1; i < source.length - 1; i++) {
    if (source[i] !== '/') continue;
    const letter = source[i + 1];
    if (letter !== undefined && ['c', 'h', 'q'].includes(letter)) continue;
    if (letter === 'p') {
      protonAt = i;
      protons = Number.parseInt(source.slice(i + 2), 10) || 0;
      continue;
    }
    cut = i;
    break;
  }
  const majorEnd = protonAt === -1 ? cut : protonAt;
  return {
    major: source.slice(firstSlash + 1, majorEnd),
    minor: cut === source.length ? '' : source.slice(cut),
    protons,
  };
}

/**
 * The 26-letter alphabet InChIKey encodes bits in: triplets carry 14 bits
 * and dublets 9 bits.
 * @returns The triplet and dublet tables.
 */
function tables(): { triplets: string[]; dublets: string[] } {
  if (cached) return cached;
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const triplets: string[] = [];
  const dublets: string[] = [];
  for (let a = 0; a < 26; a++) {
    for (let b = 0; b < 26; b++) {
      dublets.push(`${letters[a] as string}${letters[b] as string}`);
      for (let c = 0; c < 26; c++) {
        const first = letters[a] as string;
        const second = letters[b] as string;
        const third = letters[c] as string;
        // 1192 triplets are dropped so the table holds exactly 2^14 of them.
        if (first === 'E') continue;
        if (
          first === 'T' &&
          (second < 'T' || (second === 'T' && third <= 'V'))
        ) {
          continue;
        }
        triplets.push(`${first}${second}${third}`);
      }
    }
  }
  cached = { triplets, dublets };
  return cached;
}

let cached: { triplets: string[]; dublets: string[] } | null = null;

function triplet(bytes: Uint8Array, index: number): string {
  const { triplets } = tables();
  const at = (i: number) => bytes[i] ?? 0;
  let value = 0;
  if (index === 1) {
    value = at(0) | ((at(1) & 0x3f) << 8);
  } else if (index === 2) {
    value = ((at(1) & 0xc0) | (at(2) << 8) | ((at(3) & 0x0f) << 16)) >>> 6;
  } else if (index === 3) {
    value = ((at(3) & 0xf0) | (at(4) << 8) | ((at(5) & 0x03) << 16)) >>> 4;
  } else {
    value = ((at(5) & 0xfc) | (at(6) << 8)) >>> 2;
  }
  return triplets[value] ?? 'AAA';
}

function dubletBits28To36(bytes: Uint8Array): string {
  const { dublets } = tables();
  const value =
    (((bytes[3] ?? 0) & 0xf0) | (((bytes[4] ?? 0) & 0x1f) << 8)) >>> 4;
  return dublets[value] ?? 'AA';
}

function dubletBits56To64(bytes: Uint8Array): string {
  const { dublets } = tables();
  const value = (bytes[7] ?? 0) | (((bytes[8] ?? 0) & 0x01) << 8);
  return dublets[value] ?? 'AA';
}

function protonCharacter(protons: number): string {
  if (protons === 0) return 'N';
  if (Math.abs(protons) > 12) return 'A';
  const table = protons > 0 ? PLUS : MINUS;
  return table[Math.abs(protons) - 1] ?? 'A';
}

async function sha256(text: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return new Uint8Array(digest);
}

function toHex(bytes: Uint8Array): string {
  let hex = '';
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}
