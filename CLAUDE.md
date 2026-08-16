# inchi-js notes for Claude

Single-package public library. It wraps the IUPAC InChI C library
compiled to WASM. The WASM binary is gzip+base64-embedded in
`src/wasm/data.ts` (next to the auto-generated Emscripten JS glue at
`src/wasm/glue.ts` and the runtime bridge at `src/wasm/loadWasm.ts`) so
the npm package is fully self-contained — no fetch, no external file.
The build script that produces those files needs `emcc` (emscripten)
and `cmake`.

The playground and the HTTP file-conversion API that used to live in
this repository now have their own:
[cheminfo/inchi.cheminfo.org](https://github.com/cheminfo/inchi.cheminfo.org).
They consume this package from npm, so a change they depend on has to
be released here first.

`vendor/inchi/` is a git submodule pointing at
[`IUPAC-InChI/InChI`](https://github.com/IUPAC-InChI/InChI). The build
script pulls C sources from
`vendor/inchi/INCHI-1-SRC/INCHI_BASE/src/*.c` and
`vendor/inchi/INCHI-1-SRC/INCHI_API/libinchi/src/*.c`, links them with
the local `build/inchi_web.c` JSON wrapper, and emits a `.wasm` that is
then embedded. The submodule also carries the reference corpora the
regression tests read, so `npm run test-only` needs it checked out.

The C wrapper layer exports four functions to JS, each returning a JSON
string the JS side parses:

- `inchi_from_molfile(molfile, options)`
- `inchikey_from_inchi(inchi)`
- `molfile_from_inchi(inchi, options)`
- `molfile_from_auxinfo(auxinfo, bDoNotAddH, bDiffUnkUndfStereo)`

The TypeScript layer in `src/` exposes these as async functions:
`inchiFromMolfile`, `inchikeyFromInchi`, `molfileFromInchi`,
`molfileFromAuxinfo`, plus `structureFromInchi` and the openchemlib
helpers `oclMoleculeFromInchi` / `oclMoleculeFromStructure`.
`openchemlib` is an optional peer dependency used for types only — the
caller passes the module in.

WASM is instantiated lazily on first call and cached; `loadInchiWasm`
preloads it.

The lib is shipped as a single bundled ESM file. `npm run tsc` runs
`build/bundle.js`, which uses `esbuild` to produce `lib/inchi-js.js`
(+ `.js.map`) plus a minified `lib/inchi-js.min.js`, and
`dts-bundle-generator` to produce `lib/inchi-js.d.ts`. The published
npm package contains only those four files plus `package.json` /
`README.md` / `LICENSE`, which `src/__tests__/npmPack.test.ts` asserts.

The library targets the browser. Emscripten is invoked with
`-sENVIRONMENT=web`, so the generated `src/wasm/glue.ts` contains no
Node-only code paths. Decompression uses `DecompressionStream` and
base64 decoding uses `atob` — both standard Web APIs available in every
supported browser and in Node ≥ 18. The test suite itself needs Node
≥ 22, because it reads the regression references with `node:sqlite`.
