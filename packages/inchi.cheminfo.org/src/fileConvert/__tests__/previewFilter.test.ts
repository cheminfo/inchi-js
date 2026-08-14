import { expect, test } from 'vitest';

import { countStatuses, filterRows } from '../previewFilter.ts';
import type { RowStatus } from '../previewModel.ts';
import { buildPreviewModel } from '../previewModel.ts';
import type { FilePreview } from '../protocol.ts';

const PREVIEW: FilePreview = {
  format: 'csv',
  columns: ['id', 'smiles'],
  rowCount: 3,
  detection: {
    column: 'smiles',
    kind: 'smiles',
    confidence: 1,
    reason: 'name',
  },
  rows: [
    ['1', 'CCO'],
    ['2', 'c1ccccc1'],
    ['3', 'not-a-smiles'],
  ],
  truncated: false,
  structures: ['CCO', 'c1ccccc1', 'not-a-smiles'],
};

const CONVERTED = buildPreviewModel(PREVIEW, {
  columns: ['InChI', 'InChI_Message'],
  rows: [
    ['InChI=1S/C2H6O', ''],
    ['InChI=1S/C6H6', 'Accepted unusual valence'],
    ['', 'invalid SMILES'],
  ],
});

const NO_STATUS: ReadonlySet<RowStatus> = new Set();

test('keeps every record when nothing is filtered', () => {
  const rows = filterRows(CONVERTED, { query: '', statuses: NO_STATUS });

  expect(rows).toStrictEqual([{ index: 0 }, { index: 1 }, { index: 2 }]);
});

test('keeps the records holding the searched text in any column', () => {
  const rows = filterRows(CONVERTED, {
    query: 'c1ccccc1',
    statuses: NO_STATUS,
  });

  expect(rows).toStrictEqual([{ index: 1 }]);
});

test('searches the appended columns too, ignoring case', () => {
  const rows = filterRows(CONVERTED, {
    query: 'invalid smiles',
    statuses: NO_STATUS,
  });

  expect(rows).toStrictEqual([{ index: 2 }]);
});

test('keeps only the records that failed', () => {
  const rows = filterRows(CONVERTED, {
    query: '',
    statuses: new Set<RowStatus>(['error']),
  });

  expect(rows).toStrictEqual([{ index: 2 }]);
});

test('keeps the records of every selected status', () => {
  const rows = filterRows(CONVERTED, {
    query: '',
    statuses: new Set<RowStatus>(['error', 'warning']),
  });

  expect(rows).toStrictEqual([{ index: 1 }, { index: 2 }]);
});

test('applies the search and the status together', () => {
  const rows = filterRows(CONVERTED, {
    query: 'InChI=1S',
    statuses: new Set<RowStatus>(['warning']),
  });

  expect(rows).toStrictEqual([{ index: 1 }]);
});

test('ignores the status filter while no conversion has run', () => {
  const model = buildPreviewModel(PREVIEW, null);

  const rows = filterRows(model, {
    query: '',
    statuses: new Set<RowStatus>(['error']),
  });

  expect(rows).toHaveLength(3);
});

test('counts the outcome of every record', () => {
  expect(countStatuses(CONVERTED)).toStrictEqual({
    ok: 1,
    warning: 1,
    error: 1,
  });
});

test('counts nothing while no conversion has run', () => {
  expect(countStatuses(buildPreviewModel(PREVIEW, null))).toStrictEqual({
    ok: 0,
    warning: 0,
    error: 0,
  });
});
