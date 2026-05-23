# InChI monorepo notes for Claude

Monorepo with two workspaces:

- `packages/inchi-js/` — the published library. Wraps the IUPAC InChI C
  library compiled to WASM. The WASM binary is gzip+base64-embedded in
  `src/wasm-data.ts` so the npm package is fully self-contained — no
  fetch, no external file. The build script that produces that file
  needs `emcc` (emscripten) and `cmake`.
- `packages/inchi.cheminfo.org/` — React + Vite + BlueprintJS + react-ocl
  playground. Reads `inchi-js` via the workspace.

`vendor/inchi/` is a git submodule pointing at
[`IUPAC-InChI/InChI`](https://github.com/IUPAC-InChI/InChI). When the
build script compiles the WASM it pulls C sources from
`vendor/inchi/INCHI-1-SRC/INCHI_BASE/src/*.c` and
`vendor/inchi/INCHI-1-SRC/INCHI_API/libinchi/src/*.c`, links them with
the local `packages/inchi-js/build/inchi_web.c` JSON wrapper, and emits
a `.wasm` that is then embedded.

The C wrapper layer exports four functions to JS, each returning a JSON
string the JS side parses:

- `inchi_from_molfile(molfile, options)`
- `inchikey_from_inchi(inchi)`
- `molfile_from_inchi(inchi, options)`
- `molfile_from_auxinfo(auxinfo, bDoNotAddH, bDiffUnkUndfStereo)`

The TypeScript layer in `packages/inchi-js/src/` exposes these as four
async functions: `inchiFromMolfile`, `inchikeyFromInchi`,
`molfileFromInchi`, `molfileFromAuxinfo`.

WASM is instantiated lazily on first call and cached.

The lib is shipped as a single bundled ESM file. `npm run tsc` (in
`packages/inchi-js/`) runs `build/bundle.js`, which uses `esbuild` to
produce `lib/inchi-js.js` (+ `.js.map`) plus a minified
`lib/inchi-js.min.js`, and `dts-bundle-generator` to produce
`lib/inchi-js.d.ts`. The published npm package contains only those
four files plus `package.json` / `README.md` / `LICENSE`.

The library targets the browser. Emscripten is invoked with
`-sENVIRONMENT=web`, so the generated `src/wasm-glue.ts` contains no
Node-only code paths. Decompression uses `DecompressionStream` and
base64 decoding uses `atob` — both standard Web APIs available in
every supported browser and in Node ≥ 18.
