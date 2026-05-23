import { inchiFromMolfile, molfileFromInchi } from 'inchi-js';
import { CanonizerUtil, Molecule } from 'openchemlib';

import {
  extractMolfile,
  getMolfileId,
  iterateSdfRecords,
} from './sdfParsing.ts';

/**
 * Outcome of a single Molfile → InChI → Molfile round-trip:
 *
 * - `ok`: the post-roundtrip molecule matches the original under the
 *   tautomer-aware OCL canonical form. Two molecules that differ only
 *   by which tautomer was selected are considered equivalent — the
 *   InChI normalisation is allowed to relocate labile hydrogens.
 * - `mismatch`: the InChI/Molfile pipeline ran without error but the
 *   tautomer-aware idCode still differs (stereo loss, charge change,
 *   formula change, …).
 * - `inchi-error`: `inchiFromMolfile` returned an empty InChI.
 * - `molfile-error`: `molfileFromInchi` returned an empty Molfile.
 * - `parse-error`: OpenChemLib could not parse one of the Molfiles
 *   into a `Molecule`.
 */
export type RoundtripStatus =
  | 'ok'
  | 'mismatch'
  | 'inchi-error'
  | 'molfile-error'
  | 'parse-error';

export interface RoundtripResult {
  molfileId: string;
  status: RoundtripStatus;
  /** Original Molfile idCode (canonical OCL form, full information). */
  originalIdCode: string;
  /** idCode of the Molfile reconstructed from the InChI (full information). */
  roundtripIdCode: string;
  /** Tautomer-aware canonical idCode of the original Molfile. */
  originalTautomerIdCode: string;
  /** Tautomer-aware canonical idCode of the reconstructed Molfile. */
  roundtripTautomerIdCode: string;
  /** InChI computed from the original Molfile. */
  inchi: string;
  /** Diagnostic message from the C library or OCL, if any. */
  message: string;
}

/**
 * Perform a single round-trip: original Molfile → InChI → reconstructed
 * Molfile → OCL canonical idCode, and compare to the OCL idCode of the
 * original Molfile.
 * @param molfile - The original V2000/V3000 Molfile text.
 * @param molfileId - The structure's identifier (preserved on the
 *   returned record so callers can correlate with the SDF).
 * @param inchiOptions - Optional raw InChI option string (e.g. `-RecMet`).
 * @returns The roundtrip result, never throws.
 */
export async function roundtripOne(
  molfile: string,
  molfileId: string,
  inchiOptions?: string,
): Promise<RoundtripResult> {
  let originalMolecule: Molecule;
  let originalIdCode = '';
  let originalTautomerIdCode = '';
  try {
    originalMolecule = Molecule.fromMolfile(molfile);
    originalIdCode = originalMolecule.getIDCode();
    originalTautomerIdCode = CanonizerUtil.getIDCode(
      originalMolecule,
      CanonizerUtil.TAUTOMER,
    );
  } catch (error) {
    return {
      molfileId,
      status: 'parse-error',
      originalIdCode,
      roundtripIdCode: '',
      originalTautomerIdCode,
      roundtripTautomerIdCode: '',
      inchi: '',
      message: `OCL parse failed on original: ${describe(error)}`,
    };
  }

  const inchiResult = await inchiFromMolfile(molfile, {
    options: inchiOptions ?? '',
  });
  if (!inchiResult.inchi) {
    return {
      molfileId,
      status: 'inchi-error',
      originalIdCode,
      roundtripIdCode: '',
      originalTautomerIdCode,
      roundtripTautomerIdCode: '',
      inchi: '',
      message: inchiResult.message || inchiResult.log || 'no InChI produced',
    };
  }

  const molfileResult = await molfileFromInchi(inchiResult.inchi);
  if (!molfileResult.molfile) {
    return {
      molfileId,
      status: 'molfile-error',
      originalIdCode,
      roundtripIdCode: '',
      originalTautomerIdCode,
      roundtripTautomerIdCode: '',
      inchi: inchiResult.inchi,
      message:
        molfileResult.message || molfileResult.log || 'no Molfile produced',
    };
  }

  let roundtripIdCode = '';
  let roundtripTautomerIdCode = '';
  try {
    const roundtripMolecule = Molecule.fromMolfile(molfileResult.molfile);
    roundtripIdCode = roundtripMolecule.getIDCode();
    roundtripTautomerIdCode = CanonizerUtil.getIDCode(
      roundtripMolecule,
      CanonizerUtil.TAUTOMER,
    );
  } catch (error) {
    return {
      molfileId,
      status: 'parse-error',
      originalIdCode,
      roundtripIdCode: '',
      originalTautomerIdCode,
      roundtripTautomerIdCode: '',
      inchi: inchiResult.inchi,
      message: `OCL parse failed on reconstructed Molfile: ${describe(error)}`,
    };
  }

  const match = originalTautomerIdCode === roundtripTautomerIdCode;
  return {
    molfileId,
    status: match ? 'ok' : 'mismatch',
    originalIdCode,
    roundtripIdCode,
    originalTautomerIdCode,
    roundtripTautomerIdCode,
    inchi: inchiResult.inchi,
    message: match ? '' : 'tautomer-aware idCode changed after roundtrip',
  };
}

