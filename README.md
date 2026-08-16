# inchi-js

[![NPM version](https://img.shields.io/npm/v/inchi-js.svg)](https://www.npmjs.com/package/inchi-js)
[![npm download](https://img.shields.io/npm/dm/inchi-js.svg)](https://www.npmjs.com/package/inchi-js)
[![license](https://img.shields.io/npm/l/inchi-js.svg)](https://github.com/cheminfo/inchi-js/blob/main/LICENSE)

A self-contained TypeScript wrapper around the official
[IUPAC InChI](https://www.inchi-trust.org/) C library compiled to
WebAssembly. Convert MDL Molfiles to InChI/InChIKey and back, in Node
and in the browser, without any external file or fetch — the WASM
binary is gzip-compressed and base64-embedded inside the package.

Try it in the browser on [inchi.cheminfo.org](https://inchi.cheminfo.org)
— the playground, its file-conversion API and their sources live in
[cheminfo/inchi.cheminfo.org](https://github.com/cheminfo/inchi.cheminfo.org).

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

const ethanol = `
  Mrv2014 01010100002D

  3  2  0  0  0  0            999 V2000
    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    2.0000    0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
  2  3  1  0  0  0  0
M  END
`;

const { inchi } = await inchiFromMolfile(ethanol);
// → 'InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3'

const { inchikey } = await inchikeyFromInchi(inchi);
// → 'LFQSCWFLJHTTHZ-UHFFFAOYSA-N'

const { molfile } = await molfileFromInchi(inchi);
// → reconstructed Molfile
```

## API

Every conversion is `async` because the WASM module is initialised
lazily on first call (and cached forever after).

### `inchiFromMolfile(molfile, options?)`

```ts
inchiFromMolfile(molfile: string, options?: {
  /** Raw InChI option string, e.g. '-AuxNone -DoNotAddH'. Default: '' */
  options?: string;
}): Promise<{
  returnCode: -1 | 0 | 1;
  inchi: string;
  auxinfo: string;
  message: string;
  log: string;
}>;
```

Wraps `MakeINCHIFromMolfileText`. `returnCode === 0` means success;
`1` is a warning (the result is still usable, see `message`/`log`);
`-1` is an error.

The InChI option string is documented in the IUPAC InChI
[Technical Manual](https://www.inchi-trust.org/download/104/InChI_TechMan.pdf).
Common options include `-AuxNone`, `-DoNotAddH`, `-FixedH`, `-RecMet`,
`-SUU`, `-SLUUD`.

### `inchikeyFromInchi(inchi)`

```ts
inchikeyFromInchi(inchi: string): Promise<{
  returnCode: -1 | 0 | 1;
  inchikey: string;
  message: string;
}>;
```

Wraps `GetINCHIKeyFromINCHI`. Returns the 27-character InChIKey for a
given InChI string.

### `molfileFromInchi(inchi, options?)`

```ts
molfileFromInchi(inchi: string, options?: {
  options?: string;
}): Promise<{
  returnCode: -1 | 0 | 1;
  molfile: string;
  message: string;
  log: string;
}>;
```

Wraps `GetStructFromINCHIEx` + `GetINCHIEx` with `-OutputSDF`.
Reconstructs an MDL Molfile from an InChI string.

### `molfileFromAuxinfo(auxinfo, options?)`

```ts
molfileFromAuxinfo(auxinfo: string, options?: {
  /** Do not add explicit hydrogens. Default: false */
  doNotAddH?: boolean;
  /** Differentiate "unknown" from "undefined" stereo. Default: false */
  diffUnkUndfStereo?: boolean;
}): Promise<{
  returnCode: -1 | 0 | 1;
  molfile: string;
  message: string;
  log: string;
}>;
```

Wraps `Get_inchi_Input_FromAuxInfo`. The MDL chiral flag stored in the
AuxInfo is preserved when emitting the Molfile.

### `structureFromInchi(inchi, options?)`

```ts
structureFromInchi(inchi: string, options?: {
  /** Raw option string passed verbatim to `GetStructFromINCHIEx`. Default: '' */
  options?: string;
}): Promise<{
  returnCode: -1 | 0 | 1;
  atoms: StructureAtom[];
  stereo: StructureStereo[];
  message: string;
  log: string;
}>;
```

Wraps `GetStructFromINCHIEx` and returns the raw connection table —
atoms with their adjacency lists and the 0D stereo descriptors —
without going through a Molfile.

### `oclMoleculeFromInchi(inchi, OCL, options?)`

```ts
oclMoleculeFromInchi(inchi: string, OCL: typeof import('openchemlib'), options?: {
  options?: string;
}): Promise<{
  molecule: Molecule | null;
  returnCode: -1 | 0 | 1;
  message: string;
  log: string;
}>;
```

Builds an [openchemlib](https://github.com/cheminfo/openchemlib-js)
`Molecule` (with 2D coordinates and wedge bonds) from an InChI.
`openchemlib` is an **optional** peer dependency: the module is passed
in by the caller, so a project that never calls this function does not
have to install it.

```ts
import * as OCL from 'openchemlib';
import { oclMoleculeFromInchi } from 'inchi-js';

const { molecule } = await oclMoleculeFromInchi('InChI=1S/H2O/h1H2', OCL);
```

`oclMoleculeFromStructure(structure, OCL)` does the same conversion
from an already-parsed `structureFromInchi` result.

### `loadInchiWasm()`

Eagerly preloads the WASM module so the first conversion isn't slowed
by the (one-time, ~100ms) instantiation. Returns the underlying
Emscripten `Module` object.

```ts
import { loadInchiWasm } from 'inchi-js';

await loadInchiWasm();
```

## How the WASM binary is shipped

The library is intentionally fetch-free. At build time
([build/build-wasm.sh](build/build-wasm.sh)):

1. The IUPAC InChI C source from `vendor/inchi/INCHI-1-SRC/{INCHI_BASE,INCHI_API/libinchi}/src/*.c`
   is linked with [`build/inchi_web.c`](build/inchi_web.c) (a JSON-emitting
   wrapper adapted from
   [`IUPAC-InChI/InChI-Web-Demo`](https://github.com/IUPAC-InChI/InChI-Web-Demo))
   via Emscripten + CMake.
2. The resulting `inchi.wasm` is gzip-compressed (`level: 9`) and
   base64-encoded into [`src/wasm/data.ts`](src/wasm/data.ts).
3. The Emscripten JS glue is rewritten as an ES module in
   [`src/wasm/glue.ts`](src/wasm/glue.ts) and the factory function is
   given the decoded bytes via the `wasmBinary` option — bypassing
   `fetch` entirely. The runtime bridge that decodes the bytes and
   instantiates the module lives in [`src/wasm/loadWasm.ts`](src/wasm/loadWasm.ts).

The generated `data.ts` and `glue.ts` files are committed, so
consumers never need a C toolchain.

## Test coverage vs. the upstream IUPAC suite

`npm test` runs the full upstream IUPAC test corpus against the
WebAssembly build, in addition to the small canonical tests under
[`src/__tests__/`](src/__tests__/):

| Folder                                                                                                           | Mirrors                                                | Coverage                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`__tests__/regression/inchiSdf.test.ts`](src/__tests__/regression/inchiSdf.test.ts)                             | `INCHI-1-TEST/tests/test_library/data/ci/inchi.sdf.gz` | 2,190 structures — every InChI must equal the reference SQLite snapshot, plus InChIKey parity on the first 100. Honors the upstream `expected_failures` list (4 known regressions). |
| [`__tests__/regression/mculeSdf.test.ts`](src/__tests__/regression/mculeSdf.test.ts)                             | `INCHI-1-TEST/tests/test_library/data/ci/mcule.sdf.gz` | 2,000 mcule.com structures vs. the reference SQLite snapshot.                                                                                                                       |
| [`__tests__/executable/github52.test.ts`](src/__tests__/executable/github52.test.ts)                             | `test_executable/test_github_52.py`                    | V3000 empty bond block parsing.                                                                                                                                                     |
| [`__tests__/executable/testIo.test.ts`](src/__tests__/executable/testIo.test.ts)                                 | `test_executable/test_io.py`                           | V3000 I/O edge cases: SCSR rejection, >999-atom rejection, `-LargeMolecules` switch, 999-atom acceptance.                                                                           |
| [`__tests__/executable/organometallicsPubchem.test.ts`](src/__tests__/executable/organometallicsPubchem.test.ts) | `test_executable/test_organometallics_pubchem.py`      | Every structure in the PubChem organometallics fixture must yield an InChI under `-RecMet`.                                                                                         |
| [`__tests__/executable/aromaticIons.test.ts`](src/__tests__/executable/aromaticIons.test.ts)                     | `test_executable/test_aromatic_ions.py`                | Three aromatic-bond cation/anion cases — `xfail` in upstream and here (`test.fails`).                                                                                               |

**Out of scope:** the upstream
[`INCHI-1-TEST/tests/test_unit/`](https://github.com/IUPAC-InChI/InChI/tree/dev/INCHI-1-TEST/tests/test_unit)
C++ unit tests (`test_strutil.cpp`, `test_ichican2.cpp`, …) exercise
internal C functions that are not part of the public InChI API
exposed via WebAssembly, and would require a separate native build.
The upstream `test_executable` cases that depend on InChI CLI stderr
parsing (`test_alex_clark_structures`, `test_organometallics_ccdc`,
`test_github_67`, `test_github_40`, `test_pubchem_107`) are all marked
`xfail` upstream and are skipped here as well — they document broken
behavior rather than asserted invariants.

## Benchmark vs. the native `inchi-1` binary

[`benchmark/bench-inchi.ts`](benchmark/bench-inchi.ts) runs the WASM
build against the official IUPAC `inchi-1` executable on the same
2,190-structure corpus used by the regression tests
(`vendor/inchi/INCHI-1-TEST/tests/test_library/data/ci/inchi.sdf.gz`,
avg ~3.7 KB / molfile). It reports three modes side by side:

1. **WASM, per molfile** — the realistic JS use case: one
   `inchiFromMolfile()` call per structure inside a single Node
   process.
2. **Native, batch** — the realistic CLI use case: one `inchi-1`
   process that walks the whole SDF.
3. **Native, per call** — for a 50-structure sample, spawn `inchi-1`
   once per molfile. This isolates the per-structure C kernel cost
   from process-startup overhead.

Results on an Apple M1 with `inchi-1` 1.07.5 and Node 26:

| Mode                                                      | ms / structure | structures / s |
| --------------------------------------------------------- | -------------- | -------------- |
| WASM `inchi-js`, per molfile                              | 0.69           | ~1,450         |
| Native `inchi-1`, batch (1 process for the whole SDF)     | 0.43           | ~2,325         |
| Native `inchi-1`, per molfile (separate process per call) | ~3.1           | ~320           |

- WASM is **~1.6× slower** than the native binary running in batch mode.
- Spawning `inchi-1` per molfile is **~7× slower** than batching — the
  per-call mode exists to make that anti-pattern visible.
- **2,188 / 2,190 InChIs match** the native binary byte-for-byte; the
  two differences correspond to the known upstream regressions
  documented in
  [inchiSdf.test.ts](src/__tests__/regression/inchiSdf.test.ts).
- WASM cold start (module instantiation + gzip decompression) is
  ~60 ms and only paid once per process.

Run it with:

```bash
npm run benchmark                                  # full 2,190-structure corpus
node benchmark/bench-inchi.ts <sdf-path> [limit]   # custom corpus / limit
INCHI_BIN=/path/to/inchi-1 npm run benchmark       # use a specific native binary
```

## Working on the library

The IUPAC InChI C source is a git submodule under
[`vendor/inchi/`](vendor/inchi/), pinned to a known commit of
[`IUPAC-InChI/InChI`](https://github.com/IUPAC-InChI/InChI). It carries
both the C sources the WASM is compiled from and the reference corpora
the regression tests run against, so a checkout needs it:

```bash
git clone --recurse-submodules https://github.com/cheminfo/inchi-js.git
# or, in an existing clone:
git submodule update --init --recursive
```

| Command               | Effect                                                                     |
| --------------------- | -------------------------------------------------------------------------- |
| `npm run test-only`   | The vitest suite, including the IUPAC regression corpora.                  |
| `npm test`            | Tests, the same suite against the bundle, type-check, eslint and prettier. |
| `npm run tsc`         | Bundle `src/` into `lib/` (ESM + minified + `.d.ts`).                      |
| `npm run test-bundle` | Run the suite against `lib/inchi-js.js` instead of the source.             |
| `npm run build-wasm`  | Rebuild the embedded WASM from `vendor/inchi/` (needs emscripten + cmake). |
| `npm run benchmark`   | Compare the WASM build with the native `inchi-1` binary.                   |

The suite needs Node 22 or later: the regression references are read
with `node:sqlite`.

## Rebuilding the WASM

You only need this if you bump the InChI C version or change
`build/inchi_web.c`. Requirements:

- [Emscripten](https://emscripten.org/) ≥ 3 (`emcc`, `emcmake`)
- CMake ≥ 3.15

```bash
git submodule update --init --recursive
npm run build-wasm    # rebuilds src/wasm/data.ts + src/wasm/glue.ts
npm run tsc           # recompiles the lib/ output
npm test              # runs the test suite to verify
```

## License

MIT — Copyright (c) cheminfo. See [LICENSE](./LICENSE) for the full
text and the acknowledgement of the bundled IUPAC InChI software
(also MIT, Copyright (c) 2024 InChI Project).
