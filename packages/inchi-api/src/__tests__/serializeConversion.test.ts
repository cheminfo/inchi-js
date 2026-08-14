import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { convertFile } from '../convert/convertFile.ts';
import { readSdf } from '../convert/readSdf.ts';
import { readTable } from '../convert/readTable.ts';
import { serializeConversion } from '../convert/serializeConversion.ts';

const ETHANOL_INCHI = 'InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3';
const ETHANOL_KEY = 'LFQSCWFLJHTTHZ-UHFFFAOYSA-N';

function fixture(name: string): Uint8Array {
  return readFileSync(join(import.meta.dirname, 'data', name));
}

function asText(body: string | Uint8Array): string {
  return typeof body === 'string' ? body : new TextDecoder().decode(body);
}

async function convertCsv() {
  const result = await convertFile(fixture('compounds.csv'), {
    filename: 'compounds.csv',
  });
  return {
    table: result.table,
    rows: result.rows,
    stats: result.stats,
    detection: result.detection,
    inputFormat: result.inputFormat,
  };
}

test('writes the same conversion out as TSV', async () => {
  const conversion = await convertCsv();

  const written = await serializeConversion(conversion, {
    output: 'tsv',
    filename: 'compounds.csv',
  });

  expect(written.format).toBe('tsv');
  expect(written.filename).toBe('compounds-inchi.tsv');
  expect(written.contentType).toBe('text/tab-separated-values; charset=utf-8');
  expect(written.skipped).toBe(0);

  const table = await readTable(
    new TextEncoder().encode(asText(written.body)),
    'tsv',
  );

  expect(table.columns).toStrictEqual([
    'id',
    'name',
    'smiles',
    'InChI',
    'InChIKey',
  ]);
  expect(table.rows[0]?.InChI).toBe(ETHANOL_INCHI);
  expect(table.rows[0]?.InChIKey).toBe(ETHANOL_KEY);
});

test('writes the same conversion out as SDF, skipping records with no molfile', async () => {
  const conversion = await convertCsv();

  const written = await serializeConversion(conversion, {
    output: 'sdf',
    filename: 'compounds.csv',
  });

  expect(written.format).toBe('sdf');
  expect(written.filename).toBe('compounds-inchi.sdf');
  expect(written.skipped).toBe(1);

  const table = readSdf(new TextEncoder().encode(asText(written.body)));

  expect(table.rows).toHaveLength(3);
  expect(table.rows[0]?.InChI).toBe(ETHANOL_INCHI);
  expect(table.rows[0]?.InChIKey).toBe(ETHANOL_KEY);
});

test('writes the same conversion out as XLSX bytes', async () => {
  const conversion = await convertCsv();

  const written = await serializeConversion(conversion, {
    output: 'xlsx',
    filename: 'compounds.csv',
  });

  expect(written.format).toBe('xlsx');
  expect(written.filename).toBe('compounds-inchi.xlsx');
  expect(written.body).toBeInstanceOf(Uint8Array);

  const table = await readTable(written.body as Uint8Array, 'xlsx');

  expect(table.columns).toContain('InChIKey');
  expect(table.rows[0]?.InChIKey).toBe(ETHANOL_KEY);
});

test('`same` mirrors the format of the uploaded file', async () => {
  const conversion = await convertCsv();

  const written = await serializeConversion(conversion, {
    filename: 'compounds.csv',
  });

  expect(written.format).toBe('csv');
  expect(written.filename).toBe('compounds-inchi.csv');
});
