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

| Command               | Effect                                                                       |
| --------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`         | Start the playground (vite dev server).                                      |
| `npm run build`       | Build the library and the playground production bundle.                       |
| `npm run build-lib`   | Compile the library to `packages/inchi-js/lib`.                              |
| `npm run build-wasm`  | Rebuild the WASM module from `vendor/inchi/` (requires emscripten + cmake).   |
| `npm test`            | Per-workspace `vitest run --coverage` + type-check + eslint + prettier.      |
| `npm run test-only`   | Tests only, skip lint/types.                                                  |

## Deployment (`inchi.cheminfo.org`)

The playground ships as a static Docker image built from
[`Dockerfile`](Dockerfile) — Vite output served by
[`static-web-server`](https://github.com/static-web-server/static-web-server)
on port `80` inside the container. Three example compose files cover
the common deployment modes; pick one, copy it to `compose.yaml`,
adjust if needed, and start it. Built images are also published to
`ghcr.io/cheminfo/inchi:latest`, so a deployment host only needs
Docker — no Node.js, no submodule, no build step.

### 1. Direct port mapping (default)

Publishes the container on a host port (default `8080`). Useful for
local testing or behind any reverse proxy you already operate.

```bash
cp .env.example .env             # adjust PORT if 8080 is taken
cp compose.example.yaml compose.yaml
docker compose pull              # or: docker compose up -d --build
docker compose up -d
```

### 2. Cloudflare Tunnel

Runs a `cloudflared` sidecar that connects to a tunnel you created in
the Cloudflare dashboard — the container is reachable over HTTPS at
the public hostname you assign (default `inchi.lactame.com`) without
opening any inbound port.

```bash
cp .env.example .env             # fill in TUNNEL_TOKEN=...
cp compose.example.cloudflared.yaml compose.yaml
docker compose up -d
```

Cloudflare dashboard steps: **Networking → Tunnels → Create a tunnel
→ Cloudflared connector**, copy the token into `.env`, then under
**Published applications** add `Service = HTTP`, `URL =
inchi-cheminfo-org:80`, hostname = `inchi.lactame.com`.

### 3. Traefik reverse proxy

For hosts that already run Traefik on a shared `traefik` Docker
network with a `websecure` entrypoint and a `letsencrypt` cert
resolver. No port is published on the host — Traefik routes traffic
to the container over the shared network.

```bash
cp compose.example.traefik.yaml compose.yaml
# adjust the Host(`...`) label in compose.yaml to your hostname
docker compose up -d
```

The default hostname in the example is `inchi.cheminfo.org`.

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
