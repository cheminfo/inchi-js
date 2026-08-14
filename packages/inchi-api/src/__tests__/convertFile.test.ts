import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { convertFile } from '../convert/convertFile.ts';
import { ConversionError } from '../convert/errors.ts';
import { readTable } from '../convert/readTable.ts';
import { MESSAGE_COLUMN } from '../convert/types.ts';
import { writeXlsx } from '../convert/writeTable.ts';

const ETHANOL_INCHI = 'InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3';
const ETHANOL_KEY = 'LFQSCWFLJHTTHZ-UHFFFAOYSA-N';

function fixture(name: string): Uint8Array {
  return readFileSync(join(import.meta.dirname, 'data', name));
}

function asText(body: string | Uint8Array): string {
  return typeof body === 'string' ? body : new TextDecoder().decode(body);
}

test('csv in, csv out with the InChI columns appended', async () => {
  const result = await convertFile(fixture('compounds.csv'), {
    filename: 'compounds.csv',
  });

  expect(result.format).toBe('csv');
  expect(result.filename).toBe('compounds-inchi.csv');
  expect(result.detection).toStrictEqual({
    column: 'smiles',
    kind: 'smiles',
    confidence: 0.75,
    reason: 'name',
  });
  expect(result.stats).toStrictEqual({
    total: 4,
    converted: 3,
    failed: 1,
    skipped: 0,
  });

  const table = await readTable(
    new TextEncoder().encode(asText(result.body)),
    'csv',
  );

  expect(table.columns).toStrictEqual([
    'id',
    'name',
    'smiles',
    'InChI',
    'InChIKey',
  ]);
  expect(table.rows[0]).toStrictEqual({
    id: '1',
    name: 'ethanol',
    smiles: 'CCO',
    InChI: ETHANOL_INCHI,
    InChIKey: ETHANOL_KEY,
  });
  expect(table.rows[2]?.InChIKey).toBe('QNAYBMKLOCPYGJ-REOHCLBHSA-N');
  expect(table.rows[3]?.InChI).toBe('');
  expect(result.rows[3]?.message).toMatch(/^invalid SMILES/);
});

test('the message of a failed record is never written to the output', async () => {
  const result = await convertFile(fixture('compounds.csv'), {
    filename: 'compounds.csv',
    output: 'csv',
  });

  const table = await readTable(
    new TextEncoder().encode(asText(result.body)),
    'csv',
  );

  expect(table.columns).not.toContain(MESSAGE_COLUMN);
  expect(asText(result.body)).not.toContain('invalid SMILES');
});

test('csv in, sdf out skips the records without a structure', async () => {
  const result = await convertFile(fixture('compounds.csv'), {
    filename: 'compounds.csv',
    output: 'sdf',
  });

  expect(result.contentType).toBe('chemical/x-mdl-sdfile; charset=utf-8');
  expect(result.filename).toBe('compounds-inchi.sdf');
  expect(result.stats).toStrictEqual({
    total: 4,
    converted: 3,
    failed: 1,
    skipped: 1,
  });

  const sdf = asText(result.body);

  expect(sdf.split('$$$$').length - 1).toBe(3);
  expect(sdf).toContain(`>  <InChI>\n${ETHANOL_INCHI}`);
  expect(sdf).toContain(`>  <InChIKey>\n${ETHANOL_KEY}`);
  expect(sdf).toContain('>  <name>\nethanol');
});

test('sdf in, sdf out keeps the original data fields', async () => {
  const result = await convertFile(fixture('compounds.sdf'), {
    filename: 'compounds.sdf',
  });

  expect(result.detection.reason).toBe('sdf');
  expect(result.detection.kind).toBe('molfile');
  expect(result.stats).toStrictEqual({
    total: 3,
    converted: 3,
    failed: 0,
    skipped: 0,
  });

  const sdf = asText(result.body);

  expect(sdf).toContain('>  <ID>\n1');
  expect(sdf).toContain('>  <Name>\nethanol');
  expect(sdf).toContain(`>  <InChIKey>\n${ETHANOL_KEY}`);
});

