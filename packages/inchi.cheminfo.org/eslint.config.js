import { defineConfig, globalIgnores } from 'eslint/config';
import cheminfoReact from 'eslint-config-cheminfo-react';
import cheminfoTs from 'eslint-config-cheminfo-typescript';

export default defineConfig(
  globalIgnores(['coverage', 'dist']),
  ...cheminfoTs,
  {
    files: ['src/**/*.{ts,tsx}'],
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
    // convention to be globally replaced; the cheminfo naming rule
    // does not apply inside ambient declaration files.
    files: ['src/**/*.d.ts'],
    rules: {
      '@typescript-eslint/naming-convention': 'off',
    },
  },
);
