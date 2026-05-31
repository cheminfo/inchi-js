import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig, loadEnv } from 'vite';

const here = import.meta.dirname;
const repoRoot = join(here, '..', '..');
const inchiJsDir = join(repoRoot, 'packages', 'inchi-js');
const inchiJsPkg = JSON.parse(
  readFileSync(join(inchiJsDir, 'package.json'), 'utf8'),
) as { version: string };

const libSrc = fileURLToPath(
  new URL('../inchi-js/src/index.ts', import.meta.url),
);

/** Gzipped SDF test fixtures vendored under `vendor/inchi/`. */
const TEST_DATASETS: Record<string, string> = {
  'inchi.sdf.gz':
    'vendor/inchi/INCHI-1-TEST/tests/test_library/data/ci/inchi.sdf.gz',
  'mcule.sdf.gz':
    'vendor/inchi/INCHI-1-TEST/tests/test_library/data/ci/mcule.sdf.gz',
  'alex_clark_structures.sdf.gz':
    'vendor/inchi/INCHI-1-TEST/tests/test_executable/data/alex_clark_structures.sdf.gz',
  'organometallic_structures_CCDC.sdf.gz':
    'vendor/inchi/INCHI-1-TEST/tests/test_executable/data/organometallic_structures_CCDC.sdf.gz',
  'organometallic_structures_pubchem.sdf.gz':
    'vendor/inchi/INCHI-1-TEST/tests/test_executable/data/organometallic_structures_pubchem.sdf.gz',
  'test_io.sdf.gz':
    'vendor/inchi/INCHI-1-TEST/tests/test_executable/data/test_io.sdf.gz',
};

/** Pre-built single-file `inchi-js` assets exposed for direct download. */
const DOWNLOAD_ASSETS: Record<string, string> = {
  'inchi-js.js': 'packages/inchi-js/lib/inchi-js.js',
  'inchi-js.min.js': 'packages/inchi-js/lib/inchi-js.min.js',
  'inchi-js.d.ts': 'packages/inchi-js/lib/inchi-js.d.ts',
};

/**
 * Serve the vendored IUPAC test SDFs at `/test-data/<name>` so the
 * Roundtrip panel can fetch them. In dev mode they stream directly
 * from the submodule; for production builds they are emitted into
 * `dist/test-data/` as static assets.
 */
