import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit tests live under `src/`; the Playwright specs in `e2e/` have their
    // own runner (`npm run test-e2e`) and must not be collected by vitest.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      provider: 'v8',
    },
    snapshotFormat: {
      maxOutputLength: Number.MAX_SAFE_INTEGER,
    },
    // Several files instantiate the InChI WASM; in parallel that can take
    // longer than the 5 s default on a loaded machine.
    testTimeout: 30_000,
  },
});
