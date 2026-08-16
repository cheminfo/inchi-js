import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { gunzipSync } from 'node:zlib';

import { inchiFromMolfile } from '../src/inchiFromMolfile.ts';

/**
 * Benchmark the WASM `inchi-js` library against the native `inchi-1`
 * IUPAC reference binary on a real SDF corpus.
 *
 * Three measurements are reported:
 *
 *  1. WASM, per-molfile  — the realistic JS use case: one
 *     `inchiFromMolfile()` call per structure inside a single Node
 *     process.
 *  2. Native, batch       — the realistic CLI use case: one
 *     `inchi-1` process that walks the whole SDF.
 *  3. Native, per-call    — for a small subset, spawn `inchi-1` once
 *     per molfile. This isolates the per-structure C kernel cost
 *     from process-startup overhead and shows how expensive the
 *     "shell out for every molecule" anti-pattern actually is.
 *
 * Run with:
 *   node benchmark/bench-inchi.ts [sdf-path] [limit]
 *
 * Defaults to the upstream `inchi.sdf.gz` (2,190 structures). Set
 * `INCHI_BIN` to point at a different native binary.
 */

const REPO_ROOT = join(import.meta.dirname, '..');
const DEFAULT_SDF = join(
  REPO_ROOT,
  'vendor/inchi/INCHI-1-TEST/tests/test_library/data/ci/inchi.sdf.gz',
);
const PER_CALL_SAMPLE_SIZE = 50;

const sdfArg = process.argv[2];
const sdfPath = sdfArg && sdfArg.length > 0 ? sdfArg : DEFAULT_SDF;
const limitArg = process.argv[3];
const limit =
  limitArg && limitArg.length > 0
    ? Number.parseInt(limitArg, 10)
    : Number.POSITIVE_INFINITY;
const nativeBin = process.env.INCHI_BIN ?? 'inchi-1';

function* iterateRecords(text: string): Generator<string> {
  for (const part of text.split(/\$\$\$\$\r?\n?/)) {
    if (!part.includes('M  END')) continue;
    yield part;
  }
}

function extractMolfile(record: string): string {
  const lines = record.split(/\r?\n/);
  const endIndex = lines.findIndex((line) => line.startsWith('M  END'));
  if (endIndex === -1) return record;
  return `${lines.slice(0, endIndex + 1).join('\n')}\n`;
}

interface Stats {
  totalMs: number;
  perStructureMs: number;
  structuresPerSecond: number;
}

function summarize(label: string, count: number, totalMs: number): Stats {
  const perStructureMs = totalMs / count;
  const structuresPerSecond = (count / totalMs) * 1000;
  const line =
    `  ${label.padEnd(34)}` +
    `${totalMs.toFixed(0).padStart(8)} ms  ` +
    `${perStructureMs.toFixed(3).padStart(8)} ms/struct  ` +
    `${structuresPerSecond.toFixed(0).padStart(7)} struct/s`;
  process.stdout.write(`${line}\n`);
  return { totalMs, perStructureMs, structuresPerSecond };
}

function makeSdfBlob(molfiles: string[]): string {
  return molfiles.map((m) => `${m.replace(/\n+$/, '')}\n$$$$\n`).join('');
}

function runNativeBatch(sdfFile: string, outFile: string): void {
  execFileSync(
    nativeBin,
    [
      sdfFile,
      outFile,
      '-NoLabels',
      '-AuxNone',
      '-NoWarnings',
      // Emit an empty `InChI=` line on failure, so every input
      // structure produces exactly one output line and array indices
      // stay aligned with the input.
      '-OutErrInChI',
    ],
    { stdio: ['ignore', 'ignore', 'ignore'] },
  );
}

process.stdout.write(`SDF:    ${sdfPath}\n`);
process.stdout.write(`Native: ${nativeBin}\n\n`);

const text = gunzipSync(readFileSync(sdfPath)).toString('utf8');

