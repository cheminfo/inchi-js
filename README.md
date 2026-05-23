# inchi

Monorepo for the IUPAC InChI WebAssembly engine: a TypeScript library
that wraps the official IUPAC InChI C library compiled to WebAssembly,
plus an interactive web playground using react-ocl.

## Packages

| Path                                                       | Name                  | Published as | Purpose                                                                                                       |
| ---------------------------------------------------------- | --------------------- | ------------ | ------------------------------------------------------------------------------------------------------------- |
| [`packages/inchi-js/`](packages/inchi-js/)                 | `inchi-js`            | npm          | The WASM-backed engine. Converts Molfile ↔ InChI ↔ InChIKey. Self-contained — WASM is base64-embedded.        |
| [`packages/inchi.cheminfo.org/`](packages/inchi.cheminfo.org/) | `inchi.cheminfo.org` | static site  | Interactive playground (React + react-ocl) for the library.                                                   |

## InChI source

The official IUPAC InChI C library lives as a git submodule under
[`vendor/inchi/`](vendor/inchi/), pinned to a known commit of
[`IUPAC-InChI/InChI`](https://github.com/IUPAC-InChI/InChI). Clone with:

```bash
git clone --recurse-submodules https://github.com/cheminfo/inchi.git
# or if you already cloned:
git submodule update --init --recursive
```

## Local development

```bash
npm install
npm run dev
```

Vite serves the website at `http://localhost:5173/`. The library is
resolved directly from `packages/inchi-js/src/index.ts` via a vite
alias, so edits to the engine show up live.

## Building the WASM module

The library ships with a pre-built, base64-embedded WASM module at
[`packages/inchi-js/src/wasm-data.ts`](packages/inchi-js/src/wasm-data.ts).
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
   `packages/inchi-js/src/wasm-data.ts`.
3. Generates a TypeScript module that decodes + decompresses the
   binary at load time and instantiates a WebAssembly instance.

The pre-built artifact is checked in so consumers of the npm package
never need a C toolchain.

## Scripts

| Command               | Effect                                                                       |
| --------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`         | Start the playground (vite dev server).                                      |
| `npm run build`       | Build the library and the playground production bundle.                       |
| `npm run build-lib`   | Compile the library to `packages/inchi-js/lib`.                              |
| `npm run build-wasm`  | Rebuild the WASM module from `vendor/inchi/` (requires emscripten + cmake).   |
| `npm test`            | Per-workspace `vitest run --coverage` + type-check + eslint + prettier.      |
| `npm run test-only`   | Tests only, skip lint/types.                                                  |

## Library quick start

```ts
import { inchiFromMolfile, inchikeyFromInchi, molfileFromInchi } from 'inchi-js';

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

See [`packages/inchi-js/README.md`](packages/inchi-js/README.md) for
the full library docs.

## Credits

This library is a thin TypeScript wrapper around the official IUPAC
InChI C software (MIT-licensed). The `inchi_web.c` JSON-emitting
wrapper layer and the emscripten build approach are adapted from
[`IUPAC-InChI/InChI-Web-Demo`](https://github.com/IUPAC-InChI/InChI-Web-Demo)
(also MIT). All trademarks and the InChI algorithm itself belong to
IUPAC.
