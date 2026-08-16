import type {
  StructureFromInchiOptions,
  StructureFromInchiResult,
} from './types.ts';
import { callJsonReturning } from './wasm/loadWasm.ts';

interface RawResult {
  /* eslint-disable @typescript-eslint/naming-convention -- shape comes from the C wrapper JSON */
  return_code: -1 | 0 | 1;
  /* eslint-enable @typescript-eslint/naming-convention */
  message: string;
  log: string;
  atoms: StructureFromInchiResult['atoms'];
  stereo: StructureFromInchiResult['stereo'];
}

/**
 * Parses an InChI string into its raw atom, bond, and 0D stereo data.
 *
 * Unlike `molfileFromInchi`, which delegates to the IUPAC
 * `-OutputSDF` writer (and silently drops every parity and the chiral
 * flag), this function exposes the fields populated by
 * `GetStructFromINCHIEx` so the caller can build a molecule with
 * correct stereochemistry, invent 2D coordinates, and render it.
 * @param inchi - The full InChI string.
 * @param options - Optional InChI option string passed verbatim.
 * @returns Atoms with adjacency lists, plus 0D stereo descriptors.
 */
export async function structureFromInchi(
  inchi: string,
  options: StructureFromInchiOptions = {},
): Promise<StructureFromInchiResult> {
  const raw = await callJsonReturning<RawResult>(
    'structure_from_inchi',
    ['string', 'string'],
    [inchi, options.options ?? ''],
  );
  return {
    returnCode: raw.return_code,
    message: raw.message,
    log: raw.log,
    atoms: raw.atoms,
    stereo: raw.stereo,
  };
}
