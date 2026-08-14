/// <reference lib="webworker" />

import { messageOf } from '../messageOf.ts';

import type { RunProgress } from './runOverSdf.ts';

/**
 * The only message the main thread sends a test worker: run one dataset.
 */
export interface TestWorkerInbound {
  type: 'run';
  url: string;
  inchiOptions: string;
  /** Estimated record count, used to drive the progress bar. */
  approxTotal: number;
}

/**
 * What a test worker sends back, as a discriminated union so the main
 * thread can refine with `type` checks. Each worker re-exports it bound
 * to its own progress and result types.
 */
export type TestWorkerOutbound<TProgress extends RunProgress, TResult> =
  | { type: 'progress'; stats: TProgress }
  | { type: 'done'; results: TResult[] }
  | { type: 'error'; message: string };

/**
 * Wire a dedicated worker to a run function: listen for the `run`
 * message, forward progress as it arrives, and report the results or the
 * failure. Both SDF test workers are this call plus their `run`.
 *
 * The messages cross a structural `postMessage` boundary, so the precise
 * progress and result types are declared by each worker module and by the
 * panel receiving them rather than threaded through here.
 * @param run - Runs one dataset, reporting progress as it goes.
 */
export function serveTestWorker<TResult>(
  run: (
    payload: TestWorkerInbound,
    onProgress: (stats: RunProgress) => void,
  ) => Promise<TResult[]>,
): void {
  // eslint-disable-next-line no-restricted-globals, no-undef -- `self` is the worker global; DedicatedWorkerGlobalScope is the standard type
  const scope = self as unknown as DedicatedWorkerGlobalScope;

  function post(message: TestWorkerOutbound<RunProgress, TResult>): void {
    scope.postMessage(message);
  }

  scope.addEventListener(
    'message',
    (event: MessageEvent<TestWorkerInbound>) => {
      const data = event.data;
      if (data.type !== 'run') return;
      void run(data, (stats) => {
        post({ type: 'progress', stats });
      }).then(
        (results) => {
          post({ type: 'done', results });
        },
        (error: unknown) => {
          post({ type: 'error', message: messageOf(error) });
        },
      );
    },
  );
}
