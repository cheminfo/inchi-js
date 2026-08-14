<img src="packages/inchi.cheminfo.org/public/logo.svg" alt="" width="96" align="right" />

# inchi

Monorepo for the IUPAC InChI WebAssembly engine: a TypeScript library
that wraps the official IUPAC InChI C library compiled to WebAssembly,
an HTTP API that converts structures and whole files, and an
interactive web playground using react-ocl.

## Packages

| Path                                                           | Name                 | Published as | Purpose                                                                                                                                             |
| -------------------------------------------------------------- | -------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`packages/inchi-js/`](packages/inchi-js/)                     | `inchi-js`           | npm          | The WASM-backed engine. Converts Molfile ↔ InChI ↔ InChIKey. Self-contained — WASM is base64-embedded.                                              |
| [`packages/inchi-api/`](packages/inchi-api/)                   | `inchi-api`          | Docker image | HTTP API. Converts one structure, or appends InChI/InChIKey to a CSV, TSV, XLSX, or SDF file. Also serves the playground and its own documentation. |
| [`packages/inchi.cheminfo.org/`](packages/inchi.cheminfo.org/) | `inchi.cheminfo.org` | static site  | Interactive playground (React + react-ocl) for the library.                                                                                         |

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

| Command              | Effect                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| `npm run dev`        | Start the API (`10523`) and the playground (`10524`, proxying `/v1` and `/documentation` to the API). |
| `npm run dev-api`    | Start the HTTP API alone on port `10523` (`node --watch`).                                            |
| `npm run dev-site`   | Start the playground alone (vite dev server on `10524`).                                              |
| `npm run build`      | Build the library and the playground production bundle.                                               |
| `npm run build-lib`  | Compile the library to `packages/inchi-js/lib`.                                                       |
| `npm run build-wasm` | Rebuild the WASM module from `vendor/inchi/` (requires emscripten + cmake).                           |
| `npm test`           | Both workspaces' `vitest run --coverage` + type-check + repo-wide eslint and prettier.                |
| `npm run test-only`  | Tests only, skip lint/types.                                                                          |
| `npm run eslint`     | Lint the whole repository (`eslint .`).                                                               |
| `npm run prettier`   | Check formatting across the whole repository (`prettier --check .`).                                  |

## Sharing and embedding the playground

The page on show lives in the hash, so the address is the thing to hand
out. The **Share** button in the header builds it, together with the
iframe that frames it in another site:

```
inchi.cheminfo.org/?embed=1&hide=tabs#/convert
inchi.cheminfo.org/?embed=1&hide=tabs,inchi#/convert
inchi.cheminfo.org/?embed=1&hide=tabs,list,answers#/exercises/formula-paracetamol
inchi.cheminfo.org/?embed=1#/tutorial/anatomy
```

- `embed=1` drops the header, so only the page shows through the frame.
- `hide=` switches parts off: `tabs` (the menu), `links`, `structure` and
  `inchi` (the two halves of Convert), `steps` (the tutorial step picker),
  `list`, `hints`, `answers` and `clear` (the exercises). A key this
  version does not know is ignored, so an older link still opens.

## HTTP API (`inchi-api`)

```bash
npm run dev-api
curl 'http://localhost:10523/v1/inchi?structure=CCO'
curl -X POST http://localhost:10523/v1/convert -F file=@compounds.csv -o compounds-inchi.csv
```

`POST /v1/convert` takes a CSV, TSV, XLSX, or SDF file, detects the
structure column on its own (SMILES or molfile), and returns the same
file with `InChI` and `InChIKey` appended — or any other supported
format via `?output=sdf|csv|tsv|xlsx|json`. Swagger UI is served at
`/documentation`. See
[`packages/inchi-api/README.md`](packages/inchi-api/README.md).

## Deployment (`inchi.cheminfo.org`)

Everything ships as **one** Docker image built from
[`Dockerfile`](Dockerfile): a Fastify process that serves the API
under `/v1`, its Swagger UI under `/documentation`, and the built
playground at `/` — one origin, one container, port `10523`. Three
compose files cover the common deployment modes; select one by
uncommenting a `COMPOSE_FILE` line in `.env`, then start it. Built
images are published to `ghcr.io/cheminfo/inchi:latest`, so a
deployment host only needs Docker — no Node.js, no submodule, no
build step.

Every mode starts the same way:

```bash
cp .env.example .env             # then uncomment one COMPOSE_FILE line
docker compose up -d             # or: docker compose up -d --build
```

### 1. Direct port mapping (default)

Publishes the container on a host port (default `10523`). Useful for
local testing or behind any reverse proxy you already operate. This is
what `docker compose` uses when no `COMPOSE_FILE` is set.

```bash
COMPOSE_FILE=compose.yaml        # in .env; adjust PORT if 10523 is taken
```

### 2. Cloudflare Tunnel

Runs a `cloudflared` sidecar that connects to a tunnel you created in
the Cloudflare dashboard — the container is reachable over HTTPS at
the public hostname you assign (default `inchi.lactame.com`) without
opening any inbound port.

```bash
COMPOSE_FILE=compose.cloudflared.yaml   # in .env, plus TUNNEL_TOKEN=...
```

Cloudflare dashboard steps: **Networking → Tunnels → Create a tunnel
→ Cloudflared connector**, copy the token into `.env`, then under
**Published applications** add `Service = HTTP`, `URL =
inchi-cheminfo-org:10523`, hostname = `inchi.lactame.com`.

### 3. Traefik reverse proxy

For hosts that already run Traefik on a shared `traefik` Docker
network with a `websecure` entrypoint and a `letsencrypt` cert
resolver. No port is published on the host — Traefik routes traffic
to the container over the shared network.

```bash
COMPOSE_FILE=compose.traefik.yaml       # in .env
```

Adjust the ``Host(`...`)`` label in `compose.traefik.yaml` to your
hostname; the default is `inchi.cheminfo.org`.

## Library quick start

```ts
import {
  inchiFromMolfile,
  inchikeyFromInchi,
  molfileFromInchi,
} from 'inchi-js';

const molfile = `
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