test('sdf in, csv out drops the molfile column', async () => {
  const result = await convertFile(fixture('compounds.sdf'), {
    filename: 'compounds.sdf',
    output: 'csv',
  });

  const table = await readTable(
    new TextEncoder().encode(asText(result.body)),
    'csv',
  );

  expect(table.columns).toStrictEqual(['ID', 'Name', 'InChI', 'InChIKey']);
  expect(table.rows).toHaveLength(3);
  expect(table.rows[0]?.InChI).toBe(ETHANOL_INCHI);
});

test('tsv in, json out reports the detected column', async () => {
  const result = await convertFile(fixture('compounds.tsv'), {
    filename: 'compounds.tsv',
    output: 'json',
  });

  const payload = JSON.parse(asText(result.body)) as {
    detection: { column: string; reason: string };
    rows: Array<Record<string, string>>;
  };

  expect(payload.detection.column).toBe('struct');
  expect(payload.detection.reason).toBe('content');
  expect(payload.rows).toHaveLength(3);
  expect(payload.rows[0]?.InChIKey).toBe(ETHANOL_KEY);
});

test('xlsx round trip', async () => {
  const workbook = await writeXlsx({
    columns: ['id', 'SMILES'],
    rows: [
      { id: 1, SMILES: 'CCO' },
      { id: 2, SMILES: 'c1ccccc1' },
    ],
  });
  const result = await convertFile(workbook, { filename: 'compounds.xlsx' });

  expect(result.format).toBe('xlsx');
  expect(result.body).toBeInstanceOf(Uint8Array);
  expect(result.stats.converted).toBe(2);

  const table = await readTable(result.body as Uint8Array, 'xlsx');

  expect(table.columns).toStrictEqual(['id', 'SMILES', 'InChI', 'InChIKey']);
  expect(table.rows[0]).toStrictEqual({
    id: 1,
    SMILES: 'CCO',
    InChI: ETHANOL_INCHI,
    InChIKey: ETHANOL_KEY,
  });
});

test('the InChI options reach the C API', async () => {
  const result = await convertFile(fixture('compounds.csv'), {
    filename: 'compounds.csv',
    output: 'json',
    inchiOptions: '-SNon',
  });

  const payload = JSON.parse(asText(result.body)) as {
    rows: Array<Record<string, string>>;
  };

  expect(payload.rows[2]?.InChI).toBe(
    'InChI=1S/C3H7NO2/c1-2(4)3(5)6/h2H,4H2,1H3,(H,5,6)',
  );
});

test('only the InChIKey column is appended when the InChI is turned off', async () => {
  const result = await convertFile(fixture('compounds.csv'), {
    filename: 'compounds.csv',
    inchi: false,
  });

  const table = await readTable(
    new TextEncoder().encode(asText(result.body)),
    'csv',
  );

  expect(table.columns).toStrictEqual(['id', 'name', 'smiles', 'InChIKey']);
  expect(table.rows[0]?.InChIKey).toBe(ETHANOL_KEY);
});

test('the InChIKey is still computed when it is not written', async () => {
  const result = await convertFile(fixture('compounds.csv'), {
    filename: 'compounds.csv',
    inchikey: false,
  });

  const table = await readTable(
    new TextEncoder().encode(asText(result.body)),
    'csv',
  );

  expect(table.columns).toStrictEqual(['id', 'name', 'smiles', 'InChI']);
  expect(table.rows[0]?.InChI).toBe(ETHANOL_INCHI);
  // Computed either way, so a caller can show it without converting again.
  expect(result.rows[0]?.inchikey).toBe(ETHANOL_KEY);
});

test('the AuxInfo is computed even when it is not written', async () => {
  const result = await convertFile(fixture('compounds.csv'), {
    filename: 'compounds.csv',
  });

  const table = await readTable(
    new TextEncoder().encode(asText(result.body)),
    'csv',
  );

  expect(table.columns).not.toContain('InChI_AuxInfo');
  expect(result.rows[0]?.auxinfo).toMatch(/^AuxInfo=/);
});

test('an sdf output writes only the selected data fields', async () => {
  const result = await convertFile(fixture('compounds.sdf'), {
    filename: 'compounds.sdf',
    inchi: false,
  });

  const sdf = asText(result.body);

  expect(sdf).toContain(`>  <InChIKey>\n${ETHANOL_KEY}`);
  expect(sdf).not.toContain('>  <InChI>');
});

