/// <reference lib="webworker" />

import type { ForwardProgress, ForwardResult } from './forwardTest.ts';
import { forwardAll, streamSdfMolecules } from './forwardTest.ts';
import type { TestWorkerOutbound } from './testWorker.ts';
import { serveTestWorker } from './testWorker.ts';

export type { TestWorkerInbound as ForwardWorkerInbound } from './testWorker.ts';

export type ForwardWorkerOutbound = TestWorkerOutbound<
  ForwardProgress,
  ForwardResult
>;

serveTestWorker((payload, onProgress) =>
  forwardAll(streamSdfMolecules(payload.url), {
    approxTotal: payload.approxTotal,
    inchiOptions: payload.inchiOptions,
    chunkSize: 50,
    onProgress,
  }),
);
