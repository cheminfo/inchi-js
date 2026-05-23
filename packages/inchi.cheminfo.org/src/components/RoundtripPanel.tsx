import {
  Button,
  Callout,
  HTMLSelect,
  HTMLTable,
  Icon,
  ProgressBar,
  Tag,
} from '@blueprintjs/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { TestDataset } from '../roundtrip/datasets.ts';
import { TEST_DATASETS } from '../roundtrip/datasets.ts';
import type {
  RoundtripProgress,
  RoundtripResult,
  RoundtripStatus,
} from '../roundtrip/roundtrip.ts';
import type {
  WorkerInbound,
  WorkerOutbound,
} from '../roundtrip/roundtripWorker.ts';

type Filter = 'all' | 'failed' | 'ok';

const STATUS_LABEL: Record<RoundtripStatus, string> = {
  ok: 'OK',
  mismatch: 'mismatch',
  'inchi-error': 'InChI error',
  'molfile-error': 'Molfile error',
};

const STATUS_INTENT: Record<RoundtripStatus, 'success' | 'warning' | 'danger'> =
  {
    ok: 'success',
    mismatch: 'warning',
    'inchi-error': 'danger',
    'molfile-error': 'danger',
  };

/**
 * Picks how to invoke `inchiFromMolfile` per dataset. Organometallic
 * fixtures upstream are always exercised with the `-RecMet` switch.
 * @param dataset - The dataset whose canonical CLI options we want.
 * @returns The raw option string to forward to the C wrapper.
 */
function inchiOptionsFor(dataset: TestDataset): string {
  if (dataset.id.startsWith('organometallics')) return '-RecMet';
  if (dataset.id === 'alex_clark') return '-RecMet';
  return '';
}

/**
 * "Roundtrip" tab: runs the full `Molfile → InChI → Molfile → InChI`
 * round-trip across each IUPAC SDF fixture and compares the two InChI
 * strings byte-for-byte. If they match, the round-trip is correct — no
 * OCL parse, no tautomer comparison.
 * @returns The roundtrip tab JSX.
 */
export function RoundtripPanel() {
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(
    TEST_DATASETS[0]?.id ?? '',
  );
  const [filter, setFilter] = useState<Filter>('failed');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<RoundtripProgress | null>(null);
  const [results, setResults] = useState<RoundtripResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const selectedDataset = useMemo(
    () => TEST_DATASETS.find((d) => d.id === selectedDatasetId),
    [selectedDatasetId],
  );

  const baseUrl = import.meta.env.BASE_URL || '/';

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const handleRun = useCallback(() => {
    if (!selectedDataset || running) return;
    workerRef.current?.terminate();

    const worker = new Worker(
      new URL('../roundtrip/roundtripWorker.ts', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;

    const finalize = () => {
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
      setRunning(false);
    };

    worker.addEventListener(
      'message',
      (event: MessageEvent<WorkerOutbound>) => {
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
    const payload: WorkerInbound = {
      type: 'run',
      url: new URL(url, globalThis.location.href).toString(),
      inchiOptions: inchiOptionsFor(selectedDataset),
      approxTotal: selectedDataset.approxCount,
    };
    worker.postMessage(payload);
  }, [baseUrl, running, selectedDataset]);

  const handleStop = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setRunning(false);
  }, []);

  const filtered = useMemo(
    () => filterResults(results, filter),
    [results, filter],
  );

  const stats = useMemo(() => computeStats(results), [results]);

  return (
    <div className="panel" style={{ gap: 16 }}>
      <h2 className="section-title">
        <Icon icon="comparison" /> Roundtrip tests
      </h2>
      <div className="muted">
        Pick an IUPAC test fixture and run every structure through{' '}
        <code>Molfile → InChI → Molfile → InChI</code>. The round-trip is{' '}
        <strong>OK</strong> when the two InChI strings are byte-identical.
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <label
          htmlFor="dataset-select"
          className="muted"
          style={{ fontSize: 12 }}
        >
          Dataset
        </label>
        <HTMLSelect
          id="dataset-select"
          value={selectedDatasetId}
          onChange={(event) => setSelectedDatasetId(event.currentTarget.value)}
          disabled={running}
        >
          {TEST_DATASETS.map((dataset) => (
            <option key={dataset.id} value={dataset.id}>
              {dataset.filename} (~{dataset.approxCount.toLocaleString()})
            </option>
          ))}
        </HTMLSelect>
        {running ? (
          <Button
            icon="stop"
            intent="danger"
            onClick={handleStop}
            variant="solid"
          >
            Stop
          </Button>
        ) : (
          <Button
            icon="play"
            intent="primary"
            onClick={handleRun}
            variant="solid"
          >
            Run roundtrip
          </Button>
        )}
        {selectedDataset && (
          <span className="muted" style={{ fontSize: 12 }}>
            {selectedDataset.description} —{' '}
            <code>{selectedDataset.origin}</code>
          </span>
        )}
      </div>

      {progress && <ProgressRow progress={progress} running={running} />}

      {error && <div className="error-card">{error}</div>}

      {results && (
        <>
          <StatsRow stats={stats} />
          <FilterRow filter={filter} setFilter={setFilter} stats={stats} />
          <ResultsTable rows={filtered} />
        </>
      )}
    </div>
  );
}

interface Stats {
  total: number;
  ok: number;
  failed: number;
  mismatch: number;
  inchiError: number;
  molfileError: number;
}

function computeStats(results: RoundtripResult[] | null): Stats {
  if (!results) {
    return {
      total: 0,
      ok: 0,
      failed: 0,
      mismatch: 0,
      inchiError: 0,
      molfileError: 0,
    };
  }
  let ok = 0;
  let mismatch = 0;
  let inchiError = 0;
  let molfileError = 0;
  for (const result of results) {
    switch (result.status) {
      case 'ok':
        ok += 1;
        break;
      case 'mismatch':
        mismatch += 1;
        break;
      case 'inchi-error':
        inchiError += 1;
        break;
      case 'molfile-error':
        molfileError += 1;
        break;
      default:
        break;
    }
  }
  return {
    total: results.length,
    ok,
    failed: mismatch + inchiError + molfileError,
    mismatch,
    inchiError,
    molfileError,
  };
}

function filterResults(
  results: RoundtripResult[] | null,
  filter: Filter,
): RoundtripResult[] {
  if (!results) return [];
  switch (filter) {
    case 'ok':
      return results.filter((row) => row.status === 'ok');
    case 'failed':
      return results.filter((row) => row.status !== 'ok');
    case 'all':
      return results;
    default:
      return results;
  }
}

function ProgressRow({
  progress,
  running,
}: {
  progress: RoundtripProgress;
  running: boolean;
}) {
  const fraction = progress.total === 0 ? 0 : progress.done / progress.total;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
        }}
      >
        <span className="muted">
          {progress.done.toLocaleString()} / {progress.total.toLocaleString()}{' '}
          structures processed
        </span>
        <span className="muted">
          ok {progress.ok} · mismatch {progress.mismatch} · errors{' '}
          {progress.inchiError + progress.molfileError}
        </span>
      </div>
      <ProgressBar
        animate={running}
        stripes={running}
        intent={running ? 'primary' : 'success'}
        value={fraction}
      />
    </div>
  );
}

