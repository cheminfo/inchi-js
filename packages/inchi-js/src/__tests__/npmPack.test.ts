import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const packageRoot = join(import.meta.dirname, '..', '..');
const libPath = join(packageRoot, 'lib', 'inchi-js.js');

interface InchiPackage {
  inchiFromMolfile: (
    molfile: string,
  ) => Promise<{ returnCode: number; inchi: string }>;
  inchikeyFromInchi: (
    inchi: string,
  ) => Promise<{ returnCode: number; inchikey: string }>;
}

// Only runs when the bundle exists. The `test-bundle` script builds it
// first; during a plain `test-only` run this whole suite is skipped.
describe.runIf(existsSync(libPath))('reloaded npm package', () => {
  let workDir!: string;
  let inchiPackage!: InchiPackage;

  beforeAll(async () => {
    workDir = mkdtempSync(join(tmpdir(), 'inchi-js-pack-'));
    const packOutput = execFileSync(
      'npm',
      ['pack', '--json', '--ignore-scripts', `--pack-destination=${workDir}`],
      { cwd: packageRoot, encoding: 'utf8' },
    );
    const [first] = JSON.parse(packOutput) as Array<{ filename: string }>;
    if (!first) throw new Error('npm pack produced no tarball');
    execFileSync('tar', ['-xzf', join(workDir, first.filename), '-C', workDir]);

    const manifest = JSON.parse(
      readFileSync(join(workDir, 'package', 'package.json'), 'utf8'),
    ) as { exports: Record<string, { default: string }> };
    const rootExport = manifest.exports['.'];
    if (!rootExport) throw new Error('package.json is missing the "." export');
    const entryPath = join(workDir, 'package', rootExport.default);
    inchiPackage = (await import(
      pathToFileURL(entryPath).href
    )) as InchiPackage;
  }, 60_000);

  afterAll(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('tarball ships the expected files', () => {
    const root = readdirSync(join(workDir, 'package')).toSorted();

    expect(root).toStrictEqual(['LICENSE', 'README.md', 'lib', 'package.json']);

    const lib = readdirSync(join(workDir, 'package', 'lib')).toSorted();

    expect(lib).toStrictEqual([
      'inchi-js.d.ts',
      'inchi-js.js',
      'inchi-js.js.map',
      'inchi-js.min.js',
    ]);
  });

  it('inchiFromMolfile works on water', async () => {
    const water = readFileSync(
      join(packageRoot, 'src', '__tests__', 'data', 'water.mol'),
      'utf8',
    );
    const result = await inchiPackage.inchiFromMolfile(water);

    expect(result.returnCode).toBe(0);
    expect(result.inchi).toBe('InChI=1S/H2O/h1H2');
  });

  it('inchikeyFromInchi produces the canonical key', async () => {
    const result = await inchiPackage.inchikeyFromInchi('InChI=1S/H2O/h1H2');

    expect(result.returnCode).toBe(0);
    expect(result.inchikey).toBe('XLYOFNOQVPJJNP-UHFFFAOYSA-N');
  });
});