test('turning every appended column off writes the file unchanged', async () => {
  const result = await convertFile(fixture('compounds.csv'), {
    filename: 'compounds.csv',
    inchi: false,
    inchikey: false,
  });

  const table = await readTable(
    new TextEncoder().encode(asText(result.body)),
    'csv',
  );

  // The selection governs the file only: every record was still converted.
  expect(table.columns).toStrictEqual(['id', 'name', 'smiles']);
  expect(result.rows[0]?.inchi).toBe(ETHANOL_INCHI);
  expect(result.stats.converted).toBe(3);
});

test('sdf in, csv out can append the SMILES of every record', async () => {
  const result = await convertFile(fixture('compounds.sdf'), {
    filename: 'compounds.sdf',
    output: 'csv',
    smiles: true,
  });

  const table = await readTable(
    new TextEncoder().encode(asText(result.body)),
    'csv',
  );

  expect(table.columns).toStrictEqual([
    'ID',
    'Name',
    'SMILES',
    'InChI',
    'InChIKey',
  ]);
  expect(table.rows[0]?.SMILES).toBe('CCO');
});

test('sdf in, sdf out writes the SMILES as a data field', async () => {
  const result = await convertFile(fixture('compounds.sdf'), {
    filename: 'compounds.sdf',
    smiles: true,
  });

  expect(asText(result.body)).toContain('>  <SMILES>\nCCO');
});

test('a file that already holds SMILES gets no SMILES column', async () => {
  const result = await convertFile(fixture('compounds.csv'), {
    filename: 'compounds.csv',
    smiles: true,
  });

  const table = await readTable(
    new TextEncoder().encode(asText(result.body)),
    'csv',
  );

  expect(table.columns).toStrictEqual([
    'id',
    'name',
    'smiles',
    'InChI',
    'InChIKey',
  ]);
});

test('an unknown format is rejected', async () => {
  await expect(
    convertFile(new TextEncoder().encode(''), { filename: 'compounds.doc' }),
  ).rejects.toThrow(ConversionError);
});

test('the per-record results are returned alongside the file', async () => {
  const result = await convertFile(fixture('compounds.csv'), {
    filename: 'compounds.csv',
  });

  expect(result.rows).toHaveLength(4);
  expect(result.rows[0]?.inchi).toBe(ETHANOL_INCHI);
  expect(result.rows[0]?.inchikey).toBe(ETHANOL_KEY);
  expect(result.rows[0]?.message).toBe('');
  expect(result.rows[3]?.inchi).toBe('');
  expect(result.rows[3]?.message).toContain('invalid SMILES');
});

test('every input format converts into every output format', async () => {
  const xlsx = await writeXlsx({
    columns: ['id', 'smiles'],
    rows: [
      { id: 1, smiles: 'CCO' },
      { id: 2, smiles: 'c1ccccc1' },
    ],
  });
  const inputs = [
    { name: 'compounds.csv', content: fixture('compounds.csv') },
    { name: 'compounds.tsv', content: fixture('compounds.tsv') },
    { name: 'compounds.sdf', content: fixture('compounds.sdf') },
    { name: 'compounds.xlsx', content: xlsx },
  ] as const;
  const outputs = ['csv', 'tsv', 'xlsx', 'sdf', 'json'] as const;

  for (const input of inputs) {
    for (const output of outputs) {
      // eslint-disable-next-line no-await-in-loop -- one WASM instance, conversions run sequentially
      const result = await convertFile(input.content, {
        filename: input.name,
        output,
      });
      const label = `${input.name} -> ${output}`;

      expect(`${label}: ${result.format}`).toBe(`${label}: ${output}`);
      expect(`${label}: ${result.rows[0]?.inchi}`).toBe(
        `${label}: ${ETHANOL_INCHI}`,
      );

      const size =
        typeof result.body === 'string'
          ? result.body.length
          : result.body.byteLength;

      expect(`${label}: empty=${size === 0}`).toBe(`${label}: empty=false`);
    }
  }
});

test('progress is reported up to the record count', async () => {
  const seen: Array<[number, number]> = [];
  const result = await convertFile(fixture('compounds.csv'), {
    filename: 'compounds.csv',
    onProgress: (done, total) => {
      seen.push([done, total]);
    },
  });

  expect(seen.at(-1)).toStrictEqual([4, 4]);
  expect(result.stats.total).toBe(4);
});
