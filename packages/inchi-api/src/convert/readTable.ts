import ExcelJS from 'exceljs';
import Papa from 'papaparse';

import type { CellValue, InputFormat, Table } from './types.ts';

/**
 * Read a CSV, TSV, or XLSX file into a {@link Table}.
 *
 * The first row is always the header. Values are kept verbatim as strings for
 * the text formats (so identifiers such as `0123` are not turned into numbers)
 * and as their native type for XLSX.
 * @param content - Raw file bytes.
 * @param format - Format of the file, as returned by `detectInputFormat`.
 * @returns The parsed table.
 * @throws {Error} When the file holds no header row.
 */
export async function readTable(
  content: Uint8Array,
  format: Exclude<InputFormat, 'sdf'>,
): Promise<Table> {
  const table =
    format === 'xlsx'
      ? await readXlsx(content)
      : readDelimited(content, format === 'tsv' ? '\t' : ',');
  if (table.columns.length === 0) {
    throw new Error('the file has no header row');
  }
  return table;
}

function readDelimited(content: Uint8Array, delimiter: string): Table {
  const text = new TextDecoder().decode(content);
  const parsed = Papa.parse<Record<string, string>>(text, {
    delimiter,
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header, index) => header.trim() || `column${index + 1}`,
  });
  const columns = parsed.meta.fields ?? [];
  const rows: Array<Record<string, CellValue>> = [];
  for (const row of parsed.data) {
    rows.push(pickColumns(row, columns));
  }
  return { columns, rows };
}

async function readXlsx(content: Uint8Array): Promise<Table> {
  const workbook = new ExcelJS.Workbook();
  // `load` expects a Node Buffer-compatible ArrayBuffer view.
  await workbook.xlsx.load(
    content.buffer.slice(
      content.byteOffset,
      content.byteOffset + content.byteLength,
    ) as ArrayBuffer,
  );
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error('the workbook has no worksheet');
  }

  const headerRow = sheet.getRow(1);
  const columns: string[] = [];
  for (let index = 1; index <= headerRow.cellCount; index++) {
    const name = String(
      normalizeCell(headerRow.getCell(index).value) ?? '',
    ).trim();
    columns.push(name || `column${index}`);
  }

  const rows: Array<Record<string, CellValue>> = [];
  for (let index = 2; index <= sheet.rowCount; index++) {
    const row = sheet.getRow(index);
    const record: Record<string, CellValue> = {};
    let empty = true;
    for (let column = 0; column < columns.length; column++) {
      const value = normalizeCell(row.getCell(column + 1).value);
      if (value !== null && value !== '') empty = false;
      record[columns[column] as string] = value;
    }
    if (!empty) rows.push(record);
  }
  return { columns, rows };
}

function pickColumns(
  row: Record<string, string>,
  columns: string[],
): Record<string, CellValue> {
  const record: Record<string, CellValue> = {};
  for (const column of columns) {
    record[column] = row[column] ?? '';
  }
  return record;
}

function normalizeCell(value: ExcelJS.CellValue): CellValue {
  if (value === null || value === undefined) return null;
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if ('richText' in value) {
    return value.richText.map((part) => part.text).join('');
  }
  if ('result' in value) return normalizeCell(value.result ?? null);
  if ('text' in value) return value.text;
  if ('error' in value) return value.error;
  return null;
}