function StatsRow({ stats }: { stats: Stats }) {
  return (
    <Callout
      icon={stats.failed === 0 ? 'tick-circle' : 'warning-sign'}
      intent={stats.failed === 0 ? 'success' : 'warning'}
      title={`${stats.ok.toLocaleString()} / ${stats.total.toLocaleString()} structures survive a Molfile → InChI → Molfile → InChI roundtrip`}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
        <Tag minimal intent="success">
          OK: {stats.ok}
        </Tag>
        <Tag minimal intent="warning">
          InChI mismatch: {stats.mismatch}
        </Tag>
        <Tag minimal intent="danger">
          InChI error: {stats.inchiError}
        </Tag>
        <Tag minimal intent="danger">
          Molfile error: {stats.molfileError}
        </Tag>
      </div>
    </Callout>
  );
}

function FilterRow({
  filter,
  setFilter,
  stats,
}: {
  filter: Filter;
  setFilter: (filter: Filter) => void;
  stats: Stats;
}) {
  const options: Array<{ id: Filter; label: string; count: number }> = [
    { id: 'failed', label: 'Failed roundtrips', count: stats.failed },
    { id: 'ok', label: 'OK roundtrips', count: stats.ok },
    { id: 'all', label: 'All', count: stats.total },
  ];
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map((option) => {
        const active = filter === option.id;
        return (
          <Tag
            key={option.id}
            interactive
            minimal={!active}
            intent={
              option.id === 'failed'
                ? 'warning'
                : option.id === 'ok'
                  ? 'success'
                  : 'primary'
            }
            onClick={() => setFilter(option.id)}
          >
            {option.label} ({option.count.toLocaleString()})
          </Tag>
        );
      })}
    </div>
  );
}

function ResultsTable({ rows }: { rows: RoundtripResult[] }) {
  if (rows.length === 0) {
    return (
      <div className="muted" style={{ fontSize: 13, fontStyle: 'italic' }}>
        No structures match the current filter.
      </div>
    );
  }
  const visible = rows.slice(0, 500);
  return (
    <div style={{ overflow: 'auto', maxHeight: 600 }}>
      <HTMLTable bordered compact striped style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>Status</th>
            <th>ID</th>
            <th>InChI (original)</th>
            <th>InChI (roundtrip)</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => (
            <tr key={row.molfileId}>
              <td>
                <Tag minimal intent={STATUS_INTENT[row.status]}>
                  {STATUS_LABEL[row.status]}
                </Tag>
              </td>
              <td className="mono" style={{ whiteSpace: 'nowrap' }}>
                {row.molfileId}
              </td>
              <td
                className="mono"
                style={{
                  maxWidth: 280,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={row.inchi}
              >
                {row.inchi || <span className="muted">—</span>}
              </td>
              <td
                className="mono"
                style={{
                  maxWidth: 280,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={row.roundtripInchi}
              >
                {row.roundtripInchi || <span className="muted">—</span>}
              </td>
              <td style={{ fontSize: 12 }}>
                {row.message ? (
                  <span style={{ color: '#8e292c' }}>{row.message}</span>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </HTMLTable>
      {rows.length > visible.length && (
        <div
          className="muted"
          style={{ fontSize: 12, marginTop: 8, fontStyle: 'italic' }}
        >
          Showing the first {visible.length.toLocaleString()} of{' '}
          {rows.length.toLocaleString()} matching rows.
        </div>
      )}
    </div>
  );
}
