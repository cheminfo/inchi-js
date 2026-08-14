import { useSignals } from '@preact/signals-react/runtime';
import { useCallback, useEffect, useRef, useState } from 'react';

import { messageOf } from '../../messageOf.ts';
import type { TestDataset } from '../../roundtrip/datasets.ts';
import { TEST_DATASETS, inchiOptionsFor } from '../../roundtrip/datasets.ts';
import type { RunProgress } from '../../roundtrip/runOverSdf.ts';
import type {
  TestWorkerInbound,
  TestWorkerOutbound,
} from '../../roundtrip/testWorker.ts';
import { selectDataset, state } from '../../state/index.ts';

/** What {@link useSdfTestRun} hands back to a test panel. */
export interface SdfTestRun<TProgress extends RunProgress, TResult> {
  /** The dataset the picker shows, shared by every test panel. */
  selectedDatasetId: string;
  setSelectedDatasetId: (id: string) => void;
  /** The dataset itself, undefined while none matches. */
  selectedDataset: TestDataset | undefined;
  /** True between `run()` and the worker reporting done or failing. */
  running: boolean;
  /** Latest counters, null before the first chunk lands. */
  progress: TProgress | null;
  /** The finished results, null until the run completes. */
  results: TResult[] | null;
  /** Worker or fetch failure, null while the run is healthy. */
  error: string | null;
  run: () => void;
  stop: () => void;
}

/**
 * Drive one of the SDF test workers from a panel: owns the dataset
 * selection, spawns the worker, tracks progress, and tears it down on
 * unmount or on stop.
 *
 * The worker is created through a factory rather than a URL because Vite
 * resolves `new Worker(new URL(...))` statically — the caller must hold
 * the literal.
 * @param createWorker - Builds a fresh worker for one run.
 * @returns The selection, the run state, and the run/stop actions.
 */
export function useSdfTestRun<TProgress extends RunProgress, TResult>(
  createWorker: () => Worker,
): SdfTestRun<TProgress, TResult> {
  useSignals();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<TProgress | null>(null);
  const [results, setResults] = useState<TResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const selectedDatasetId = state.preferences.tests.datasetId.value;
  const selectedDataset = TEST_DATASETS.find(
    (dataset) => dataset.id === selectedDatasetId,
  );

  const baseUrl = import.meta.env.BASE_URL || '/';

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setRunning(false);
  }, []);

  const run = useCallback(() => {
    if (!selectedDataset || running) return;
    workerRef.current?.terminate();

    const worker = createWorker();
    workerRef.current = worker;

    const finalize = () => {
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
      setRunning(false);
    };

    worker.addEventListener(
      'message',
      (event: MessageEvent<TestWorkerOutbound<TProgress, TResult>>) => {
        const message = event.data;
        switch (message.type) {
          case 'progress':
            setProgress(message.stats);
            break;
          case 'done':
            setResults(message.results);
            finalize();
            break;
          case 'error':
            setError(message.message);
            finalize();
            break;
          default:
            break;
        }
      },
    );

    worker.addEventListener('error', (event) => {
      setError(event.message || 'Worker error');
      finalize();
    });

    setRunning(true);
    setError(null);
    setResults(null);
    setProgress(null);

    const url = `${baseUrl}test-data/${selectedDataset.filename}`;
    const payload: TestWorkerInbound = {
      type: 'run',
      url: new URL(url, globalThis.location.href).toString(),
      inchiOptions: inchiOptionsFor(selectedDataset),
      approxTotal: selectedDataset.approxCount,
    };
    try {
      worker.postMessage(payload);
    } catch (postError) {
      setError(messageOf(postError));
      finalize();
    }
  }, [baseUrl, createWorker, running, selectedDataset]);

  return {
    selectedDatasetId,
    setSelectedDatasetId: selectDataset,
    selectedDataset,
    running,
    progress,
    results,
    error,
    run,
    stop,
  };
}
