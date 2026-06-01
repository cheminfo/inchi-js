# inchi

A self-contained TypeScript wrapper around the official
[IUPAC InChI](https://www.inchi-trust.org/) C library compiled to
WebAssembly. Convert MDL Molfiles to InChI/InChIKey and back, in Node
and in the browser, without any external file or fetch — the WASM
binary is gzip-compressed and base64-embedded inside the package.

The published library lives in
[`packages/inchi-js/`](packages/inchi-js/) and is released to npm as
[`inchi-js`](https://www.npmjs.com/package/inchi-js).

## Installation

```bash
npm install inchi-js
```

## Quick start

```ts
import {
  inchiFromMolfile,
  inchikeyFromInchi,
  molfileFromInchi,
} from 'inchi-js';

const molfile = `\
  Mrv2014 01010100002D

  3  2  0  0  0  0            999 V2000
    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    2.0000    0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
  2  3  1  0  0  0  0
M  END
`;

const { inchi, auxinfo } = await inchiFromMolfile(molfile);
// → 'InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3'

const { inchikey } = await inchikeyFromInchi(inchi);
// → 'LFQSCWFLJHTTHZ-UHFFFAOYSA-N'

const { molfile: regenerated } = await molfileFromInchi(inchi);
```

All four conversion functions — `inchiFromMolfile`,
`inchikeyFromInchi`, `molfileFromInchi`, and `molfileFromAuxinfo` — are
`async`: the WASM module is instantiated lazily on first call and
cached forever after. See
[`packages/inchi-js/README.md`](packages/inchi-js/README.md) for the
full API reference, option strings, and details on how the WASM binary
is shipped.

## InChI source

The official IUPAC InChI C library lives as a git submodule under
[`vendor/inchi/`](vendor/inchi/), pinned to a known commit of
[`IUPAC-InChI/InChI`](https://github.com/IUPAC-InChI/InChI). Clone with:

```bash
git clone --recurse-submodules https://github.com/cheminfo/inchi.git
# or if you already cloned:
git submodule update --init --recursive
```

## Working on the library

```bash
npm install
npm test            # type-check, lint, and run the test suite
```

The library source is in [`packages/inchi-js/src/`](packages/inchi-js/src/).
`npm run build-lib` compiles it to `packages/inchi-js/lib`.

## Building the WASM module

The library ships with a pre-built, base64-embedded WASM module at
[`packages/inchi-js/src/wasm/data.ts`](packages/inchi-js/src/wasm/data.ts).
To rebuild it from the InChI C source you need
[Emscripten](https://emscripten.org/) (`emcc`) and `cmake` ≥ 3.15:

```bash
npm run build-wasm
```

This:

1. Configures and compiles `vendor/inchi/INCHI-1-SRC/INCHI_BASE` and
   `vendor/inchi/INCHI-1-SRC/INCHI_API/libinchi` plus the IUPAC
   `inchi_web.c` JSON wrapper with `emcc` into a `.wasm` + JS glue.
2. Gzips and base64-encodes the resulting `.wasm` binary into
   `packages/inchi-js/src/wasm/data.ts` (next to the auto-generated JS
   glue at `packages/inchi-js/src/wasm/glue.ts`).
3. Generates a TypeScript module that decodes + decompresses the
   binary at load time and instantiates a WebAssembly instance.

The pre-built artifact is checked in so consumers of the npm package
never need a C toolchain.

## Scripts

| Command              | Effect                                                                      |
| -------------------- | --------------------------------------------------------------------------- |
| `npm run build-lib`  | Compile the library to `packages/inchi-js/lib`.                             |
| `npm run build-wasm` | Rebuild the WASM module from `vendor/inchi/` (requires emscripten + cmake). |
| `npm test`           | `vitest run --coverage` + type-check + eslint + prettier.                   |
| `npm run test-only`  | Tests only, skip lint/types.                                                |

## Credits

This library is a thin TypeScript wrapper around the official IUPAC
InChI C software (MIT-licensed). The `inchi_web.c` JSON-emitting
wrapper layer and the emscripten build approach are adapted from
[`IUPAC-InChI/InChI-Web-Demo`](https://github.com/IUPAC-InChI/InChI-Web-Demo)
(also MIT). All trademarks and the InChI algorithm itself belong to
IUPAC.
