import { defineConfig, globalIgnores } from 'eslint/config';
import cheminfoReact from 'eslint-config-cheminfo-react';
import cheminfoTs from 'eslint-config-cheminfo-typescript';
import globals from 'globals';

export default defineConfig(
  globalIgnores([
    '**/coverage',
    '**/lib',
    '**/dist',
    '**/node_modules',
    'vendor',
    'packages/inchi-js/build/out',
    'packages/inchi-js/src/wasm/data.ts',
    'packages/inchi-js/src/wasm/glue.ts',
    // Standalone CommonJS reproducer meant to be pasted into an upstream
    // openchemlib issue; it must stay runnable outside this repo.
    'packages/inchi.cheminfo.org/bug-report/reproduce.js',
  ]),
  ...cheminfoTs,
  {
    // The Emscripten runtime and openchemlib expose mixed-case method
    // names like `UTF8ToString` that are not constructors.
    rules: { 'new-cap': ['error', { capIsNew: false }] },
  },
  {
    files: ['packages/inchi-js/**', 'packages/inchi-api/**'],
    languageOptions: { globals: globals.nodeBuiltin },
  },
  {
    files: ['packages/inchi.cheminfo.org/**/*.{ts,tsx,js,jsx}'],
    extends: cheminfoReact,
    languageOptions: {
      globals: {
        // Build-time constants injected by vite.config.ts via `define`.
        __INCHI_JS_VERSION__: 'readonly',
        __INCHI_JS_MIN_SIZE__: 'readonly',
        __INCHI_JS_FULL_SIZE__: 'readonly',
      },
    },
  },
  {
    // The Vite build-time `define` constants must use the `__NAME__`
    // convention to be globally replaced.
    files: ['packages/inchi.cheminfo.org/**/*.d.ts'],
    rules: { '@typescript-eslint/naming-convention': 'off' },
  },
  {
    // Rollup invokes plugin hooks with the PluginContext as `this`;
    // `this.emitFile` and `this.warn` have no standalone equivalent.
    files: ['**/vite.config.ts'],
    rules: { 'unicorn/no-this-outside-of-class': 'off' },
  },
);
