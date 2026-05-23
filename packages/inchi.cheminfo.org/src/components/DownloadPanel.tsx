import { AnchorButton, Callout, Icon, Tag } from '@blueprintjs/core';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import type { Extension } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import CodeMirror from '@uiw/react-codemirror';
import { INCHI_C_VERSION } from 'inchi-js';

const EXAMPLE_HTML = `<!doctype html>
<html>
  <body>
    <script type="module">
      import {
        inchiFromMolfile,
        inchikeyFromInchi,
        INCHI_C_VERSION,
      } from './inchi-js.min.js';

      const molfile = \`
  Mrv1810 01010000002D

  3  2  0  0  0  0            999 V2000
    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.0000    0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
    2.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
  2  3  1  0  0  0  0
M  END
\`;

      const { inchi } = await inchiFromMolfile(molfile, { options: '' });
      const { inchikey } = await inchikeyFromInchi(inchi);
      console.log('IUPAC InChI v' + INCHI_C_VERSION);
      console.log(inchi);     // InChI=1S/C2H6O/c1-3-2/h1-2H3
      console.log(inchikey);  // RTZKZFJDLAIYFH-UHFFFAOYSA-N
    </script>
  </body>
</html>`;

const EXAMPLE_ESM = `import {
  inchiFromMolfile,
  inchikeyFromInchi,
  molfileFromInchi,
  INCHI_C_VERSION,
} from 'inchi-js';

const molfile = \`/* … V2000 or V3000 Molfile … */\`;

const { inchi, auxinfo, message } = await inchiFromMolfile(molfile, {
  options: '',          // raw InChI option string, e.g. '-RecMet' for organometallics
});

const { inchikey } = await inchikeyFromInchi(inchi);

// And back from an InChI to a 2D Molfile:
const { molfile: reconstructed } = await molfileFromInchi(inchi);`;

const EXAMPLE_NODE_INSTALL = `npm install inchi-js`;

/**
 * "Download" tab: lets visitors grab the prebuilt single-file ESM
 * bundle of `inchi-js` and shows the minimal snippets needed to use
 * it from a plain HTML page (no bundler), from any ESM module, or
 * from an npm install.
 * @returns The Download panel JSX.
 */
