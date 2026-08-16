import type {
  MolfileFromAuxinfoOptions,
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
 * Reconstructs an MDL Molfile from an InChI AuxInfo string.
 *
 * Wraps the C API entry point `Get_inchi_Input_FromAuxInfo` followed
 * by `GetINCHI` with `-OutputSDF` to materialize the structure as a
 * Molfile. The MDL chiral flag from the AuxInfo is preserved.
 * @param auxinfo - The full AuxInfo string (typically returned by
 *   `inchiFromMolfile`).
 * @param options - Hydrogen and stereo interpretation options.
 * @returns The reconstructed Molfile and any messages.
 */
export async function molfileFromAuxinfo(
  auxinfo: string,
  options: MolfileFromAuxinfoOptions = {},
): Promise<MolfileFromInchiResult> {
  const raw = await callJsonReturning<RawResult>(
    'molfile_from_auxinfo',
    ['string', 'number', 'number'],
    [auxinfo, options.doNotAddH ? 1 : 0, options.diffUnkUndfStereo ? 1 : 0],
  );
  return {
    returnCode: raw.return_code,
    molfile: raw.molfile,
    message: raw.message,
    log: raw.log,
  };
}