export interface RoundtripProgress {
  done: number;
  total: number;
  ok: number;
  mismatch: number;
  inchiError: number;
  molfileError: number;
  parseError: number;
}

/**
 * Run roundtrips on every record of an SDF blob, calling `onProgress`
 * periodically so the UI can show streaming updates. The work is
 * chunked and yielded to the event loop so the browser stays
 * responsive on large fixtures.
 * @param sdfText - Full SDF source.
 * @param options - Run configuration.
 * @param options.inchiOptions - Raw InChI option string applied to every call.
 * @param options.signal - Aborts the run early when triggered.
 * @param options.onProgress - Called every `chunkSize` records.
 * @param options.chunkSize - How many records to process per event-loop tick.
 * @returns The full results array (in SDF order).
 */
export async function roundtripAll(
  sdfText: string,
  options: {
    inchiOptions?: string;
    signal?: AbortSignal;
    onProgress?: (progress: RoundtripProgress) => void;
    chunkSize?: number;
  } = {},
): Promise<RoundtripResult[]> {
  const chunkSize = options.chunkSize ?? 25;
  const records: string[] = [];
  for (const record of iterateSdfRecords(sdfText)) {
    records.push(record);
  }

  const results: RoundtripResult[] = [];
  const stats: RoundtripProgress = {
    done: 0,
    total: records.length,
    ok: 0,
    mismatch: 0,
    inchiError: 0,
    molfileError: 0,
    parseError: 0,
  };

  for (let i = 0; i < records.length; i++) {
    if (options.signal?.aborted) throw new Error('aborted');
    const record = records[i];
    if (record === undefined) continue;
    // eslint-disable-next-line no-await-in-loop -- WASM calls must be sequential
    const result = await roundtripOne(
      extractMolfile(record),
      getMolfileId(record) || `record-${i + 1}`,
      options.inchiOptions,
    );
    results.push(result);
    bumpStats(stats, result.status);
    if ((i + 1) % chunkSize === 0 || i === records.length - 1) {
      options.onProgress?.(stats);
      // Yield to the event loop so the browser stays responsive.
      // eslint-disable-next-line no-await-in-loop -- intentional micro-yield
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      });
    }
  }
  return results;
}

function bumpStats(stats: RoundtripProgress, status: RoundtripStatus) {
  stats.done += 1;
  switch (status) {
    case 'ok':
      stats.ok += 1;
      break;
    case 'mismatch':
      stats.mismatch += 1;
      break;
    case 'inchi-error':
      stats.inchiError += 1;
      break;
    case 'molfile-error':
      stats.molfileError += 1;
      break;
    case 'parse-error':
      stats.parseError += 1;
      break;
    default:
      break;
  }
}

function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
