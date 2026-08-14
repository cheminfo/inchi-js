import {
  Button,
  Callout,
  Icon,
  ProgressBar,
  Spinner,
  Tag,
} from '@blueprintjs/core';
import { canAppendSmiles } from 'inchi-api/convert';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { appendLabel } from './appendLabel.ts';
import { ConvertOptions } from './components/ConvertOptions.tsx';
import { DropZone } from './components/DropZone.tsx';
import { PreviewSection } from './components/PreviewSection.tsx';
import { ResultCard } from './components/ResultCard.tsx';
import { buildPreviewModel } from './previewModel.ts';
import type { ConvertSettings } from './useFileConvert.ts';
import { useFileConvert } from './useFileConvert.ts';

const DEFAULT_SETTINGS: ConvertSettings = {
  column: '',
  inchiOptions: '',
  smiles: false,
  inchi: true,
  inchikey: true,
  auxinfo: false,
};

const REASON_TEXT: Record<string, string> = {
  sdf: 'every SDF record carries its molfile',
  name: 'the column name says so',
  content: 'its values parse as structures',
  explicit: 'you picked it',
};

/**
 * Batch panel: load a CSV, TSV, XLSX or SDF, append the InChI and InChIKey of
 * every record, and download the result in any supported format.
 *
 * The conversion is the exact code the `inchi-api` service runs, executed here
 * in a Web Worker — no file ever leaves the browser.
 * @returns The panel JSX.
 */
export function FileConvertPanel() {
  const convert = useFileConvert();
  const [settings, setSettings] = useState<ConvertSettings>(DEFAULT_SETTINGS);
  const {
    status,
    file,
    preview,
    progress,
    result,
    reformatting,
    error,
    load,
    reformat,
    reset,
  } = convert;

  // A SMILES column is only worth appending to a file whose structures are
  // molfiles and which carries none of its own, so the toggle can be on from a
  // previous file and still not apply to this one.
  const smilesAvailable = preview
    ? canAppendSmiles(preview.columns, preview.detection)
    : false;
  const selection = {
    smiles: settings.smiles && smilesAvailable,
    inchi: settings.inchi,
    inchikey: settings.inchikey,
    auxinfo: settings.auxinfo,
  };

  const patchSettings = useCallback(
    (patch: Partial<ConvertSettings>) => {
      setSettings((current) => {
        const next = { ...current, ...patch };
        if (patch.column !== undefined && patch.column !== current.column) {
          convert.useColumn(patch.column);
        }
        // Every computed column already exists: picking another set only has
        // to write the file again, never to convert anything again.
        if (
          result &&
          (next.smiles !== current.smiles ||
            next.inchi !== current.inchi ||
            next.inchikey !== current.inchikey ||
            next.auxinfo !== current.auxinfo)
        ) {
          reformat(result.format, {
            smiles: next.smiles && smilesAvailable,
            inchi: next.inchi,
            inchikey: next.inchikey,
            auxinfo: next.auxinfo,
          });
        }
        return next;
      });
    },
    [convert, result, reformat, smilesAvailable],
  );

  const busy = status === 'reading' || status === 'converting';
  const appended = appendLabel(selection);

  // The preview table is taller than the viewport, so the result would land
  // below the fold on a long file.
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (status === 'done') {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [status]);

  const model = useMemo(
    () =>
      preview ? buildPreviewModel(preview, result?.appended ?? null) : null,
    [preview, result],
  );

  return (
    <div
      style={{
        marginTop: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div className="panel">
        <h2 className="section-title">
          <Icon icon="th-derived" /> File → InChI
        </h2>
        <p className="muted" style={{ margin: 0 }}>
          Append an <strong>InChI</strong> and/or <strong>InChIKey</strong>{' '}
          column to every record of a spreadsheet or an SDF. CSV, TSV and XLSX
          need a SMILES (or molfile) column — it is detected for you; an SDF
          already carries its structures.
        </p>

        {file === null ? (
          <DropZone onFile={load} disabled={busy} />
        ) : (
          <div className="loaded-file">
            <Icon icon="document" />
            <span style={{ fontWeight: 600 }}>{file.name}</span>
            {preview && (
              <>
                <Tag minimal>{preview.format.toUpperCase()}</Tag>
                <Tag minimal>
                  {preview.rowCount} record{preview.rowCount === 1 ? '' : 's'}
                </Tag>
              </>
            )}
            <div style={{ flex: 1 }} />
            <Button
              icon="cross"
              variant="minimal"
              disabled={busy}
              onClick={reset}
            >
              Remove
            </Button>
          </div>
        )}

        {status === 'reading' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Spinner size={16} />{' '}
            <span className="muted">Reading the file…</span>
          </div>
        )}

        {status === 'error' && (
          <Callout intent="danger" title="Could not read this file">
            {error}
          </Callout>
        )}

        {preview && (
          <>
            <Callout intent="primary" icon="locate">
              Structures read from <strong>{preview.detection.column}</strong>{' '}
              as <strong>{preview.detection.kind}</strong> —{' '}
              {REASON_TEXT[preview.detection.reason] ??
                preview.detection.reason}
              {preview.detection.reason !== 'sdf' && (
                <>
                  {' '}
                  ({Math.round(preview.detection.confidence * 100)}% of the
                  sampled values parsed)
                </>
              )}
              . Pick another column below if that is wrong.
            </Callout>

            {model && (
              <PreviewSection
                model={model}
                preview={preview}
                selection={selection}
              />
            )}

            <div className="convert-options-row">
              <ConvertOptions
                settings={settings}
                onChange={patchSettings}
                columns={preview.columns}
                canAppendSmiles={smilesAvailable}
                disabled={busy}
              />

              <div className="convert-action">
                <Button
                  intent="primary"
                  icon="play"
                  loading={status === 'converting'}
                  disabled={busy || !appended}
                  onClick={() => {
                    convert.convert({ ...settings, smiles: selection.smiles });
                  }}
                >
                  Append on {preview.rowCount.toLocaleString()} record
                  {preview.rowCount === 1 ? '' : 's'}
                </Button>
                {status === 'converting' && (
                  <div style={{ flex: 1, maxWidth: 320 }}>
                    <ProgressBar
                      intent="primary"
                      value={
                        progress.total > 0 ? progress.done / progress.total : 0
                      }
                    />
                    <div
                      className="muted"
                      style={{ fontSize: 12, marginTop: 4 }}
                    >
                      {progress.done} / {progress.total} records
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {result && (
        <div ref={resultRef}>
          <ResultCard
            result={result}
            reformatting={reformatting}
            onReformat={(output) => {
              reformat(output, selection);
            }}
          />
        </div>
      )}
    </div>
  );
}
