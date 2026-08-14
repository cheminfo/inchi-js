import { parse } from 'sdf-parser';

import type { CellValue, Table } from './types.ts';
import { MOLFILE_COLUMN } from './types.ts';

/**
 * Read an SDF file into a {@link Table} whose first column holds the raw
 * molfile and whose remaining columns are the union of the `> <field>` data
 * fields, in the order they are first met.
 * @param content - Raw file bytes.
 * @returns The parsed table.
 * @throws {Error} When the file holds no molecule.
 */
export function readSdf(content: Uint8Array): Table {
  const { molecules } = parse(content, {
    dynamicTyping: false,
    mixedEOL: true,
  });
  if (molecules.length === 0) {
    throw new Error('the SDF file holds no molecule');
  }

  const columns = [MOLFILE_COLUMN];
  const seen = new Set(columns);
  const rows: Array<Record<string, CellValue>> = [];
  for (const molecule of molecules) {
    const row: Record<string, CellValue> = {
      [MOLFILE_COLUMN]: molecule.molfile,
    };
    for (const label of Object.keys(molecule)) {
      if (label === MOLFILE_COLUMN) continue;
      if (!seen.has(label)) {
        seen.add(label);
        columns.push(label);
      }
      row[label] = toCellValue(molecule[label]);
    }
    rows.push(row);
  }
  return { columns, rows };
}

function toCellValue(value: unknown): CellValue {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  return null;
}
