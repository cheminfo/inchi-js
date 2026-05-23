import { defineConfig, globalIgnores } from 'eslint/config';
import cheminfo from 'eslint-config-cheminfo-typescript';

export default defineConfig([
  globalIgnores([
    'coverage',
    'lib',
    'src/wasm/data.ts',
    'src/wasm/glue.ts',
    'build/out',
  ]),
  ...cheminfo,
  {
    // The Emscripten runtime exposes mixed-case method names like
    // `UTF8ToString` that are not constructors. Cheminfo's default
    // `new-cap` rule treats them as misuse, so loosen it here.
    rules: { 'new-cap': ['error', { capIsNew: false }] },
  },
]);
