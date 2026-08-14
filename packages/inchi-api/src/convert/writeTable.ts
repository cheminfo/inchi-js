import ExcelJS from 'exceljs';
import Papa from 'papaparse';

import type { Table } from './types.ts';

/**
 * Serialize a table as CSV or TSV text.
 * @param table - The table to serialize.
 * @param delimiter - Field delimiter, `,` for CSV and `\t` for TSV.
 * @returns The delimited text, header row included.
 */
export function writeDelimited(table: Table, delimiter: string): string {
  return Papa.unparse(
    {
      fields: table.columns,
      data: table.rows.map((row) => rowValues(table, row)),
    },
    { delimiter, newline: '\n' },
  );
}

/**
 * Serialize a table as an XLSX workbook holding a single `structures` sheet.
 * @param table - The table to serialize.
 * @returns The workbook bytes.
 */
export async function writeXlsx(table: Table): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('structures');
  sheet.addRow(table.columns);
  for (const row of table.rows) {
    sheet.addRow(rowValues(table, row));
  }
  sheet.getRow(1).font = { bold: true };
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

function rowValues(
  table: Table,
  row: Record<string, unknown>,
): Array<string | number | boolean | null> {
  const values: Array<string | number | boolean | null> = [];
  for (const column of table.columns) {
    const value = row[column];
    values.push(
      value === undefined || value === null
        ? ''
        : (value as string | number | boolean),
    );
  }
  return values;
}
