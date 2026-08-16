import type {
  InchiFromMolfileOptions,
  InchiFromMolfileResult,
} from './types.ts';
import { callJsonReturning } from './wasm/loadWasm.ts';

interface RawResult {
  /* eslint-disable @typescript-eslint/naming-convention -- shape comes from the C wrapper JSON */
  return_code: -1 | 0 | 1;
  inchi: string;
  auxinfo: string;
  message: string;
  log: string;
  /* eslint-enable @typescript-eslint/naming-convention */
}

/**
 * Converts an MDL Molfile (V2000 or V3000) to its InChI string.
 *
 * Wraps the C API entry point `MakeINCHIFromMolfileText` from the
 * official IUPAC InChI library.
 * @param molfile - The full Molfile content (multiline string).
 * @param options - InChI option string and other settings.
 * @returns The InChI string, the AuxInfo string, and any messages.
 */
export async function inchiFromMolfile(
  molfile: string,
  options: InchiFromMolfileOptions = {},
): Promise<InchiFromMolfileResult> {
  const raw = await callJsonReturning<RawResult>(
    'inchi_from_molfile',
    ['string', 'string'],
    [molfile, options.options ?? ''],
  );
  return {
    returnCode: raw.return_code,
    inchi: raw.inchi,
    auxinfo: raw.auxinfo,
    message: raw.message,
    log: raw.log,
  };
}
