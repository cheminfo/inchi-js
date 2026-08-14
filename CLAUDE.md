# InChI monorepo notes for Claude

Monorepo with three workspaces:

- `packages/inchi-js/` — the published library. Wraps the IUPAC InChI C
  library compiled to WASM. The WASM binary is gzip+base64-embedded in
  `src/wasm/data.ts` (next to the auto-generated Emscripten JS glue at
  `src/wasm/glue.ts` and the runtime bridge at `src/wasm/loadWasm.ts`)
  so the npm package is fully self-contained — no fetch, no external
  file. The build script that produces those files needs `emcc`
  (emscripten) and `cmake`.
- `packages/inchi-api/` — Fastify HTTP API (private, deployed as a
  Docker image, not published to npm). Wraps `inchi-js` for single
  structures and for whole CSV / TSV / XLSX / SDF files, detecting the
  SMILES or molfile column on its own. Runs under Node's type stripping
  — there is no build step, `node src/index.ts` is the entrypoint.
  Reading uses `papaparse` / `exceljs` / `sdf-parser`, writing uses
  `papaparse` / `exceljs` / `sdf-creator`, and SMILES become molfiles
  through `openchemlib` (`Molecule.fromSmiles(...).toMolfile()`, which
  invents 2D coordinates and wedges so stereo survives). A molfile's
  first line is its title, which is often empty: never trim a molfile
  before handing it to the InChI API, or the whole connection table
  shifts up and the conversion fails. In production this same process
  also serves the built playground at `/` and its Swagger UI at
  `/documentation`, so the whole project is a single Docker image on a
  single origin (port `10523`) — there is no separate API host.
- `packages/inchi.cheminfo.org/` — React + Vite + BlueprintJS + react-ocl
  playground. Reads `inchi-js` via the workspace. The Vite dev server
  (`10524`) proxies `/v1`, `/health` and `/documentation` to the API so
  relative links behave in dev exactly as they do in the image. The page
  on show lives in the hash (`#/<tab>/<item>`); the query string carries
  what configures the shell rather than what feeds it — `embed=1` drops
  the header for a page framed in another site, and `hide=` switches
  parts off (`src/state/shareConfig.ts`, offered by the Share dialog).

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
`-sENVIRONMENT=web`, so the generated `src/wasm/glue.ts` contains no
Node-only code paths. Decompression uses `DecompressionStream` and
base64 decoding uses `atob` — both standard Web APIs available in
every supported browser and in Node ≥ 18.
