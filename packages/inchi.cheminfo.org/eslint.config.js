import { defineConfig, globalIgnores } from 'eslint/config';
import cheminfoReact from 'eslint-config-cheminfo-react';
import cheminfoTs from 'eslint-config-cheminfo-typescript';

export default defineConfig(
  globalIgnores(['coverage', 'dist']),
  ...cheminfoTs,
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: cheminfoReact,
  },
);
