import {
  Button,
  Callout,
  HTMLSelect,
  Icon,
  ProgressBar,
  Tag,
} from '@blueprintjs/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { TestDataset } from '../roundtrip/datasets.ts';
import { TEST_DATASETS } from '../roundtrip/datasets.ts';
import type {
  ForwardProgress,
  ForwardResult,
  ForwardStatus,
} from '../roundtrip/forwardTest.ts';
import type {
  ForwardWorkerInbound,
  ForwardWorkerOutbound,
} from '../roundtrip/forwardWorker.ts';

import { MoleculeDetails } from './MoleculeDetails.tsx';
import type { MoleculeRow, RowStatus } from './MoleculeTable.tsx';
import { MoleculeTable } from './MoleculeTable.tsx';

type Filter = 'all' | 'failed' | 'warning';

const FORWARD_STATUS_TO_ROW: Record<ForwardStatus, RowStatus> = {
  ok: 'ok',
  'inchi-error': 'error',
};

function inchiOptionsFor(dataset: TestDataset): string {
  if (dataset.id.startsWith('organometallics')) return '-RecMet';
  if (dataset.id === 'alex_clark') return '-RecMet';
  return '';
}

/**
 * Forward-only test panel: runs `Molfile → InChI` on every record of
 * a vendored IUPAC test SDF and lists the records (if any) for which
 * the C library returned no InChI. The expectation is that every
 * fixture passes — any failure is a real regression of the embedded
 * WASM build.
 * @returns The Molfile → InChI tests JSX.
 */
