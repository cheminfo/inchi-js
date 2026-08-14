/// <reference lib="webworker" />

import type { InchiComputation, InchiProgress } from './sdfInchi.ts';
import { computeInchiBatch } from './sdfInchi.ts';

/**
 * Messages exchanged between the main thread and the SDF → InChI
 * worker. A discriminated union so both sides can refine on `type`.
 */
export interface SdfInchiWorkerInbound {
  type: 'run';
  molfiles: string[];
}

export type SdfInchiWorkerOutbound =
  | { type: 'progress'; progress: InchiProgress }
  | { type: 'done'; results: InchiComputation[] }
  | { type: 'error'; message: string };

// eslint-disable-next-line no-restricted-globals, no-undef -- `self` is the worker global; DedicatedWorkerGlobalScope is the standard type
const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.addEventListener(
  'message',
  (event: MessageEvent<SdfInchiWorkerInbound>) => {
    if (event.data.type === 'run') {
      void runJob(event.data);
    }
  },
);

// Forward at most one progress update per this many milliseconds so a fast
// run does not flood the main thread with re-renders; the bar still updates
// ~16×/second, and the final record (done === total) is always sent.
const PROGRESS_THROTTLE_MS = 60;

async function runJob(payload: SdfInchiWorkerInbound): Promise<void> {
  try {
    let lastPost = 0;
    const results = await computeInchiBatch(payload.molfiles, {
      chunkSize: 50,
      onProgress: (progress) => {
        const now = performance.now();
        if (
          progress.done === progress.total ||
          now - lastPost >= PROGRESS_THROTTLE_MS
        ) {
          lastPost = now;
          post({ type: 'progress', progress });
        }
      },
    });
    post({ type: 'done', results });
  } catch (error) {
    post({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function post(message: SdfInchiWorkerOutbound): void {
  scope.postMessage(message);
}
