/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly INCHI_JS_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