export function ForwardTestPanel() {
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(
    TEST_DATASETS[0]?.id ?? '',
  );
  const [filter, setFilter] = useState<Filter>('failed');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ForwardProgress | null>(null);
  const [results, setResults] = useState<ForwardResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const selectedDataset = useMemo(
    () => TEST_DATASETS.find((d) => d.id === selectedDatasetId),
    [selectedDatasetId],
  );

  const handleDatasetChange = useCallback((id: string) => {
    setSelectedDatasetId(id);
  }, []);

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
      new URL('../roundtrip/forwardWorker.ts', import.meta.url),
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
      (event: MessageEvent<ForwardWorkerOutbound>) => {
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
    setSelectedIndex(null);

    const url = `${baseUrl}test-data/${selectedDataset.filename}`;
    const payload: ForwardWorkerInbound = {
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

  const stats = useMemo(() => computeStats(results), [results]);
  const rows = useMemo(() => buildForwardRows(results), [results]);
  const filteredRows = useMemo(
    () => filterForwardRows(rows, filter),
    [rows, filter],
  );
  // `selectedIndex` is the molecule's stable 0-based index (`row.index - 1`),
  // and `buildForwardRows` keeps every row at `rows[i].index === i + 1`, so
  // the selected row survives filtering even when hidden from the table.
  const selectedRow =
    selectedIndex === null ? null : (rows[selectedIndex] ?? null);

  return (
    <div className="panel" style={{ gap: 16 }}>
      <h2 className="section-title">
        <Icon icon="arrow-right" /> Molfile → InChI
      </h2>
      <div className="muted">
        Run every structure of an IUPAC test fixture through{' '}
        <code>inchiFromMolfile</code> and verify that the C library returns a
        non-empty InChI. <strong>Every record is expected to pass</strong> — any
        failure is a real regression of the embedded WASM build.
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
          htmlFor="forward-dataset-select"
          className="muted"
          style={{ fontSize: 12 }}
        >
          Dataset
        </label>
        <HTMLSelect
          id="forward-dataset-select"
          value={selectedDatasetId}
          onChange={(event) => handleDatasetChange(event.currentTarget.value)}
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
            Run Molfile → InChI
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
          {filteredRows.length === 0 ? (
            <div
              className="muted"
              style={{ fontSize: 13, fontStyle: 'italic' }}
            >
              No structures match the current filter.
            </div>
          ) : (
            <div className={selectedRow ? 'sdf-split' : undefined}>
              <MoleculeTable
                rows={filteredRows}
                selectedIndex={selectedIndex}
                onSelect={(index) =>
                  setSelectedIndex((current) =>
                    current === index ? null : index,
                  )
                }
              />
              {selectedRow && (
                <MoleculeDetails
                  molecule={{ molfile: selectedRow.molfile }}
                  row={selectedRow}
                  onClose={() => setSelectedIndex(null)}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Map the forward-test results onto the shared {@link MoleculeRow} shape so
 * they can be shown in the virtualized {@link MoleculeTable}. The 1-based
 * `index` mirrors the SDF order, so `rows[i].index === i + 1`.
 * @param results - The forward-test results, or `null` before a run.
 * @returns One row per result, in SDF order.
 */
function buildForwardRows(results: ForwardResult[] | null): MoleculeRow[] {
  if (!results) return [];
  return results.map((result, index) => ({
    index: index + 1,
    id: result.molfileId,
    molfile: result.molfile,
    inchi: result.inchi,
    inchikey: result.inchikey,
    status: FORWARD_STATUS_TO_ROW[result.status],
    message: result.message,
    warning: result.warning,
  }));
}

/**
 * Keep only the rows matching the active filter. `failed` keeps every
 * non-`ok` row, `warning` keeps rows the C library flagged, `all` keeps
 * everything.
 * @param rows - Every row, in SDF order.
 * @param filter - The active filter.
 * @returns The rows to display.
 */
function filterForwardRows(rows: MoleculeRow[], filter: Filter): MoleculeRow[] {
  switch (filter) {
    case 'failed':
      return rows.filter((row) => row.status !== 'ok');
    case 'warning':
      return rows.filter((row) => row.warning);
    case 'all':
      return rows;
    default:
      return rows;
  }
}

interface Stats {
  total: number;
  ok: number;
  failed: number;
  warning: number;
}

function computeStats(results: ForwardResult[] | null): Stats {
  if (!results) {
    return { total: 0, ok: 0, failed: 0, warning: 0 };
  }
  let ok = 0;
  let failed = 0;
  let warning = 0;
  for (const result of results) {
    if (result.status === 'ok') ok += 1;
    else failed += 1;
    if (result.warning) warning += 1;
  }
  return { total: results.length, ok, failed, warning };
}

function ProgressRow({
  progress,
  running,
}: {
  progress: ForwardProgress;
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
          ok {progress.ok} · errors {progress.inchiError} · warnings{' '}
          {progress.warning}
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
      icon={stats.failed === 0 ? 'tick-circle' : 'error'}
      intent={stats.failed === 0 ? 'success' : 'danger'}
      title={
        stats.failed === 0
          ? `${stats.ok.toLocaleString()} / ${stats.total.toLocaleString()} structures produced a non-empty InChI`
          : `${stats.failed.toLocaleString()} / ${stats.total.toLocaleString()} structures failed to produce an InChI`
      }
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
        <Tag minimal intent="success">
          OK: {stats.ok}
        </Tag>
        <Tag minimal intent="danger">
          InChI error: {stats.failed}
        </Tag>
        <Tag minimal intent="warning">
          Warnings: {stats.warning}
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
  const options: Array<{
    id: Filter;
    label: string;
    count: number;
    intent: 'success' | 'warning' | 'danger' | 'primary';
  }> = [
    { id: 'failed', label: 'Failures', count: stats.failed, intent: 'danger' },
    {
      id: 'warning',
      label: 'Warnings',
      count: stats.warning,
      intent: 'warning',
    },
    { id: 'all', label: 'All', count: stats.total, intent: 'primary' },
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
            intent={option.intent}
            onClick={() => setFilter(option.id)}
          >
            {option.label} ({option.count.toLocaleString()})
          </Tag>
        );
      })}
    </div>
  );
}
