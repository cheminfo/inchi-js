import { expect, test } from 'vitest';

import { buildPreviewModel } from '../previewModel.ts';
import type { AppendedColumns, FilePreview } from '../protocol.ts';

const PREVIEW: FilePreview = {
  format: 'csv',
  columns: ['id', 'smiles'],
  rowCount: 2,
  detection: {
    column: 'smiles',
    kind: 'smiles',
    confidence: 1,
    reason: 'name',
  },
  rows: [
    ['1', 'CCO'],
    ['2', 'c1ccccc1'],
  ],
  truncated: false,
  structures: ['CCO', 'c1ccccc1'],
};

const APPENDED: AppendedColumns = {
  columns: ['InChI', 'InChIKey'],
  rows: [
    ['InChI=1S/C2H6O', 'LFQSCWFLJHTTHZ-UHFFFAOYSA-N'],
    ['InChI=1S/C6H6', 'UHOVQNZJYSORNB-UHFFFAOYSA-N'],
  ],
};

test('leads with the structure column before a conversion', () => {
  const model = buildPreviewModel(PREVIEW, null);

  expect(model.columns).toStrictEqual(['smiles', 'id']);
  expect(model.rowCount).toBe(2);
  expect(model.computedColumns.size).toBe(0);
  expect(model.getCell(0, 0)).toBe('CCO');
  expect(model.getCell(1, 1)).toBe('2');
});

test('puts the computed columns between the structure and the rest', () => {
  const model = buildPreviewModel(PREVIEW, APPENDED);

  expect(model.columns).toStrictEqual(['smiles', 'InChI', 'InChIKey', 'id']);
  expect([...model.computedColumns]).toStrictEqual(['InChI', 'InChIKey']);
  expect(model.getCell(0, 0)).toBe('CCO');
  expect(model.getCell(0, 1)).toBe('InChI=1S/C2H6O');
  expect(model.getCell(1, 2)).toBe('UHOVQNZJYSORNB-UHFFFAOYSA-N');
  expect(model.getCell(1, 3)).toBe('2');
});

test('keeps the file order when the structure column is not one of them', () => {
  const model = buildPreviewModel(
    { ...PREVIEW, detection: { ...PREVIEW.detection, column: 'absent' } },
    APPENDED,
  );

  expect(model.columns).toStrictEqual(['InChI', 'InChIKey', 'id', 'smiles']);
  expect(model.getCell(0, 2)).toBe('1');
});

test('reads missing cells as empty instead of throwing', () => {
  const model = buildPreviewModel(PREVIEW, null);

  expect(model.getCell(99, 0)).toBe('');
  expect(model.getCell(0, 99)).toBe('');
});

test('has no status while no conversion has run', () => {
  expect(buildPreviewModel(PREVIEW, null).statusOf).toBeNull();
});

test('reads the outcome of every record out of the appended columns', () => {
  const model = buildPreviewModel(PREVIEW, {
    columns: ['InChI', 'InChIKey', 'InChI_Message'],
    rows: [
      ['InChI=1S/C2H6O', 'LFQSCWFLJHTTHZ-UHFFFAOYSA-N', ''],
      ['', '', 'invalid SMILES'],
    ],
  });

  expect(model.statusOf?.(0)).toBe('ok');
  expect(model.statusOf?.(1)).toBe('error');
});

test('reports a record that converted with a message as a warning', () => {
  const model = buildPreviewModel(PREVIEW, {
    columns: ['InChI', 'InChI_Message'],
    rows: [['InChI=1S/C2H6O', 'Accepted unusual valence']],
  });

  expect(model.statusOf?.(0)).toBe('warning');
});

test('falls back to the InChIKey column when only that one was appended', () => {
  const model = buildPreviewModel(PREVIEW, {
    columns: ['InChIKey', 'InChI_Message'],
    rows: [
      ['LFQSCWFLJHTTHZ-UHFFFAOYSA-N', ''],
      ['', 'empty structure'],
    ],
  });

  expect(model.statusOf?.(0)).toBe('ok');
  expect(model.statusOf?.(1)).toBe('error');
});

test('reads the structure of a record, and null past what was kept', () => {
  const model = buildPreviewModel(PREVIEW, null);

  expect(model.getStructure(1)).toBe('c1ccccc1');
  expect(model.getStructure(2)).toBeNull();
});

test('leaves the appended cells empty while no conversion has run', () => {
  const model = buildPreviewModel(PREVIEW, {
    columns: ['InChI'],
    rows: [],
  });

  expect(model.columns).toStrictEqual(['smiles', 'InChI', 'id']);
  expect(model.getCell(0, 1)).toBe('');
});
