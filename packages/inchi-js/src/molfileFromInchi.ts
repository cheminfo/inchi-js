import type {
  MolfileFromInchiOptions,
  MolfileFromInchiResult,
} from './types.ts';
import { callJsonReturning } from './wasm/loadWasm.ts';

interface RawResult {
  /* eslint-disable @typescript-eslint/naming-convention -- shape comes from the C wrapper JSON */
  return_code: -1 | 0 | 1;
  molfile: string;
  message: string;
  log: string;
  /* eslint-enable @typescript-eslint/naming-convention */
}

/**
 * Reconstructs an MDL Molfile from an InChI string.
 *
 * Wraps the C API entry point `GetStructFromINCHIEx` followed by
 * `GetINCHIEx` with `-OutputSDF` to materialize the structure as a
 * Molfile.
 * @param inchi - The full InChI string.
 * @param options - Optional InChI option string passed verbatim.
 * @returns The reconstructed Molfile and any messages.
 */
export async function molfileFromInchi(
  inchi: string,
  options: MolfileFromInchiOptions = {},
): Promise<MolfileFromInchiResult> {
  const raw = await callJsonReturning<RawResult>(
    'molfile_from_inchi',
    ['string', 'string'],
    [inchi, options.options ?? ''],
  );
  return {
    returnCode: raw.return_code,
    molfile: raw.molfile,
    message: raw.message,
    log: raw.log,
  };
}