const molfiles: string[] = [];
for (const record of iterateRecords(text)) {
  if (molfiles.length >= limit) break;
  molfiles.push(extractMolfile(record));
}

const firstMolfile = molfiles[0];
if (firstMolfile === undefined) {
  throw new Error(`No molfiles parsed from ${sdfPath}`);
}

const totalBytes = molfiles.reduce((sum, m) => sum + m.length, 0);
const avgBytes = totalBytes / molfiles.length;
process.stdout.write(
  `Loaded ${molfiles.length} structures, ` +
    `avg ${avgBytes.toFixed(0)} bytes/molfile.\n\n`,
);

// Warm-up: instantiate WASM (its first call pays for module
// instantiation, gzip decompression, and Emscripten setup).
const warmStart = performance.now();
await inchiFromMolfile(firstMolfile);
const warmMs = performance.now() - warmStart;
process.stdout.write(`WASM cold start: ${warmMs.toFixed(0)} ms\n\n`);

process.stdout.write('--- Throughput ---\n');

const wasmStart = performance.now();
const wasmInchis: string[] = [];
for (const mol of molfiles) {
  // eslint-disable-next-line no-await-in-loop -- intentional sequential benchmark
  const result = await inchiFromMolfile(mol);
  wasmInchis.push(result.inchi);
}
const wasm = summarize(
  'WASM inchi-js (per molfile)',
  molfiles.length,
  performance.now() - wasmStart,
);

const tmpDir = mkdtempSync(join(tmpdir(), 'inchi-bench-'));
const sdfTmp = join(tmpDir, 'input.sdf');
const outTmp = join(tmpDir, 'output.txt');
writeFileSync(sdfTmp, makeSdfBlob(molfiles));
const nativeStart = performance.now();
runNativeBatch(sdfTmp, outTmp);
const native = summarize(
  'native inchi-1 (batch, 1 process)',
  molfiles.length,
  performance.now() - nativeStart,
);

const nativeInchis = readFileSync(outTmp, 'utf8')
  .split(/\r?\n/)
  .filter((line) => line.startsWith('InChI='));

const sampleSize = Math.min(PER_CALL_SAMPLE_SIZE, molfiles.length);
const perCallSdf = join(tmpDir, 'one.sdf');
const perCallOut = join(tmpDir, 'one.txt');
const perCallStart = performance.now();
for (let i = 0; i < sampleSize; i++) {
  const mol = molfiles[i];
  if (mol === undefined) break;
  writeFileSync(perCallSdf, `${mol.replace(/\n+$/, '')}\n$$$$\n`);
  runNativeBatch(perCallSdf, perCallOut);
}
const perCall = summarize(
  `native inchi-1 (1 process / mol, n=${sampleSize})`,
  sampleSize,
  performance.now() - perCallStart,
);

process.stdout.write('\n--- Summary ---\n');
const wasmVsBatch = native.structuresPerSecond / wasm.structuresPerSecond;
process.stdout.write(
  `WASM is ${wasmVsBatch.toFixed(2)}x ` +
    `${wasmVsBatch >= 1 ? 'slower' : 'faster'} than native batch.\n`,
);
const batchVsPerCall =
  perCall.totalMs / sampleSize / (native.totalMs / molfiles.length);
process.stdout.write(
  `Spawning inchi-1 per molfile is ${batchVsPerCall.toFixed(0)}x ` +
    'slower than running it once on the whole SDF.\n',
);

let mismatches = 0;
const checked = Math.min(wasmInchis.length, nativeInchis.length);
for (let i = 0; i < checked; i++) {
  if (wasmInchis[i] !== nativeInchis[i]) mismatches += 1;
}
process.stdout.write(
  `\nAgreement: ${checked - mismatches}/${checked} ` +
    `structures matched (${mismatches} mismatches).\n`,
);

rmSync(tmpDir, { recursive: true, force: true });
