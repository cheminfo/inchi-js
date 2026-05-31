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

async function runJob(payload: SdfInchiWorkerInbound): Promise<void> {
  try {
    const results = await computeInchiBatch(payload.molfiles, {
      chunkSize: 50,
      onProgress: (progress) => {
        post({ type: 'progress', progress });
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
