/// <reference lib="webworker" />

import type { ForwardProgress, ForwardResult } from './forwardTest.ts';
import { forwardAll } from './forwardTest.ts';
import { fetchGzippedSdf } from './sdfParsing.ts';

/**
 * Message types exchanged between the main thread and the
 * Molfile → InChI worker. Defined as a discriminated union so both
 * sides can refine with `type` checks.
 */
export interface ForwardWorkerInbound {
  type: 'run';
  url: string;
  inchiOptions: string;
}

export type ForwardWorkerOutbound =
  | { type: 'progress'; stats: ForwardProgress }
  | { type: 'done'; results: ForwardResult[] }
  | { type: 'error'; message: string };

// eslint-disable-next-line no-restricted-globals, no-undef -- `self` is the worker global; DedicatedWorkerGlobalScope is the standard type
const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.addEventListener(
  'message',
  (event: MessageEvent<ForwardWorkerInbound>) => {
    const data = event.data;
    if (data.type === 'run') {
      void runJob(data.url, data.inchiOptions);
    }
  },
);

async function runJob(url: string, inchiOptions: string): Promise<void> {
  try {
    const sdfText = await fetchGzippedSdf(url);
    const results = await forwardAll(sdfText, {
      inchiOptions,
      chunkSize: 50,
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

function post(message: ForwardWorkerOutbound): void {
  scope.postMessage(message);
}
