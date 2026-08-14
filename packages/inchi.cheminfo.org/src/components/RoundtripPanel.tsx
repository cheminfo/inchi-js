import { Callout, Icon, Tag } from '@blueprintjs/core';
import { useCallback, useMemo, useState } from 'react';

import type {
  RoundtripProgress,
  RoundtripResult,
  RoundtripStatus,
} from '../roundtrip/roundtrip.ts';

import { DatasetPicker } from './testRun/DatasetPicker.tsx';
import type { FilterOption } from './testRun/FilterTags.tsx';
import { FilterTags } from './testRun/FilterTags.tsx';
import { ProgressRow } from './testRun/ProgressRow.tsx';
import { ResultsTable } from './testRun/ResultsTable.tsx';
import { IdCell, InchiCell, MessageCell } from './testRun/cells.tsx';
import { useSdfTestRun } from './testRun/useSdfTestRun.ts';

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

const HEADERS = [
  'Status',
  'ID',
  'InChI (original)',
  'InChI (roundtrip)',
  'Message',
];

/**
 * "Roundtrip" tab: runs the full `Molfile → InChI → Molfile → InChI`
 * round-trip across each IUPAC SDF fixture and compares the two InChI
 * strings byte-for-byte. If they match, the round-trip is correct — no
 * OCL parse, no tautomer comparison.
 * @returns The roundtrip tab JSX.
 */
export function RoundtripPanel() {
  const [filter, setFilter] = useState<Filter>('failed');
  const createWorker = useCallback(
    () =>
      new Worker(new URL('../roundtrip/roundtripWorker.ts', import.meta.url), {
        type: 'module',
      }),
    [],
  );
  const run = useSdfTestRun<RoundtripProgress, RoundtripResult>(createWorker);
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
        <Icon icon="comparison" /> Roundtrip tests
      </h2>
      <div className="muted">
        Pick an IUPAC test fixture and run every structure through{' '}
        <code>Molfile → InChI → Molfile → InChI</code>. The round-trip is{' '}
        <strong>OK</strong> when the two InChI strings are byte-identical.
      </div>

      <DatasetPicker
        selectId="dataset-select"
        runLabel="Run roundtrip"
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
              ok {progress.ok} · mismatch {progress.mismatch} · errors{' '}
              {progress.inchiError + progress.molfileError}
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
                </td>
                <IdCell value={row.molfileId} />
                <InchiCell value={row.inchi} />
                <InchiCell value={row.roundtripInchi} />
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
  mismatch: number;
  inchiError: number;
  molfileError: number;
}

function computeStats(results: RoundtripResult[] | null): Stats {
  const stats: Stats = {
    total: results?.length ?? 0,
    ok: 0,
    failed: 0,
    mismatch: 0,
    inchiError: 0,
    molfileError: 0,
  };
  if (!results) return stats;
  for (const result of results) {
    switch (result.status) {
      case 'ok':
        stats.ok += 1;
        break;
      case 'mismatch':
        stats.mismatch += 1;
        break;
      case 'inchi-error':
        stats.inchiError += 1;
        break;
      case 'molfile-error':
        stats.molfileError += 1;
        break;
      default:
        break;
    }
  }
  stats.failed = stats.mismatch + stats.inchiError + stats.molfileError;
  return stats;
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

function filterOptions(stats: Stats): Array<FilterOption<Filter>> {
  return [
    {
      id: 'failed',
      label: 'Failed roundtrips',
      count: stats.failed,
      intent: 'warning',
    },
    { id: 'ok', label: 'OK roundtrips', count: stats.ok, intent: 'success' },
    { id: 'all', label: 'All', count: stats.total, intent: 'primary' },
  ];
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
