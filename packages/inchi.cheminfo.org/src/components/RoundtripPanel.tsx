import {
  Button,
  Callout,
  HTMLSelect,
  HTMLTable,
  Icon,
  ProgressBar,
  Tag,
} from '@blueprintjs/core';
import { CanonizerUtil, Molecule } from 'openchemlib';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SvgRenderer } from 'react-ocl';

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

const STRUCTURE_WIDTH = 160;
const STRUCTURE_HEIGHT = 110;

/**
 * High-level diagnosis for a `mismatch` row. The roundtrip status is
 * already computed against the tautomer-aware OCL idCode, so a row only
 * lands here when the two molecules differ in something more than the
 * chosen tautomer. We then categorise by re-canonicalising both sides
 * with stricter equivalence relations — the first one that matches
 * pinpoints what the InChI pipeline lost.
 *
 * - `stereo`: connectivity, hydrogens and tautomer are preserved — only
 *   the parity (E/Z, R/S, axial chirality) of a stereo centre changed.
 * - `formula`: heavy-atom count, isotope set or hydrogen count differs.
 * - `other`: same molecular formula but still different even after
 *   stripping stereo and tautomerism — typically a charge relocation
 *   or a real connectivity change (bond add / delete / reorder).
 */
type MismatchCategory = 'stereo' | 'formula' | 'other';

const MISMATCH_CATEGORY_LABEL: Record<MismatchCategory, string> = {
  stereo: 'stereo lost',
  formula: 'formula changed',
  other: 'connectivity / charge',
};

const MISMATCH_CATEGORY_INTENT: Record<
  MismatchCategory,
  'success' | 'warning' | 'danger' | 'primary'
> = {
  stereo: 'primary',
  formula: 'danger',
  other: 'danger',
};

const MISMATCH_CATEGORY_DESCRIPTION: Record<MismatchCategory, string> = {
  stereo:
    'Only a stereo descriptor (E/Z, R/S, axial chirality) is lost — connectivity, hydrogens and tautomer are preserved.',
  formula:
    'Molecular formula differs after the roundtrip — heavy atoms, isotopes or hydrogen count changed.',
  other:
    'Same molecular formula but still different even after stripping stereo and tautomerism — usually a charge relocation or a true connectivity change.',
};

type Filter = 'all' | 'failed' | 'ok';

const STATUS_LABEL: Record<RoundtripStatus, string> = {
  ok: 'OK',
  mismatch: 'mismatch',
  'inchi-error': 'InChI error',
  'molfile-error': 'Molfile error',
  'parse-error': 'parse error',
};

const STATUS_INTENT: Record<RoundtripStatus, 'success' | 'warning' | 'danger'> =
  {
    ok: 'success',
    mismatch: 'warning',
    'inchi-error': 'danger',
    'molfile-error': 'danger',
    'parse-error': 'danger',
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
 * "Test corpus" tab: lets the user run the full Molfile → InChI →
 * Molfile round-trip across each IUPAC SDF fixture and filter the
 * results to inspect the structures that do not survive the trip.
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
    };
    worker.postMessage(payload);
  }, [baseUrl, running, selectedDataset]);

  const handleStop = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setRunning(false);
  }, []);

  const categories = useMemo(() => computeCategories(results), [results]);

  const filtered = useMemo(
    () => filterResults(results, filter),
    [results, filter],
  );

  const stats = useMemo(
    () => computeStats(results, categories),
    [results, categories],
  );

  return (
    <div className="panel" style={{ gap: 16 }}>
      <h2 className="section-title">
        <Icon icon="comparison" /> Roundtrip tests
      </h2>
      <div className="muted">
        Pick an IUPAC test fixture and run every structure through{' '}
        <code>Molfile → InChI → Molfile</code>. Each reconstructed Molfile is
        canonicalised by OpenChemLib and its <strong>tautomer-aware</strong>{' '}
        <code>idCode</code> is compared against the original — a different
        canonical tautomer counts as OK, only real structural changes (stereo
        loss, formula change, charge relocation) show up below.
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
          <ResultsTable rows={filtered} categories={categories} />
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
  parseError: number;
  categories: Record<MismatchCategory, number>;
}

type CategoryMap = Map<string, MismatchCategory>;

function computeStats(
  results: RoundtripResult[] | null,
  categories: CategoryMap,
): Stats {
  const emptyCategories: Record<MismatchCategory, number> = {
    stereo: 0,
    formula: 0,
    other: 0,
  };
  if (!results) {
    return {
      total: 0,
      ok: 0,
      failed: 0,
      mismatch: 0,
      inchiError: 0,
      molfileError: 0,
      parseError: 0,
      categories: emptyCategories,
    };
  }
  let ok = 0;
  let mismatch = 0;
  let inchiError = 0;
  let molfileError = 0;
  let parseError = 0;
  for (const result of results) {
    switch (result.status) {
      case 'ok':
        ok += 1;
        break;
      case 'mismatch': {
        mismatch += 1;
        const category = categories.get(result.molfileId);
        if (category) emptyCategories[category] += 1;
        break;
      }
      case 'inchi-error':
        inchiError += 1;
        break;
      case 'molfile-error':
        molfileError += 1;
        break;
      case 'parse-error':
        parseError += 1;
        break;
      default:
        break;
    }
  }
  return {
    total: results.length,
    ok,
    failed: mismatch + inchiError + molfileError + parseError,
    mismatch,
    inchiError,
    molfileError,
    parseError,
    categories: emptyCategories,
  };
}

