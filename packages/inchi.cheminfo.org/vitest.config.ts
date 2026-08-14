import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
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
