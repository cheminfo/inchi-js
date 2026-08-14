import { forwardOne } from '../roundtrip/forwardTest.ts';

export type InchiStatus = 'ok' | 'error';

/** Result of computing the InChI / InChIKey for a single molfile. */
export interface InchiComputation {
  inchi: string;
  inchikey: string;
  status: InchiStatus;
  /** Diagnostic message from the C library, when any. */
  message: string;
  /** True when the C library reported a non-fatal warning. */
  warning: boolean;
}

export interface InchiProgress {
  done: number;
  total: number;
  ok: number;
  error: number;
  warning: number;
}

/**
 * Compute the InChI and InChIKey for every molfile of a parsed SDF,
 * calling `onProgress` periodically so the UI can show updates. The
 * work is chunked and yielded to the event loop so the host stays
 * responsive on large files. Never throws for an individual molecule —
 * each failure is reported through the per-row `status` field.
 * @param molfiles - The V2000/V3000 molfile blocks, in SDF order.
 * @param options - Run configuration.
 * @param options.signal - Aborts the run early when triggered.
 * @param options.onProgress - Called after every record so callers can render a smooth progress bar.
 * @param options.chunkSize - Records processed per event-loop tick. Defaults to `50`.
 * @returns The computations, aligned by index with `molfiles`.
 */
export async function computeInchiBatch(
  molfiles: string[],
  options: {
    signal?: AbortSignal;
    onProgress?: (progress: InchiProgress) => void;
    chunkSize?: number;
  } = {},
): Promise<InchiComputation[]> {
  const chunkSize = options.chunkSize ?? 50;
  const results: InchiComputation[] = [];
  const progress: InchiProgress = {
    done: 0,
    total: molfiles.length,
    ok: 0,
    error: 0,
    warning: 0,
  };

  for (let index = 0; index < molfiles.length; index++) {
    if (options.signal?.aborted) throw new Error('aborted');
    // eslint-disable-next-line no-await-in-loop -- sequential WASM calls, chunked to keep the UI responsive
    const result = await forwardOne(molfiles[index] ?? '', '');
    const computation: InchiComputation = {
      inchi: result.inchi,
      inchikey: result.inchikey,
      status: result.status === 'ok' ? 'ok' : 'error',
      message: result.message,
      warning: result.warning,
    };
    results.push(computation);
    bumpProgress(progress, computation);
    // Report after every record so the bar fills smoothly; the worker
    // throttles how often these updates are forwarded to the UI.
    options.onProgress?.({ ...progress });
    if ((index + 1) % chunkSize === 0) {
      // eslint-disable-next-line no-await-in-loop -- yield to the event loop between chunks
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      });
    }
  }
  // The loop above already reports the final state for every non-empty
  // input; this only covers the empty case.
  if (molfiles.length === 0) options.onProgress?.({ ...progress });
  return results;
}

function bumpProgress(progress: InchiProgress, computation: InchiComputation) {
  progress.done += 1;
  if (computation.status === 'ok') progress.ok += 1;
  else progress.error += 1;
  if (computation.warning) progress.warning += 1;
}
