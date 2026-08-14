import {
  AUXINFO_COLUMN,
  INCHIKEY_COLUMN,
  INCHI_COLUMN,
  SMILES_COLUMN,
} from 'inchi-api/convert';
import { useDeferredValue, useMemo, useState } from 'react';

import { readStored, writeStored } from '../../storage.ts';
import { countStatuses, filterRows } from '../previewFilter.ts';
import type { PreviewModel, RowStatus } from '../previewModel.ts';
import type { FilePreview } from '../protocol.ts';
import type { AppendedSelection } from '../useFileConvert.ts';

import { PreviewTable } from './PreviewTable.tsx';
import { PreviewToolbar } from './PreviewToolbar.tsx';

/** Where the structure toggle is remembered between visits. */
const STRUCTURES_KEY = 'inchi:file-convert:structures';

const NO_STATUS: ReadonlySet<RowStatus> = new Set();

/** Props of {@link PreviewSection}. */
export interface PreviewSectionProps {
  /** The loaded file plus the computed columns, once there are any. */
  model: PreviewModel;
  /** The loaded file as the worker returned it. */
  preview: FilePreview;
  /** Which computed columns the user kept. */
  selection: AppendedSelection;
}

/**
 * The preview of the loaded file: a toolbar narrowing it down, and the table
 * itself.
 *
 * The filter is applied here rather than in the table so the table only ever
 * receives the records it draws.
 * @param props - The preview model and the loaded file.
 * @returns The section JSX.
 */
export function PreviewSection(props: PreviewSectionProps) {
  const { model, preview, selection } = props;
  const [query, setQuery] = useState('');
  const [statuses, setStatuses] = useState(NO_STATUS);
  const [showStructures, setShowStructures] = useState(
    () => readStored(STRUCTURES_KEY) === 'true',
  );

  // Searching walks every cell of every record, so the table keeps drawing the
  // previous result while a fast typist is still typing.
  const deferredQuery = useDeferredValue(query);

  const rows = useMemo(
    () => filterRows(model, { query: deferredQuery, statuses }),
    [model, deferredQuery, statuses],
  );
  const counts = useMemo(
    () => (model.statusOf ? countStatuses(model) : null),
    [model],
  );

  // Every computed column is always available; the toggles decide which the
  // table draws. The structure column itself goes when the molecule is drawn
  // beside it and the value is a molfile — a clipped connection table repeats
  // the picture without adding anything. A SMILES is short and stays.
  const hiddenColumns = useMemo(() => {
    const hidden = new Set<string>();
    if (!selection.smiles) hidden.add(SMILES_COLUMN);
    if (!selection.inchi) hidden.add(INCHI_COLUMN);
    if (!selection.inchikey) hidden.add(INCHIKEY_COLUMN);
    if (!selection.auxinfo) hidden.add(AUXINFO_COLUMN);
    if (showStructures && preview.detection.kind === 'molfile') {
      hidden.add(preview.detection.column);
    }
    return hidden;
  }, [selection, showStructures, preview.detection]);

  return (
    <>
      <PreviewToolbar
        query={query}
        onQueryChange={setQuery}
        statuses={statuses}
        onStatusesChange={setStatuses}
        counts={counts}
        total={model.rowCount}
        shown={rows.length}
        showStructures={showStructures}
        onShowStructuresChange={(show) => {
          setShowStructures(show);
          writeStored(STRUCTURES_KEY, String(show));
        }}
      />
      {preview.truncated && (
        <span className="muted" style={{ fontSize: 12 }}>
          The preview stops at {model.rowCount.toLocaleString()} of the{' '}
          {preview.rowCount.toLocaleString()} records — the conversion still
          covers the whole file.
        </span>
      )}
      <PreviewTable
        model={model}
        rows={rows}
        structureColumn={preview.detection.column}
        structureKind={preview.detection.kind}
        showStructures={showStructures}
        hiddenColumns={hiddenColumns}
      />
    </>
  );
}
