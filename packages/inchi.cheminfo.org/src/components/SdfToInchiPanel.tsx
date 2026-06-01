import { Button, Colors, Icon, ProgressBar } from '@blueprintjs/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DropZoneContainer } from 'react-science/ui';
import type { Molecule } from 'sdf-parser';

import {
  INCHIKEY_FIELD,
  INCHI_FIELD,
  buildSdfWithInchi,
  downloadTextFile,
  parseSdfFile,
} from '../sdf/sdfFile.ts';
import type { InchiComputation, InchiProgress } from '../sdf/sdfInchi.ts';
import type {
  SdfInchiWorkerInbound,
  SdfInchiWorkerOutbound,
} from '../sdf/sdfInchiWorker.ts';

import { MoleculeDetails } from './MoleculeDetails.tsx';
import type { MoleculeRow } from './MoleculeTable.tsx';
import { MoleculeTable } from './MoleculeTable.tsx';
import { StatsFilterBar } from './StatsFilterBar.tsx';
import type { StatusFilter } from './sdfRows.ts';
import {
  buildRows,
  computeStats,
  downloadName,
  filterRows,
} from './sdfRows.ts';

/**
 * SDF → InChI panel. Load an SDF (or `.sdf.gz`), compute the InChI and
 * InChIKey of every structure off the main thread, list them all in a
 * virtualized table, and download a new SDF with the computed values
 * added as the `InChI` and `InChIKey` data fields.
 * @returns The panel JSX.
 */
