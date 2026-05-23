// Bundles the inchi-js library into a single ESM file with a single
// declaration file. Produces:
//   lib/inchi-js.js      — bundled ESM
//   lib/inchi-js.js.map  — source map
//   lib/inchi-js.min.js  — minified ESM (for CDN-style direct use)
//   lib/inchi-js.d.ts    — bundled TypeScript types

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stdout } from 'node:process';

import { generateDtsBundle } from 'dts-bundle-generator';
import { build } from 'esbuild';

const packageDir = join(import.meta.dirname, '..');
const entry = join(packageDir, 'src/index.ts');
const outDir = join(packageDir, 'lib');
const outJs = join(outDir, 'inchi-js.js');
const outMinJs = join(outDir, 'inchi-js.min.js');
const outDts = join(outDir, 'inchi-js.d.ts');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

/** @type {import('esbuild').BuildOptions} */
const shared = {
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  legalComments: 'inline',
};

await build({
  ...shared,
  outfile: outJs,
  sourcemap: true,
  sourcesContent: false,
});

await build({
  ...shared,
  outfile: outMinJs,
  minify: true,
});

const [dts] = generateDtsBundle(
  [{ filePath: entry, output: { noBanner: true } }],
  { preferredConfigPath: join(packageDir, 'tsconfig.json') },
);

writeFileSync(outDts, dts);

stdout.write(`Bundled ${outJs}\nBundled ${outMinJs}\nBundled ${outDts}\n`);
