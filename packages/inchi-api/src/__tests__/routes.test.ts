import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { INCHI_C_VERSION } from 'inchi-js';
import { afterAll, beforeAll, expect, test } from 'vitest';

import { buildApp } from '../app.ts';
import type { FastifyTyped } from '../types.ts';

const ETHANOL_INCHI = 'InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3';
const ETHANOL_KEY = 'LFQSCWFLJHTTHZ-UHFFFAOYSA-N';

let app: FastifyTyped;

beforeAll(async () => {
  app = await buildApp({ logger: false });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

function fixture(name: string): Buffer {
  return readFileSync(join(import.meta.dirname, 'data', name));
}

async function multipart(
  name: string,
): Promise<{ payload: Buffer; contentType: string }> {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(fixture(name))]), name);
  const request = new Request('http://localhost', {
    method: 'POST',
    body: form,
  });
  return {
    payload: Buffer.from(await request.arrayBuffer()),
    contentType: request.headers.get('content-type') as string,
  };
}

test('GET /health reports the InChI library version', async () => {
  const response = await app.inject({ method: 'GET', url: '/health' });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toStrictEqual({
    status: 'ok',
    inchiVersion: INCHI_C_VERSION,
  });
});

test('GET /v1/inchi converts a SMILES', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/v1/inchi',
    query: { structure: 'CCO' },
  });

  expect(response.statusCode).toBe(200);

  const body = response.json();

  expect(body.inchi).toBe(ETHANOL_INCHI);
  expect(body.inchikey).toBe(ETHANOL_KEY);
  expect(body.returnCode).toBe(0);
  expect(body.auxinfo).toBe('');
});

test('POST /v1/inchi reports an invalid SMILES without failing', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/inchi',
    payload: { structure: 'not a smiles' },
  });

  expect(response.statusCode).toBe(200);

  const body = response.json();

  expect(body.inchi).toBe('');
  expect(body.returnCode).toBe(-1);
  expect(body.message).toMatch(/^invalid SMILES/);
});

test('POST /v1/inchi/batch converts every structure in order', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/inchi/batch',
    payload: { structures: ['CCO', 'c1ccccc1'] },
  });

  expect(response.statusCode).toBe(200);

  const { results } = response.json();

  expect(results).toHaveLength(2);
  expect(results[0].inchikey).toBe(ETHANOL_KEY);
  expect(results[1].inchikey).toBe('UHOVQNZJYSORNB-UHFFFAOYSA-N');
});

test('POST /v1/inchikey and POST /v1/molfile round trip an InChI', async () => {
  const key = await app.inject({
    method: 'POST',
    url: '/v1/inchikey',
    payload: { inchi: ETHANOL_INCHI },
  });

  expect(key.json().inchikey).toBe(ETHANOL_KEY);

  const molfile = await app.inject({
    method: 'POST',
    url: '/v1/molfile',
    payload: { inchi: ETHANOL_INCHI },
  });

  expect(molfile.json().returnCode).toBe(0);
  expect(molfile.json().molfile).toContain('M  END');
});

test('POST /v1/convert accepts a raw body and answers with the same format', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/convert',
    query: { filename: 'compounds.csv' },
    headers: { 'content-type': 'text/csv' },
    payload: fixture('compounds.csv'),
  });

  expect(response.statusCode).toBe(200);
  expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
  expect(response.headers['content-disposition']).toBe(
    'attachment; filename="compounds-inchi.csv"',
  );
  expect(response.headers['x-structure-column']).toBe('smiles');
  expect(response.headers['x-structure-kind']).toBe('smiles');
  expect(response.headers['x-rows-total']).toBe('4');
  expect(response.headers['x-rows-converted']).toBe('3');
  expect(response.headers['x-rows-failed']).toBe('1');
  expect(response.body).toContain(ETHANOL_KEY);
});

test('POST /v1/convert accepts a multipart upload and answers an SDF', async () => {
  const { payload, contentType } = await multipart('compounds.csv');
  const response = await app.inject({
    method: 'POST',
    url: '/v1/convert',
    query: { output: 'sdf' },
    headers: { 'content-type': contentType },
    payload,
  });

  expect(response.statusCode).toBe(200);
  expect(response.headers['x-rows-skipped']).toBe('1');
  expect(response.body.split('$$$$').length - 1).toBe(3);
  expect(response.body).toContain(`>  <InChIKey>\n${ETHANOL_KEY}`);
});

test('POST /v1/detect reports the detected column and a sample', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/detect',
    query: { filename: 'compounds.tsv' },
    headers: { 'content-type': 'text/tab-separated-values' },
    payload: fixture('compounds.tsv'),
  });

  expect(response.statusCode).toBe(200);

  const body = response.json();

  expect(body.format).toBe('tsv');
  expect(body.columns).toStrictEqual(['id', 'label', 'struct']);
  expect(body.rowCount).toBe(3);
  expect(body.detection).toStrictEqual({
    column: 'struct',
    kind: 'smiles',
    confidence: 1,
    reason: 'content',
  });
  expect(body.sample).toHaveLength(3);
});

test('POST /v1/convert answers 422 when the column does not exist', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/convert',
    query: { filename: 'compounds.csv', column: 'structure' },
    headers: { 'content-type': 'text/csv' },
    payload: fixture('compounds.csv'),
  });

  expect(response.statusCode).toBe(422);
  expect(response.json()).toStrictEqual({
    error: 'ConversionError',
    message: 'column "structure" is not in the file',
    columns: ['id', 'name', 'smiles'],
  });
});

test('POST /v1/convert answers 422 when no file is sent', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/convert',
    headers: { 'content-type': 'text/csv' },
    payload: '',
  });

  expect(response.statusCode).toBe(422);
  expect(response.json().message).toBe('the request carries no file');
});