export function SdfToInchiPanel() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [molecules, setMolecules] = useState<Molecule[]>([]);
  const [rows, setRows] = useState<MoleculeRow[]>([]);
  const [computations, setComputations] = useState<InchiComputation[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<InchiProgress | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<StatusFilter>>(
    () => new Set(),
  );
  const workerRef = useRef<Worker | null>(null);

  const toggleFilter = useCallback((filter: StatusFilter) => {
    setActiveFilters((current) => {
      const next = new Set(current);
      if (next.has(filter)) next.delete(filter);
      else next.add(filter);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => setActiveFilters(new Set()), []);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const handleFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    workerRef.current?.terminate();
    workerRef.current = null;
    setError(null);
    setParsing(true);
    setRunning(false);
    setComputations(null);
    setProgress(null);
    setSelectedIndex(null);
    setActiveFilters(new Set());
    try {
      const result = await parseSdfFile(file);
      setFileName(file.name);
      setMolecules(result.molecules);
      setRows(buildRows(result.molecules, null));
      if (result.molecules.length === 0) {
        setError('No molecules were found in this file.');
      }
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : String(error_));
      setFileName(file.name);
      setMolecules([]);
      setRows([]);
    } finally {
      setParsing(false);
    }
  }, []);

  const handleDrop = useCallback(
    (files: File[]) => {
      void handleFile(files[0]);
    },
    [handleFile],
  );

  const handleRun = useCallback(() => {
    if (molecules.length === 0 || running) return;
    workerRef.current?.terminate();
    const worker = new Worker(
      new URL('../sdf/sdfInchiWorker.ts', import.meta.url),
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
      (event: MessageEvent<SdfInchiWorkerOutbound>) => {
        const message = event.data;
        switch (message.type) {
          case 'progress':
            setProgress(message.progress);
            break;
          case 'done':
            setComputations(message.results);
            setRows(buildRows(molecules, message.results));
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
    // Show the bar immediately (indeterminate, see `initializing` below) so
    // there is feedback during the one-time WASM load before the first result.
    setProgress({
      done: 0,
      total: molecules.length,
      ok: 0,
      error: 0,
      warning: 0,
    });
    const payload: SdfInchiWorkerInbound = {
      type: 'run',
      molfiles: molecules.map((molecule) => molecule.molfile),
    };
    worker.postMessage(payload);
  }, [molecules, running]);

  const handleStop = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setRunning(false);
  }, []);

  const handleDownload = useCallback(() => {
    if (!computations) return;
    const sdf = buildSdfWithInchi(molecules, computations);
    downloadTextFile(sdf, downloadName(fileName));
  }, [molecules, computations, fileName]);

  const stats = useMemo(() => computeStats(computations), [computations]);
  const filteredRows = useMemo(
    () => filterRows(rows, activeFilters),
    [rows, activeFilters],
  );
  const fraction =
    progress && progress.total > 0 ? progress.done / progress.total : 0;
  // Before the first result arrives the WASM engine is still loading, so the
  // fraction is meaningless — show an animated indeterminate bar instead.
  const initializing = running && progress !== null && progress.done === 0;
  const selectedRow =
    selectedIndex === null ? null : (rows[selectedIndex] ?? null);
  const selectedMolecule =
    selectedIndex === null ? null : (molecules[selectedIndex] ?? null);

  return (
    <div className="panel" style={{ gap: 16 }}>
      <h2 className="section-title">
        <Icon icon="th" /> SDF → InChI
      </h2>
      <div className="muted">
        Load an SDF file — drag-and-drop it onto the box below, or click to
        browse — to compute the InChI and InChIKey of every structure, review
        them in the table, then download a new SDF with the{' '}
        <code>{INCHI_FIELD}</code> and <code>{INCHIKEY_FIELD}</code> fields
        added.
      </div>

      <div
        data-testid="sdf-dropzone"
        style={{ height: 160, overflow: 'hidden' }}
      >
        <DropZoneContainer
          onDrop={handleDrop}
          disabled={parsing || running}
          multiple={false}
          noClick={false}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              height: '100%',
              padding: 16,
              boxSizing: 'border-box',
              border: `5px dashed ${Colors.GRAY3}`,
              cursor: parsing || running ? 'default' : 'pointer',
              textAlign: 'center',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {molecules.length > 0 ? (
              <>
                <Icon icon="document" size={24} intent="primary" />
                <div
                  title={fileName ?? undefined}
                  className="mono molecule-table-ellipsis"
                  style={{ fontWeight: 600, maxWidth: '90%' }}
                >
                  {fileName ?? 'SDF loaded'}
                </div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {molecules.length.toLocaleString()} structures loaded — drop
                  or click to replace
                </div>
              </>
            ) : (
              <>
                <Icon icon="import" size={32} />
                <div style={{ fontWeight: 600, fontSize: 16 }}>
                  Drop an SDF file here
                </div>
                <div className="muted" style={{ fontSize: 13 }}>
                  Supports .sdf, .sdf.gz and .mol — or click to browse.
                </div>
              </>
            )}
          </div>
        </DropZoneContainer>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
        }}
      >
        {running ? (
          <Button icon="stop" intent="danger" onClick={handleStop}>
            Stop
          </Button>
        ) : (
          <Button
            icon="play"
            intent="primary"
            disabled={molecules.length === 0}
            onClick={handleRun}
          >
            Generate InChI ({molecules.length.toLocaleString()})
          </Button>
        )}
        <Button
          icon="download"
          disabled={!computations}
          onClick={handleDownload}
        >
          Download SDF
        </Button>
      </div>

      {progress && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="muted" style={{ fontSize: 12 }}>
            {initializing ? (
              'Preparing the InChI engine…'
            ) : (
              <>
                {progress.done.toLocaleString()} /{' '}
                {progress.total.toLocaleString()} structures · ok {progress.ok}{' '}
                · errors {progress.error} · warnings {progress.warning}
              </>
            )}
          </span>
          <ProgressBar
            animate={running}
            stripes={running}
            intent={running ? 'primary' : 'success'}
            value={initializing ? undefined : fraction}
          />
        </div>
      )}

      {error && <div className="error-card">{error}</div>}

      {stats && (
        <StatsFilterBar
          stats={stats}
          activeFilters={activeFilters}
          filteredCount={filteredRows.length}
          onToggle={toggleFilter}
          onClear={clearFilters}
        />
      )}

      {rows.length > 0 && (
        <div
          className={selectedRow && selectedMolecule ? 'sdf-split' : undefined}
        >
          <MoleculeTable
            rows={filteredRows}
            selectedIndex={selectedIndex}
            onSelect={(index) =>
              setSelectedIndex((current) => (current === index ? null : index))
            }
          />
          {selectedRow && selectedMolecule && (
            <MoleculeDetails
              molecule={selectedMolecule}
              row={selectedRow}
              onClose={() => setSelectedIndex(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