function computeCategories(results: RoundtripResult[] | null): CategoryMap {
  const map: CategoryMap = new Map();
  if (!results) return map;
  for (const result of results) {
    if (result.status !== 'mismatch') continue;
    map.set(result.molfileId, categorizeMismatch(result));
  }
  return map;
}

/**
 * Classify a `mismatch` row. The OK/mismatch decision is already made by
 * comparing tautomer-aware idCodes, so any row reaching this function
 * differs in something more than a tautomer choice. We compare
 * molecular formulas first, then strip stereo to detect stereo-only
 * losses; anything else falls into `other` (charge / connectivity).
 * @param row - A `mismatch` roundtrip result.
 * @returns The diagnostic category.
 */
function categorizeMismatch(row: RoundtripResult): MismatchCategory {
  let original: Molecule;
  let roundtrip: Molecule;
  try {
    original = Molecule.fromIDCode(row.originalIdCode);
    roundtrip = Molecule.fromIDCode(row.roundtripIdCode);
  } catch {
    return 'other';
  }
  if (safeFormula(original) !== safeFormula(roundtrip)) return 'formula';

  const originalNoStereoTautomer = safeCanonize(
    original,
    CanonizerUtil.NOSTEREO_TAUTOMER,
  );
  const roundtripNoStereoTautomer = safeCanonize(
    roundtrip,
    CanonizerUtil.NOSTEREO_TAUTOMER,
  );
  if (
    originalNoStereoTautomer &&
    originalNoStereoTautomer === roundtripNoStereoTautomer
  ) {
    return 'stereo';
  }

  return 'other';
}

function safeFormula(molecule: Molecule): string {
  try {
    return molecule.getMolecularFormula().formula;
  } catch {
    return '';
  }
}

function safeCanonize(molecule: Molecule, type: number): string {
  try {
    return CanonizerUtil.getIDCode(molecule, type);
  } catch {
    return '';
  }
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
          {progress.inchiError + progress.molfileError + progress.parseError}
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
  const categoryOrder: MismatchCategory[] = ['stereo', 'formula', 'other'];
  const hasCategories = categoryOrder.some((c) => stats.categories[c] > 0);
  return (
    <Callout
      icon={stats.failed === 0 ? 'tick-circle' : 'warning-sign'}
      intent={stats.failed === 0 ? 'success' : 'warning'}
      title={`${stats.ok.toLocaleString()} / ${stats.total.toLocaleString()} structures survive a Molfile → InChI → Molfile roundtrip`}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
        <Tag minimal intent="success">
          OK: {stats.ok}
        </Tag>
        <Tag minimal intent="warning">
          idCode mismatch: {stats.mismatch}
        </Tag>
        <Tag minimal intent="danger">
          InChI error: {stats.inchiError}
        </Tag>
        <Tag minimal intent="danger">
          Molfile error: {stats.molfileError}
        </Tag>
        <Tag minimal intent="danger">
          Parse error: {stats.parseError}
        </Tag>
      </div>
      {hasCategories && (
        <>
          <div
            className="muted"
            style={{ fontSize: 12, marginTop: 8, marginBottom: 4 }}
          >
            Mismatch breakdown — what the roundtrip dropped or rewrote:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {categoryOrder.map((category) => {
              const count = stats.categories[category];
              if (count === 0) return null;
              return (
                <Tag
                  key={category}
                  minimal
                  intent={MISMATCH_CATEGORY_INTENT[category]}
                  title={MISMATCH_CATEGORY_DESCRIPTION[category]}
                >
                  {MISMATCH_CATEGORY_LABEL[category]}: {count}
                </Tag>
              );
            })}
          </div>
        </>
      )}
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

function ResultsTable({
  rows,
  categories,
}: {
  rows: RoundtripResult[];
  categories: CategoryMap;
}) {
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
            <th>InChI</th>
            <th>Original</th>
            <th>Roundtrip</th>
            <th>Diagnosis</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => {
            const category = categories.get(row.molfileId);
            return (
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
                <td>
                  <StructureCell idCode={row.originalIdCode} />
                </td>
                <td>
                  <StructureCell idCode={row.roundtripIdCode} />
                </td>
                <td style={{ fontSize: 12 }}>
                  {category ? (
                    <Tag
                      minimal
                      intent={MISMATCH_CATEGORY_INTENT[category]}
                      title={MISMATCH_CATEGORY_DESCRIPTION[category]}
                    >
                      {MISMATCH_CATEGORY_LABEL[category]}
                    </Tag>
                  ) : (
                    <span style={{ color: '#8e292c' }}>{row.message}</span>
                  )}
                </td>
              </tr>
            );
          })}
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

function StructureCell({ idCode }: { idCode: string }) {
  const molecule = useMemo(() => moleculeFromIdCode(idCode), [idCode]);
  if (!molecule) {
    return <span className="muted">—</span>;
  }
  return (
    <div
      title={idCode}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <SvgRenderer
        molecule={molecule}
        width={STRUCTURE_WIDTH}
        height={STRUCTURE_HEIGHT}
      />
      <code
        style={{
          fontSize: 10,
          maxWidth: STRUCTURE_WIDTH,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {idCode}
      </code>
    </div>
  );
}

function moleculeFromIdCode(idCode: string): Molecule | null {
  if (!idCode) return null;
  try {
    return Molecule.fromIDCode(idCode);
  } catch {
    return null;
  }
}
