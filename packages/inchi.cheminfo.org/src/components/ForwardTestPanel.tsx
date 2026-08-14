import { Callout, Icon, Tag } from '@blueprintjs/core';
import { useCallback, useMemo, useState } from 'react';

import type {
  ForwardProgress,
  ForwardResult,
  ForwardStatus,
} from '../roundtrip/forwardTest.ts';

import { DatasetPicker } from './testRun/DatasetPicker.tsx';
import type { FilterOption } from './testRun/FilterTags.tsx';
import { FilterTags } from './testRun/FilterTags.tsx';
import { ProgressRow } from './testRun/ProgressRow.tsx';
import { ResultsTable } from './testRun/ResultsTable.tsx';
import { IdCell, InchiCell, MessageCell } from './testRun/cells.tsx';
import { useSdfTestRun } from './testRun/useSdfTestRun.ts';

type Filter = 'all' | 'failed' | 'warning';

const STATUS_LABEL: Record<ForwardStatus, string> = {
  ok: 'OK',
  'inchi-error': 'InChI error',
};

const STATUS_INTENT: Record<ForwardStatus, 'success' | 'danger'> = {
  ok: 'success',
  'inchi-error': 'danger',
};

const HEADERS = ['Status', 'ID', 'InChI', 'InChIKey', 'Message'];

/**
 * Forward-only test panel: runs `Molfile → InChI` on every record of
 * a vendored IUPAC test SDF and lists the records (if any) for which
 * the C library returned no InChI. The expectation is that every
 * fixture passes — any failure is a real regression of the embedded
 * WASM build.
 * @returns The Molfile → InChI tests JSX.
 */
export function ForwardTestPanel() {
  const [filter, setFilter] = useState<Filter>('failed');
  const createWorker = useCallback(
    () =>
      new Worker(new URL('../roundtrip/forwardWorker.ts', import.meta.url), {
        type: 'module',
      }),
    [],
  );
  const run = useSdfTestRun<ForwardProgress, ForwardResult>(createWorker);
  const {
    progress,
    results,
    error,
    running,
    selectedDatasetId,
    setSelectedDatasetId,
    selectedDataset,
  } = run;

  const stats = useMemo(() => computeStats(results), [results]);
  const filtered = useMemo(
    () => filterResults(results, filter),
    [results, filter],
  );

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

      <DatasetPicker
        selectId="forward-dataset-select"
        runLabel="Run Molfile → InChI"
        selectedDatasetId={selectedDatasetId}
        onSelect={setSelectedDatasetId}
        selectedDataset={selectedDataset}
        running={running}
        onRun={run.run}
        onStop={run.stop}
      />

      {progress && (
        <ProgressRow
          progress={progress}
          running={running}
          summary={
            <>
              ok {progress.ok} · errors {progress.inchiError} · warnings{' '}
              {progress.warning}
            </>
          }
        />
      )}

      {error && <div className="error-card">{error}</div>}

      {results && (
        <>
          <StatsRow stats={stats} />
          <FilterTags
            filter={filter}
            onChange={setFilter}
            options={filterOptions(stats)}
          />
          <ResultsTable
            rows={filtered}
            headers={HEADERS}
            rowKey={(row) => row.molfileId}
            renderRow={(row) => (
              <>
                <td>
                  <Tag minimal intent={STATUS_INTENT[row.status]}>
                    {STATUS_LABEL[row.status]}
                  </Tag>
                  {row.warning && (
                    <Tag
                      minimal
                      intent="warning"
                      style={{ marginLeft: 4 }}
                      title="The C library returned a non-fatal warning"
                    >
                      warn
                    </Tag>
                  )}
                </td>
                <IdCell value={row.molfileId} />
                <InchiCell value={row.inchi} />
                <IdCell value={row.inchikey} />
                <MessageCell value={row.message} />
              </>
            )}
          />
        </>
      )}
    </div>
  );
}

interface Stats {
  total: number;
  ok: number;
  failed: number;
  warning: number;
}

function computeStats(results: ForwardResult[] | null): Stats {
  const stats: Stats = {
    total: results?.length ?? 0,
    ok: 0,
    failed: 0,
    warning: 0,
  };
  if (!results) return stats;
  for (const result of results) {
    if (result.status === 'ok') stats.ok += 1;
    else stats.failed += 1;
    if (result.warning) stats.warning += 1;
  }
  return stats;
}

function filterResults(
  results: ForwardResult[] | null,
  filter: Filter,
): ForwardResult[] {
  if (!results) return [];
  switch (filter) {
    case 'failed':
      return results.filter((row) => row.status !== 'ok');
    case 'warning':
      return results.filter((row) => row.warning);
    case 'all':
      return results;
    default:
      return results;
  }
}

function filterOptions(stats: Stats): Array<FilterOption<Filter>> {
  return [
    { id: 'failed', label: 'Failures', count: stats.failed, intent: 'danger' },
    {
      id: 'warning',
      label: 'Warnings',
      count: stats.warning,
      intent: 'warning',
    },
    { id: 'all', label: 'All', count: stats.total, intent: 'primary' },
  ];
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
