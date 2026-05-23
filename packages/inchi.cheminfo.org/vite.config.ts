import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const libSrc = fileURLToPath(
  new URL('../inchi-js/src/index.ts', import.meta.url),
);

const inchiJsPackageJson = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../inchi-js/package.json', import.meta.url)),
    'utf8',
  ),
) as { version: string };

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  define: {
    'import.meta.env.INCHI_JS_VERSION': JSON.stringify(
      inchiJsPackageJson.version,
    ),
  },
  plugins: [react()],
  resolve: {
    alias: {
      'inchi-js': libSrc,
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
