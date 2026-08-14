import { expect, test } from 'vitest';

import { detectStructureColumn } from '../convert/detectStructureColumn.ts';
import { ConversionError } from '../convert/errors.ts';
import type { Table } from '../convert/types.ts';

function tableOf(
  columns: string[],
  rows: Array<Record<string, string>>,
): Table {
  return { columns, rows };
}

test('detects a column named smiles even when some values are invalid', () => {
  const table = tableOf(
    ['id', 'name', 'smiles'],
    [
      { id: '1', name: 'ethanol', smiles: 'CCO' },
      { id: '2', name: 'benzene', smiles: 'c1ccccc1' },
      { id: '3', name: 'broken', smiles: 'not a smiles' },
    ],
  );

  expect(detectStructureColumn(table)).toStrictEqual({
    column: 'smiles',
    kind: 'smiles',
    confidence: 2 / 3,
    reason: 'name',
  });
});

test('detects an unnamed column by parsing its values', () => {
  const table = tableOf(
    ['id', 'label', 'struct'],
    [
      { id: '1', label: 'one', struct: 'CCO' },
      { id: '2', label: 'two', struct: 'CC(=O)O' },
      { id: '3', label: 'three', struct: 'c1ccncc1' },
    ],
  );

  expect(detectStructureColumn(table)).toStrictEqual({
    column: 'struct',
    kind: 'smiles',
    confidence: 1,
    reason: 'content',
  });
});

test('the molfile column of an SDF always wins', () => {
  const table = tableOf(
    ['molfile', 'smiles'],
    [
      {
        molfile: '\n\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END',
        smiles: 'CCO',
      },
    ],
  );

  expect(detectStructureColumn(table)).toStrictEqual({
    column: 'molfile',
    kind: 'molfile',
    confidence: 1,
    reason: 'sdf',
  });
});

test('an explicit column overrides the detection', () => {
  const table = tableOf(
    ['first', 'second'],
    [{ first: 'CCO', second: 'c1ccccc1' }],
  );

  expect(detectStructureColumn(table, { column: 'second' })).toStrictEqual({
    column: 'second',
    kind: 'smiles',
    confidence: 1,
    reason: 'explicit',
  });
});

test('throws when no column holds structures', () => {
  const table = tableOf(
    ['id', 'name'],
    [
      { id: '1', name: 'first entry' },
      { id: '2', name: 'second entry' },
    ],
  );

  expect(() => detectStructureColumn(table)).toThrow(ConversionError);
  expect(() => detectStructureColumn(table)).toThrow(
    'no SMILES or molfile column found',
  );
});

test('throws when the explicit column is absent', () => {
  const table = tableOf(['smiles'], [{ smiles: 'CCO' }]);

  expect(() => detectStructureColumn(table, { column: 'structure' })).toThrow(
    'column "structure" is not in the file',
  );
});
