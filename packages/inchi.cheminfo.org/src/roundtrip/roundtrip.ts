import { inchiFromMolfile, molfileFromInchi } from 'inchi-js';
import type { IteratorMolecule } from 'sdf-parser';

import { getMolfileId } from './sdfParsing.ts';

/**
 * Outcome of a single Molfile → InChI → Molfile → InChI round-trip:
 *
 * - `ok`: the second InChI is byte-identical to the first one. InChI is
 *   already the canonical form, so string equality is the definitive
 *   criterion — no OCL parse, no tautomer comparison.
 * - `mismatch`: the round-trip ran without error but the second InChI
 *   differs from the first one.
 * - `inchi-error`: `inchiFromMolfile` on the original returned an empty
 *   InChI.
 * - `molfile-error`: `molfileFromInchi` returned an empty Molfile so we
 *   could not even try a second pass.
 */
export type RoundtripStatus =
  | 'ok'
  | 'mismatch'
  | 'inchi-error'
  | 'molfile-error';

export interface RoundtripResult {
  molfileId: string;
  status: RoundtripStatus;
  /** InChI computed from the original Molfile (first pass). */
  inchi: string;
  /** InChI computed from the reconstructed Molfile (second pass). */
  roundtripInchi: string;
  /** Diagnostic message from the C library, if any. */
  message: string;
}

/**
 * Perform a single round-trip: original Molfile → InChI → reconstructed
 * Molfile → InChI, and compare the two InChI strings byte-for-byte.
 *
 * The original molfile is passed straight to the InChI engine — never
 * pre-processed by OpenChemLib — so the result is exactly what the
 * upstream IUPAC `inchi.exe` would produce on the same input. Anything
 * else would conflate "InChI behaviour" with "OCL behaviour".
 * @param molfile - The original V2000/V3000 Molfile text.
 * @param molfileId - The structure's identifier (preserved on the
 *   returned record so callers can correlate with the SDF).
 * @param inchiOptions - Optional raw InChI option string (e.g. `-RecMet`).
 *   Applied to **both** passes so the comparison is apples-to-apples.
 * @returns The roundtrip result, never throws.
 */
export async function roundtripOne(
  molfile: string,
  molfileId: string,
  inchiOptions = '',
): Promise<RoundtripResult> {
  const firstInchi = await inchiFromMolfile(molfile, { options: inchiOptions });
  if (!firstInchi.inchi) {
    return {
      molfileId,
      status: 'inchi-error',
      inchi: '',
      roundtripInchi: '',
      message: firstInchi.message || firstInchi.log || 'no InChI produced',
    };
  }

  const reconstructed = await molfileFromInchi(firstInchi.inchi);
  if (!reconstructed.molfile) {
    return {
      molfileId,
      status: 'molfile-error',
      inchi: firstInchi.inchi,
      roundtripInchi: '',
      message:
        reconstructed.message || reconstructed.log || 'no Molfile produced',
    };
  }

  const secondInchi = await inchiFromMolfile(reconstructed.molfile, {
    options: inchiOptions,
  });
  const match =
    Boolean(secondInchi.inchi) && secondInchi.inchi === firstInchi.inchi;
  return {
    molfileId,
    status: match ? 'ok' : 'mismatch',
    inchi: firstInchi.inchi,
    roundtripInchi: secondInchi.inchi,
    message: match
      ? ''
      : secondInchi.inchi
        ? 'second InChI differs from the first'
        : secondInchi.message ||
          secondInchi.log ||
          'reconstructed Molfile did not produce an InChI',
  };
}

export interface RoundtripProgress {
  done: number;
  total: number;
  ok: number;
  mismatch: number;
  inchiError: number;
  molfileError: number;
}

/**
 * Run roundtrips on every molecule of a streamed SDF, calling
 * `onProgress` periodically so the UI can show updates. The work is
 * chunked and yielded to the event loop so the browser stays
 * responsive on large fixtures.
 *
 * Pass an `AsyncIterable<IteratorMolecule>` (typically from
 * {@link streamSdfMolecules}) so the SDF is parsed lazily and the full
 * uncompressed text never has to live in memory.
 * @param molecules - Async iterable of parsed SDF molecules.
 * @param options - Run configuration.
 * @param options.approxTotal - Approximate record count used to drive
 *   the progress bar before the stream finishes. Defaults to `0` which
 *   leaves the bar at "indeterminate" until completion.
 * @param options.inchiOptions - Raw InChI option string applied to every call.
 * @param options.signal - Aborts the run early when triggered.
 * @param options.onProgress - Called every `chunkSize` records.
 * @param options.chunkSize - How many records to process per event-loop tick.
 * @returns The full results array (in SDF order).
 */
export async function roundtripAll(
  molecules: AsyncIterable<IteratorMolecule>,
  options: {
    approxTotal?: number;
    inchiOptions?: string;
    signal?: AbortSignal;
    onProgress?: (progress: RoundtripProgress) => void;
    chunkSize?: number;
  } = {},
): Promise<RoundtripResult[]> {
  const chunkSize = options.chunkSize ?? 25;
  const results: RoundtripResult[] = [];
  const stats: RoundtripProgress = {
    done: 0,
    total: options.approxTotal ?? 0,
    ok: 0,
    mismatch: 0,
    inchiError: 0,
    molfileError: 0,
  };

  let index = 0;
  for await (const molecule of molecules) {
    if (options.signal?.aborted) throw new Error('aborted');
    const result = await roundtripOne(
      molecule.molfile,
      getMolfileId(molecule) || `record-${index + 1}`,
      options.inchiOptions,
    );
    results.push(result);
    bumpStats(stats, result.status);
    index += 1;
    if (index % chunkSize === 0) {
      // Inflate `total` if we ended up parsing more records than the
      // dataset's `approxCount` advertised, so the bar never overshoots.
      if (stats.done > stats.total) stats.total = stats.done;
      options.onProgress?.({ ...stats });
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      });
    }
  }
  // Final emission with the now-exact total.
  stats.total = stats.done;
  options.onProgress?.({ ...stats });
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
    default:
      break;
  }
}

export { streamSdfMolecules } from './sdfParsing.ts';