export function DownloadPanel() {
  const baseUrl = import.meta.env.BASE_URL || '/';
  const minHref = `${baseUrl}lib/inchi-js.min.js`;
  const fullHref = `${baseUrl}lib/inchi-js.js`;
  const dtsHref = `${baseUrl}lib/inchi-js.d.ts`;
  const exampleHref = `${baseUrl}embed-example.html`;

  return (
    <div className="panel" style={{ gap: 16 }}>
      <h2 className="section-title">
        <Icon icon="cloud-download" /> Download &amp; embed
      </h2>

      <Callout intent="primary" icon="package">
        <p style={{ margin: 0 }}>
          <code>inchi-js</code> ships as a <strong>single ESM file</strong> with
          the IUPAC InChI WASM (v{INCHI_C_VERSION}) base64-embedded inside — no
          extra fetch, no extra <code>.wasm</code> file, no bundler required.
          Drop the file next to your HTML and import it with a regular{' '}
          <code>&lt;script type=&quot;module&quot;&gt;</code>.
        </p>
        <div
          style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}
        >
          <Tag minimal intent="primary">
            inchi-js v{__INCHI_JS_VERSION__}
          </Tag>
          <Tag minimal intent="success">
            IUPAC InChI v{INCHI_C_VERSION}
          </Tag>
          <Tag minimal>
            min: {formatBytes(__INCHI_JS_MIN_SIZE__)} · full:{' '}
            {formatBytes(__INCHI_JS_FULL_SIZE__)}
          </Tag>
        </div>
      </Callout>

      <section>
        <h3 style={{ marginBottom: 8 }}>1. Get the file</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <AnchorButton
            href={minHref}
            download
            icon="download"
            intent="primary"
            variant="solid"
          >
            inchi-js.min.js ({formatBytes(__INCHI_JS_MIN_SIZE__)})
          </AnchorButton>
          <AnchorButton href={fullHref} download icon="document">
            inchi-js.js ({formatBytes(__INCHI_JS_FULL_SIZE__)})
          </AnchorButton>
          <AnchorButton href={dtsHref} download icon="code">
            inchi-js.d.ts (TypeScript types)
          </AnchorButton>
          <AnchorButton
            href={exampleHref}
            icon="share"
            target="_blank"
            rel="noreferrer"
          >
            Open live example in a new tab
          </AnchorButton>
        </div>
        <p className="muted" style={{ marginTop: 8 }}>
          The minified build is what production sites should ship; the
          unminified build is paired with a source map for debugging. The
          <code> .d.ts</code> file gives full TypeScript types when you drop the
          bundle into a TS project.
        </p>
      </section>

      <section>
        <h3 style={{ marginBottom: 8 }}>2. Embed in a plain HTML page</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Save the file shown below next to <code>inchi-js.min.js</code> and
          open it in any modern browser. No build step, no <code>npm</code>, no
          server — a plain <code>file://</code> open works.
        </p>
        <CodeBlock label="example.html" code={EXAMPLE_HTML} language="html" />
      </section>

      <section>
        <h3 style={{ marginBottom: 8 }}>3. Use from a bundler / npm</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          If you have a build tool, install the package and import from the
          package name — the bundler will pick up <code>lib/inchi-js.js</code>{' '}
          via the package&apos;s <code>exports</code> map.
        </p>
        <CodeBlock label="shell" code={EXAMPLE_NODE_INSTALL} language="shell" />
        <CodeBlock
          label="any ES module"
          code={EXAMPLE_ESM}
          language="javascript"
        />
      </section>

      <section>
        <h3 style={{ marginBottom: 8 }}>What&apos;s exported</h3>
        <ul style={{ marginTop: 0, paddingLeft: 20, lineHeight: 1.6 }}>
          <li>
            <code>inchiFromMolfile(molfile, options?)</code> — Molfile → InChI +
            AuxInfo + diagnostic message.
          </li>
          <li>
            <code>inchikeyFromInchi(inchi)</code> — InChI → 27-character hashed
            InChIKey.
          </li>
          <li>
            <code>molfileFromInchi(inchi, options?)</code> — InChI → 2D V2000
            Molfile reconstruction.
          </li>
          <li>
            <code>molfileFromAuxinfo(auxinfo, …)</code> — rebuild a Molfile from
            a preserved AuxInfo block.
          </li>
          <li>
            <code>structureFromInchi(inchi, options?)</code> — InChI →
            JS-friendly atom/bond/stereo object.
          </li>
          <li>
            <code>INCHI_C_VERSION</code> — string with the embedded IUPAC InChI
            C library version (currently <code>{INCHI_C_VERSION}</code>).
          </li>
        </ul>
      </section>
    </div>
  );
}

type CodeLanguage = 'html' | 'javascript' | 'shell';

const LANGUAGE_EXTENSIONS: Record<CodeLanguage, Extension[]> = {
  html: [html()],
  javascript: [javascript({ jsx: false, typescript: false })],
  shell: [],
};

function CodeBlock({
  label,
  code,
  language,
}: {
  label: string;
  code: string;
  language: CodeLanguage;
}) {
  return (
    <div style={{ marginTop: 4 }}>
      <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
        {label}
      </div>
      <div
        style={{
          borderRadius: 4,
          overflow: 'hidden',
          fontSize: 12,
        }}
      >
        <CodeMirror
          value={code}
          editable={false}
          readOnly
          theme={oneDark}
          extensions={LANGUAGE_EXTENSIONS[language]}
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
            highlightActiveLine: false,
            highlightActiveLineGutter: false,
            highlightSelectionMatches: false,
          }}
        />
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
