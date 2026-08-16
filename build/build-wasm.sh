#!/usr/bin/env bash
#
# Build the InChI WebAssembly module from the C source in vendor/inchi
# and embed the resulting .wasm binary (gzipped + base64) into
# src/wasm/data.ts, alongside the Emscripten JS glue at src/wasm/glue.ts.
#
# Requires:
#   - emcc / emcmake (Emscripten >= 3)
#   - cmake >= 3.15
#   - node (for the embedder script)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$SCRIPT_DIR/out"
SRC_DIR="$REPO_DIR/src"
INCHI_SUBMODULE="$REPO_DIR/vendor/inchi"

if [ ! -d "$INCHI_SUBMODULE/INCHI-1-SRC/INCHI_BASE/src" ]; then
  echo "error: InChI source not found at $INCHI_SUBMODULE/INCHI-1-SRC" >&2
  echo "Did you forget to run 'git submodule update --init --recursive'?" >&2
  exit 1
fi

if ! command -v emcc >/dev/null 2>&1; then
  echo "error: emcc (Emscripten) not found in PATH" >&2
  echo "See https://emscripten.org/ for installation instructions." >&2
  exit 1
fi

if ! command -v emcmake >/dev/null 2>&1; then
  echo "error: emcmake (Emscripten) not found in PATH" >&2
  exit 1
fi

if ! command -v cmake >/dev/null 2>&1; then
  echo "error: cmake >= 3.15 not found in PATH" >&2
  exit 1
fi

echo ">> Configuring CMake build (Emscripten) in $BUILD_DIR"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

emcmake cmake -S "$SCRIPT_DIR" -B "$BUILD_DIR"

echo ">> Compiling"
cmake --build "$BUILD_DIR" --parallel

WASM_PATH="$BUILD_DIR/inchi.wasm"
JS_GLUE_PATH="$BUILD_DIR/inchi.js"

if [ ! -f "$WASM_PATH" ]; then
  echo "error: expected WASM at $WASM_PATH but file is missing" >&2
  exit 1
fi
if [ ! -f "$JS_GLUE_PATH" ]; then
  echo "error: expected JS glue at $JS_GLUE_PATH but file is missing" >&2
  exit 1
fi

echo ">> Embedding artifacts into TypeScript modules"
mkdir -p "$SRC_DIR/wasm"
node "$SCRIPT_DIR/embed-wasm.js" \
  --wasm "$WASM_PATH" \
  --glue "$JS_GLUE_PATH" \
  --out-data "$SRC_DIR/wasm/data.ts" \
  --out-glue "$SRC_DIR/wasm/glue.ts"

VERSION_HEADER="$INCHI_SUBMODULE/INCHI-1-SRC/INCHI_BASE/src/bcf_s.h"
INCHI_C_VERSION="$(grep -E '^[[:space:]]*#define[[:space:]]+CURRENT_VER[[:space:]]+"' "$VERSION_HEADER" | sed -E 's/.*"([^"]+)".*/\1/')"
if [ -z "$INCHI_C_VERSION" ]; then
  echo "error: could not parse CURRENT_VER from $VERSION_HEADER" >&2
  exit 1
fi
echo ">> Writing IUPAC InChI C version $INCHI_C_VERSION to src/version.ts"
cat > "$SRC_DIR/version.ts" <<EOF
/**
 * Version of the IUPAC InChI C library that the embedded WASM was
 * compiled from. Extracted at WASM-build time from
 * \`vendor/inchi/INCHI-1-SRC/INCHI_BASE/src/bcf_s.h\` (\`CURRENT_VER\`) by
 * \`build/build-wasm.sh\`. Do not edit by hand.
 */
export const INCHI_C_VERSION = '$INCHI_C_VERSION';
EOF

WASM_SIZE=$(wc -c < "$WASM_PATH" | tr -d ' ')
EMBED_SIZE=$(wc -c < "$SRC_DIR/wasm/data.ts" | tr -d ' ')
echo ">> Built WASM: $WASM_SIZE bytes -> embedded module: $EMBED_SIZE bytes"
echo ">> Done. Re-run 'npm run tsc' to refresh the lib/ build."
