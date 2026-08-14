import { inchiFromMolfile, inchikeyFromInchi } from 'inchi-js';
import type { IteratorMolecule } from 'sdf-parser';

import type { RunProgress } from './runOverSdf.ts';
import { runOverSdf } from './runOverSdf.ts';

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
  /** The raw V2000/V3000 molfile, kept so the UI can draw the structure. */
  molfile: string;
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
 *
 * The molfile is passed straight to the InChI engine — never
 * pre-processed by OpenChemLib — so the result is exactly what the
 * upstream IUPAC `inchi.exe` would produce on the same input.
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
      molfile,
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
    molfile,
    status: 'ok',
    inchi: inchiResult.inchi,
    inchikey: keyResult.inchikey,
    message: inchiResult.message,
    warning: inchiResult.returnCode === 1,
  };
}

export interface ForwardProgress extends RunProgress {
  ok: number;
  inchiError: number;
  warning: number;
}

/**
 * Run a `Molfile → InChI` conversion on every molecule of a streamed
 * SDF, calling `onProgress` periodically so the UI can show updates.
 * The work is chunked and yielded to the event loop so the browser
 * stays responsive on large fixtures.
 *
 * Pass an `AsyncIterable<IteratorMolecule>` (typically from
 * {@link streamSdfMolecules}) so the SDF is parsed lazily.
 * @param molecules - Async iterable of parsed SDF molecules.
 * @param options - Run configuration.
 * @param options.approxTotal - Approximate record count used to drive
 *   the progress bar before the stream finishes. Defaults to `0`.
 * @param options.inchiOptions - Raw InChI option string applied to every call.
 * @param options.signal - Aborts the run early when triggered.
 * @param options.onProgress - Called every `chunkSize` records.
 * @param options.chunkSize - How many records to process per event-loop tick.
 * @returns The full results array (in SDF order).
 */
export async function forwardAll(
  molecules: AsyncIterable<IteratorMolecule>,
  options: {
    approxTotal?: number;
    inchiOptions?: string;
    signal?: AbortSignal;
    onProgress?: (progress: ForwardProgress) => void;
    chunkSize?: number;
  } = {},
): Promise<ForwardResult[]> {
  return runOverSdf<ForwardProgress, ForwardResult>(molecules, {
    approxTotal: options.approxTotal,
    signal: options.signal,
    onProgress: options.onProgress,
    chunkSize: options.chunkSize ?? 50,
    initialStats: { done: 0, total: 0, ok: 0, inchiError: 0, warning: 0 },
    convertOne: (molfile, molfileId) =>
      forwardOne(molfile, molfileId, options.inchiOptions),
    bump: bumpStats,
  });
}

function bumpStats(stats: ForwardProgress, result: ForwardResult) {
  if (result.status === 'ok') stats.ok += 1;
  else stats.inchiError += 1;
  if (result.warning) stats.warning += 1;
}

export { streamSdfMolecules } from './sdfParsing.ts';
