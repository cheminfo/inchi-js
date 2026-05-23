import { inchiFromMolfile, inchikeyFromInchi } from 'inchi-js';

import {
  extractMolfile,
  getMolfileId,
  iterateSdfRecords,
} from './sdfParsing.ts';

/**
 * Outcome of a single Molfile → InChI conversion. The
 * `Molfile → InChI` test only checks that the C library returns a
 * non-empty InChI for every input, so the universe of statuses is
 * deliberately small.
 *
 * - `ok`: a non-empty InChI was produced (warnings reported by the C
 *   library are surfaced separately, they do not flip the status).
 * - `inchi-error`: `inchiFromMolfile` returned an empty InChI.
 */
export type ForwardStatus = 'ok' | 'inchi-error';

export interface ForwardResult {
  molfileId: string;
  status: ForwardStatus;
  inchi: string;
  inchikey: string;
  /** Diagnostic message from the C library, when any. */
  message: string;
  /** True when the C library reported a non-fatal warning. */
  warning: boolean;
}

/**
 * Convert one Molfile to its InChI string. Never throws — every
 * failure is reported through the `status` field.
 * @param molfile - The V2000/V3000 Molfile text.
 * @param molfileId - The structure's identifier (preserved on the
 *   returned record so callers can correlate with the SDF).
 * @param inchiOptions - Optional raw InChI option string.
 * @returns The forward-only result.
 */
export async function forwardOne(
  molfile: string,
  molfileId: string,
  inchiOptions?: string,
): Promise<ForwardResult> {
  const inchiResult = await inchiFromMolfile(molfile, {
    options: inchiOptions ?? '',
  });
  if (!inchiResult.inchi) {
    return {
      molfileId,
      status: 'inchi-error',
      inchi: '',
      inchikey: '',
      message: inchiResult.message || inchiResult.log || 'no InChI produced',
      warning: false,
    };
  }
  const keyResult = await inchikeyFromInchi(inchiResult.inchi);
  return {
    molfileId,
    status: 'ok',
    inchi: inchiResult.inchi,
    inchikey: keyResult.inchikey,
    message: inchiResult.message,
    warning: inchiResult.returnCode === 1,
  };
}

export interface ForwardProgress {
  done: number;
  total: number;
  ok: number;
  inchiError: number;
  warning: number;
}

/**
 * Run a `Molfile → InChI` conversion on every record of an SDF blob,
 * calling `onProgress` periodically so the UI can show streaming
 * updates. The work is chunked and yielded to the event loop so the
 * browser stays responsive on large fixtures.
 * @param sdfText - Full SDF source.
 * @param options - Run configuration.
 * @param options.inchiOptions - Raw InChI option string applied to every call.
 * @param options.signal - Aborts the run early when triggered.
 * @param options.onProgress - Called every `chunkSize` records.
 * @param options.chunkSize - How many records to process per event-loop tick.
 * @returns The full results array (in SDF order).
 */
export async function forwardAll(
  sdfText: string,
  options: {
    inchiOptions?: string;
    signal?: AbortSignal;
    onProgress?: (progress: ForwardProgress) => void;
    chunkSize?: number;
  } = {},
): Promise<ForwardResult[]> {
  const chunkSize = options.chunkSize ?? 50;
  const records: string[] = [];
  for (const record of iterateSdfRecords(sdfText)) {
    records.push(record);
  }

  const results: ForwardResult[] = [];
  const stats: ForwardProgress = {
    done: 0,
    total: records.length,
    ok: 0,
    inchiError: 0,
    warning: 0,
  };

  for (let i = 0; i < records.length; i++) {
    if (options.signal?.aborted) throw new Error('aborted');
    const record = records[i];
    if (record === undefined) continue;
    // eslint-disable-next-line no-await-in-loop -- WASM calls must be sequential
    const result = await forwardOne(
      extractMolfile(record),
      getMolfileId(record) || `record-${i + 1}`,
      options.inchiOptions,
    );
    results.push(result);
    bumpStats(stats, result);
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

function bumpStats(stats: ForwardProgress, result: ForwardResult) {
  stats.done += 1;
  if (result.status === 'ok') stats.ok += 1;
  else stats.inchiError += 1;
  if (result.warning) stats.warning += 1;
}
