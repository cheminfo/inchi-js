import { expect, test } from 'vitest';

import { loadInchiWasm } from '../wasm/loadWasm.ts';

test('resolves to an Emscripten module and caches it', async () => {
  const module = await loadInchiWasm();

  expect(typeof module.ccall).toBe('function');
  expect(typeof module._free).toBe('function');
  expect(typeof module.UTF8ToString).toBe('function');
  await expect(loadInchiWasm()).resolves.toBe(module);
});

test('the module exposes the wrapped C functions', async () => {
  const module = await loadInchiWasm();
  const pointer = module.ccall(
    'inchikey_from_inchi',
    'number',
    ['string'],
    ['InChI=1S/H2O/h1H2'],
  ) as number;

  expect(pointer).not.toBe(0);

  const json = module.UTF8ToString(pointer);
  module._free(pointer);

  // The C wrapper emits snake_case JSON that the TypeScript layer maps
  // to camelCase.
  const parsed = JSON.parse(json) as Record<string, unknown>;

  expect(parsed.return_code).toBe(0);
  expect(parsed.inchikey).toBe('XLYOFNOQVPJJNP-UHFFFAOYSA-N');
  expect(parsed.message).toBe('');
});
