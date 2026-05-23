import { decode } from 'uint8-base64';

import { wasmBase64 } from './data.ts';
import inchiModule from './glue.ts';

/* eslint-disable @typescript-eslint/naming-convention -- Emscripten exported names */
interface InchiModule {
  ccall: (
    name: string,
    returnType: string | null,
    argTypes: string[],
    args: unknown[],
  ) => unknown;
  _free: (ptr: number) => void;
  UTF8ToString: (ptr: number) => string;
}
/* eslint-enable @typescript-eslint/naming-convention */

let modulePromise: Promise<InchiModule> | undefined;

/**
 * Loads and instantiates the InChI WebAssembly module. Calling this
 * multiple times returns the same cached instance.
 * @returns The Emscripten `Module` object for the InChI WASM build.
 */
export function loadInchiWasm(): Promise<InchiModule> {
  if (modulePromise !== undefined) return modulePromise;
  modulePromise = (async () => {
    const wasmBinary = await decompressWasm(wasmBase64);
    const module = (await (
      inchiModule as unknown as (opts: {
        wasmBinary: Uint8Array;
      }) => Promise<InchiModule>
    )({ wasmBinary })) satisfies InchiModule;
    return module;
  })();
  return modulePromise;
}

async function decompressWasm(base64: string): Promise<Uint8Array> {
  const compressed = decode(new TextEncoder().encode(base64));
  const stream = new Blob([compressed as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Calls a wrapped C function that returns a JSON string pointer and
 * decodes the result. The returned pointer is freed before returning.
 * @param name - Exported C function name (without leading underscore).
 * @param argTypes - Emscripten-style argument types for `ccall`.
 * @param args - Argument values to pass to `ccall`.
 * @returns The JSON-decoded result.
 */
export async function callJsonReturning<T>(
  name: string,
  argTypes: string[],
  args: unknown[],
): Promise<T> {
  const module = await loadInchiWasm();
  const ptr = module.ccall(name, 'number', argTypes, args) as number;
  if (ptr === 0) {
    throw new Error(`InChI WASM: ${name} returned a null pointer`);
  }
  try {
    const json = module.UTF8ToString(ptr);
    return JSON.parse(json) as T;
  } finally {
    module._free(ptr);
  }
}
