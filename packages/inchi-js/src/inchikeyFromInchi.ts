import type { InchikeyFromInchiResult } from './types.ts';
import { callJsonReturning } from './wasm/loadWasm.ts';

interface RawResult {
  /* eslint-disable @typescript-eslint/naming-convention -- shape comes from the C wrapper JSON */
  return_code: -1 | 0 | 1;
  inchikey: string;
  message: string;
  /* eslint-enable @typescript-eslint/naming-convention */
}

/**
 * Computes the 27-character InChIKey for an InChI string.
 *
 * Wraps the C API entry point `GetINCHIKeyFromINCHI`.
 * @param inchi - The full InChI string (e.g. `'InChI=1S/H2O/h1H2'`).
 * @returns The InChIKey and any error message.
 */
export async function inchikeyFromInchi(
  inchi: string,
): Promise<InchikeyFromInchiResult> {
  const raw = await callJsonReturning<RawResult>(
    'inchikey_from_inchi',
    ['string'],
    [inchi],
  );
  return {
    returnCode: raw.return_code,
    inchikey: raw.inchikey,
    message: raw.message,
  };
}
