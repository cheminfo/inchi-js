/// <reference lib="webworker" />

import type { RoundtripProgress, RoundtripResult } from './roundtrip.ts';
import { roundtripAll, streamSdfMolecules } from './roundtrip.ts';

/**
 * Message types exchanged between the main thread and the roundtrip
 * worker. Defined as a discriminated union so both sides can refine
 * with `type` checks.
 */
export interface WorkerInbound {
  type: 'run';
  url: string;
  inchiOptions: string;
  /** Estimated record count, used to drive the progress bar. */
  approxTotal: number;
}

export type WorkerOutbound =
  | { type: 'progress'; stats: RoundtripProgress }
  | { type: 'done'; results: RoundtripResult[] }
  | { type: 'error'; message: string };

// eslint-disable-next-line no-restricted-globals, no-undef -- `self` is the worker global; DedicatedWorkerGlobalScope is the standard type
const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.addEventListener('message', (event: MessageEvent<WorkerInbound>) => {
  const data = event.data;
  if (data.type === 'run') {
    void runJob(data);
  }
});

async function runJob(payload: WorkerInbound): Promise<void> {
  try {
    const results = await roundtripAll(streamSdfMolecules(payload.url), {
      approxTotal: payload.approxTotal,
      inchiOptions: payload.inchiOptions,
      chunkSize: 25,
      onProgress: (stats) => {
        post({ type: 'progress', stats });
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

function post(message: WorkerOutbound): void {
  scope.postMessage(message);
}
