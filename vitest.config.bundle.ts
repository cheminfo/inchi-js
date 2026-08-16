// Runs the test suite against the built `lib/inchi-js.js` bundle
// instead of the TypeScript source. Aliases the five wrapper imports
// (`../inchiFromMolfile.ts`, `../inchikeyFromInchi.ts`, etc.) to the
// bundle so that every existing test case exercises the artifact that
// will be published to npm. `npm run tsc` must run first.

import { join } from 'node:path';

import { defineConfig } from 'vitest/config';

const bundlePath = join(import.meta.dirname, 'lib/inchi-js.js');

export default defineConfig({
  test: {
    snapshotFormat: {
      maxOutputLength: Number.MAX_SAFE_INTEGER,
    },
  },
  resolve: {
    alias: [
      {
        find: /^(?:\.\.\/){1,2}(?:inchiFromMolfile|inchikeyFromInchi|molfileFromInchi|molfileFromAuxinfo|structureFromInchi)\.ts$/,
        replacement: bundlePath,
      },
    ],
  },
});
