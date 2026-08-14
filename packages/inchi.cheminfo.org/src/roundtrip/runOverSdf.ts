import type { IteratorMolecule } from 'sdf-parser';

import { getMolfileId } from './sdfParsing.ts';

/** Progress counters every run reports, whatever it converts to. */
export interface RunProgress {
  done: number;
  total: number;
}

/** Options shared by every SDF-wide run. */
export interface RunOverSdfOptions<TProgress extends RunProgress, TResult> {
  /** Counters the run starts from, `done`/`total` included. */
  initialStats: TProgress;
  /** Convert one record. Must never throw — failures belong in the result. */
  convertOne: (molfile: string, molfileId: string) => Promise<TResult>;
  /** Fold one result into the running counters, `done` excluded. */
  bump: (stats: TProgress, result: TResult) => void;
  /**
   * Approximate record count used to drive the progress bar before the
   * stream finishes.
   * @default 0
   */
  approxTotal?: number;
  /** Aborts the run early when triggered. */
  signal?: AbortSignal;
  /** Called every `chunkSize` records. */
  onProgress?: (progress: TProgress) => void;
  /**
   * How many records to process per event-loop tick.
   * @default 25
   */
  chunkSize?: number;
}

/**
 * Run a per-record conversion over every molecule of a streamed SDF,
 * calling `onProgress` periodically so the UI can show updates. The work
 * is chunked and yielded to the event loop so the browser stays
 * responsive on large fixtures.
 *
 * Pass an `AsyncIterable<IteratorMolecule>` (typically from
 * `streamSdfMolecules`) so the SDF is parsed lazily and the full
 * uncompressed text never has to live in memory.
 * @param molecules - Async iterable of parsed SDF molecules.
 * @param options - What to run, and how to count it.
 * @returns The full results array (in SDF order).
 */
export async function runOverSdf<TProgress extends RunProgress, TResult>(
  molecules: AsyncIterable<IteratorMolecule>,
  options: RunOverSdfOptions<TProgress, TResult>,
): Promise<TResult[]> {
  const {
    initialStats,
    convertOne,
    bump,
    signal,
    onProgress,
    approxTotal = 0,
    chunkSize = 25,
  } = options;
  const stats = { ...initialStats, total: approxTotal };
  const results: TResult[] = [];

  let index = 0;
  for await (const molecule of molecules) {
    if (signal?.aborted) throw new Error('aborted');
    const result = await convertOne(
      molecule.molfile,
      getMolfileId(molecule) || `record-${index + 1}`,
    );
    results.push(result);
    stats.done += 1;
    bump(stats, result);
    index += 1;
    if (index % chunkSize === 0) {
      // Inflate `total` if we ended up parsing more records than the
      // dataset's `approxCount` advertised, so the bar never overshoots.
      if (stats.done > stats.total) stats.total = stats.done;
      onProgress?.({ ...stats });
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      });
    }
  }
  // Final emission with the now-exact total.
  stats.total = stats.done;
  onProgress?.({ ...stats });
  return results;
}