function vendorTestDataPlugin(): Plugin {
  return {
    name: 'vendor-test-data',
    configureServer(server) {
      server.middlewares.use('/test-data', (req, res, next) => {
        const rawName = req.url?.replace(/^\//, '').replace(/\?.*$/, '');
        if (!rawName) return next();
        const sub = TEST_DATASETS[rawName];
        if (sub === undefined) return next();
        const filepath = join(repoRoot, sub);
        if (!existsSync(filepath)) return next();
        const buf = readFileSync(filepath);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Cache-Control', 'max-age=3600');
        res.end(buf);
      });
    },
    generateBundle() {
      for (const [name, sub] of Object.entries(TEST_DATASETS)) {
        const filepath = join(repoRoot, sub);
        if (!existsSync(filepath)) {
          this.warn(`Test dataset not available: ${name}`);
          continue;
        }
        this.emitFile({
          type: 'asset',
          fileName: `test-data/${name}`,
          source: readFileSync(filepath),
        });
      }
    },
  };
}

/**
 * Serve the prebuilt single-file `inchi-js` library at
 * `/lib/<name>` so the Download tab can offer it as a direct
 * `<script type="module">`-ready asset. Also emits a standalone
 * `embed-example.html` that imports the bundle and runs a minimal
 * Molfile → InChI / InChIKey roundtrip — the file users land on
 * after clicking "Open live example".
 */
function downloadPlugin(): Plugin {
  return {
    name: 'inchi-js-download',
    configureServer(server) {
      server.middlewares.use('/lib', (req, res, next) => {
        const rawName = req.url?.replace(/^\//, '').replace(/\?.*$/, '');
        if (!rawName) return next();
        const sub = DOWNLOAD_ASSETS[rawName];
        if (sub === undefined) return next();
        const filepath = join(repoRoot, sub);
        if (!existsSync(filepath)) return next();
        const buf = readFileSync(filepath);
        res.setHeader(
          'Content-Type',
          rawName.endsWith('.d.ts')
            ? 'text/plain; charset=utf-8'
            : 'application/javascript; charset=utf-8',
        );
        res.setHeader('Cache-Control', 'max-age=300');
        res.end(buf);
      });
      server.middlewares.use('/embed-example.html', (_req, res, next) => {
        try {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(embedExampleHtml('./lib/inchi-js.min.js'));
        } catch {
          next();
        }
      });
    },
    generateBundle() {
      for (const [name, sub] of Object.entries(DOWNLOAD_ASSETS)) {
        const filepath = join(repoRoot, sub);
        if (!existsSync(filepath)) {
          this.warn(
            `inchi-js bundle missing: ${name} — run "npm run tsc" in packages/inchi-js`,
          );
          continue;
        }
        this.emitFile({
          type: 'asset',
          fileName: `lib/${name}`,
          source: readFileSync(filepath),
        });
      }
      this.emitFile({
        type: 'asset',
        fileName: 'embed-example.html',
        source: embedExampleHtml('./lib/inchi-js.min.js'),
      });
    },
  };
}

/**
 * Build the standalone `embed-example.html` shown to users from the
 * Download tab. It deliberately uses a relative module URL so the
 * very same file works whether opened on inchi.cheminfo.org, on a
 * local Vite dev server, or from a copy dropped on any static host
 * next to its `lib/` directory.
 * @param scriptUrl - The URL of the embedded ESM bundle (relative or
 *   absolute) to import inside the example.
 * @returns The full HTML document source.
 */
function embedExampleHtml(scriptUrl: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>inchi-js embed example</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        max-width: 720px;
        margin: 32px auto;
        padding: 0 16px;
        color: #1c2127;
      }
      h1 { font-size: 20px; margin-bottom: 4px; }
      .muted { color: #5f6b7c; font-size: 13px; }
      textarea {
        width: 100%; min-height: 220px; font-family: ui-monospace, monospace;
        font-size: 12px; padding: 8px; box-sizing: border-box;
      }
      button {
        background: #2d72d2; color: white; border: none; padding: 8px 14px;
        border-radius: 4px; cursor: pointer; font-size: 14px;
      }
      button:disabled { opacity: 0.6; cursor: not-allowed; }
      pre {
        background: #f6f7f9; padding: 12px; border-radius: 4px;
        overflow-x: auto; font-size: 12px;
      }
      .row { display: flex; gap: 8px; margin: 12px 0; align-items: center; }
      code { background: #f6f7f9; padding: 1px 5px; border-radius: 3px; }
    </style>
  </head>
  <body>
    <h1>inchi-js — minimal embed example</h1>
    <p class="muted">
      This page imports the single-file ESM bundle of
      <code>inchi-js</code> directly with a
      <code>&lt;script type="module"&gt;</code> — no bundler, no build
      step. The WASM is base64-embedded inside the file, so the page
      makes no extra network request.
    </p>

    <label for="molfile"><strong>Molfile (V2000 or V3000)</strong></label>
    <textarea id="molfile">

  Mrv1810 01010000002D

  3  2  0  0  0  0            999 V2000
    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.0000    0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
    2.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
  2  3  1  0  0  0  0
M  END
</textarea>

    <div class="row">
      <button id="run" disabled>Loading WASM…</button>
      <span class="muted">Uses <code>inchiFromMolfile</code> + <code>inchikeyFromInchi</code>.</span>
    </div>

    <h3>InChI</h3>
    <pre id="inchi-out">—</pre>

    <h3>InChIKey</h3>
    <pre id="inchikey-out">—</pre>

    <script type="module">
      import {
        inchiFromMolfile,
        inchikeyFromInchi,
        INCHI_C_VERSION,
      } from '${scriptUrl}';

      const button = document.getElementById('run');
      const molfileEl = document.getElementById('molfile');
      const inchiOut = document.getElementById('inchi-out');
      const inchikeyOut = document.getElementById('inchikey-out');

      button.textContent = 'Compute InChI (IUPAC v' + INCHI_C_VERSION + ')';
      button.disabled = false;

      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          const { inchi, message } = await inchiFromMolfile(molfileEl.value, { options: '' });
          inchiOut.textContent = inchi || ('(no InChI — ' + (message || 'unknown') + ')');
          if (inchi) {
            const { inchikey } = await inchikeyFromInchi(inchi);
            inchikeyOut.textContent = inchikey;
          } else {
            inchikeyOut.textContent = '—';
          }
        } catch (error) {
          inchiOut.textContent = 'Error: ' + (error && error.message || error);
          inchikeyOut.textContent = '—';
        } finally {
          button.disabled = false;
        }
      });
    </script>
  </body>
</html>
`;
}

function bundleSize(file: string): number {
  const filepath = join(repoRoot, file);
  try {
    return statSync(filepath).size;
  } catch {
    return 0;
  }
}

export default defineConfig(({ mode }) => {
  // Load `.env` from the monorepo root (where the shared PORT lives) so the
  // dev server can bind the same port the Docker deployment publishes.
  // The empty prefix loads every key, not just `VITE_`-prefixed ones.
  const env = loadEnv(mode, repoRoot, '');
  const port = Number(env.PORT) || 5173;

  return {
    base: process.env.BASE_PATH ?? '/',
    define: {
      __INCHI_JS_VERSION__: JSON.stringify(inchiJsPkg.version),
      __INCHI_JS_MIN_SIZE__: JSON.stringify(
        bundleSize('packages/inchi-js/lib/inchi-js.min.js'),
      ),
      __INCHI_JS_FULL_SIZE__: JSON.stringify(
        bundleSize('packages/inchi-js/lib/inchi-js.js'),
      ),
    },
    plugins: [react(), vendorTestDataPlugin(), downloadPlugin()],
    resolve: {
      alias: {
        'inchi-js': libSrc,
      },
    },
    server: {
      host: true,
      port,
    },
  };
});
