/// <reference lib="webworker" />

import type { RoundtripProgress, RoundtripResult } from './roundtrip.ts';
import { roundtripAll, streamSdfMolecules } from './roundtrip.ts';
import type { TestWorkerOutbound } from './testWorker.ts';
import { serveTestWorker } from './testWorker.ts';

export type { TestWorkerInbound as WorkerInbound } from './testWorker.ts';

export type WorkerOutbound = TestWorkerOutbound<
  RoundtripProgress,
  RoundtripResult
>;

serveTestWorker((payload, onProgress) =>
  roundtripAll(streamSdfMolecules(payload.url), {
    approxTotal: payload.approxTotal,
    inchiOptions: payload.inchiOptions,
    chunkSize: 25,
    onProgress,
  }),
);
