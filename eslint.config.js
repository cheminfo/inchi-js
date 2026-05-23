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
    'packages/inchi-js/src/wasm-data.ts',
  ]),
  ...cheminfoTs,
  {
    rules: { 'new-cap': ['error', { capIsNew: false }] },
  },
  {
    files: ['packages/inchi.cheminfo.org/**/*.{ts,tsx,js,jsx}'],
    extends: cheminfoReact,
  },
  {
    files: ['packages/inchi-js/**'],
    languageOptions: { globals: globals.nodeBuiltin },
  },
);
