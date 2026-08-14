/**
 * Read the canonical-number → original-atom mapping out of an AuxInfo
 * string. The `/N:` field lists, for canonical number 1, 2, 3 …, the
 * atom number the input connection table used. Components of a
 * multi-component structure are separated by `;`.
 * @param auxinfo - An AuxInfo string as returned by `inchiFromMolfile`.
 * @returns One array of original atom numbers per component.
 */
export function canonicalToOriginal(auxinfo: string): number[][] {
  return readNumberField(auxinfo, 'N');
}

/**
 * Read the `/E:` atom-equivalence field of an AuxInfo string. Each
 * parenthesised run lists canonical numbers the canonicalizer found
 * constitutionally equivalent, for example `(1,2)(3,4)`.
 * @param auxinfo - An AuxInfo string as returned by `inchiFromMolfile`.
 * @returns One array of canonical numbers per equivalence class; empty
 *   when the structure has no equivalent atoms.
 */
export function equivalenceGroups(auxinfo: string): number[][] {
  const field = fieldValue(auxinfo, 'E');
  if (!field) return [];
  const groups: number[][] = [];
  const pattern = /\((?<body>[^)]*)\)/g;
  let match = pattern.exec(field);
  while (match !== null) {
    const numbers = parseNumbers(match.groups?.body ?? '');
    if (numbers.length > 1) groups.push(numbers);
    match = pattern.exec(field);
  }
  return groups;
}

function readNumberField(auxinfo: string, letter: string): number[][] {
  const field = fieldValue(auxinfo, letter);
  if (!field) return [];
  const components: number[][] = [];
  for (const chunk of field.split(';')) {
    components.push(parseNumbers(chunk));
  }
  return components;
}

function fieldValue(auxinfo: string, letter: string): string | null {
  const marker = `/${letter}:`;
  const start = auxinfo.indexOf(marker);
  if (start === -1) return null;
  const from = start + marker.length;
  const end = auxinfo.indexOf('/', from);
  return end === -1 ? auxinfo.slice(from) : auxinfo.slice(from, end);
}

function parseNumbers(chunk: string): number[] {
  const numbers: number[] = [];
  for (const raw of chunk.split(',')) {
    const value = Number.parseInt(raw, 10);
    if (Number.isFinite(value)) numbers.push(value);
  }
  return numbers;
}

/**
 * Invert a canonical → original mapping so it can be used to label the
 * atoms of the drawn structure.
 * @param canonicalOrder - Original atom numbers in canonical order.
 * @returns A map from original atom number to canonical number.
 */
export function originalToCanonical(
  canonicalOrder: number[],
): Map<number, number> {
  const map = new Map<number, number>();
  for (let i = 0; i < canonicalOrder.length; i++) {
    const original = canonicalOrder[i];
    if (original !== undefined) map.set(original, i + 1);
  }
  return map;
}
