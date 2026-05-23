import { Callout, Icon } from '@blueprintjs/core';
import { INCHI_C_VERSION } from 'inchi-js';

interface Citation {
  authors: string;
  year: string;
  title: string;
  venue: string;
  url: string;
  doi?: string;
}

const INCHI_CITATIONS: Citation[] = [
  {
    authors:
      'Heller, S. R., McNaught, A., Pletnev, I., Stein, S., Tchekhovskoi, D.',
    year: '2015',
    title: 'InChI, the IUPAC International Chemical Identifier',
    venue: 'Journal of Cheminformatics 7, 23',
    url: 'https://doi.org/10.1186/s13321-015-0068-4',
    doi: '10.1186/s13321-015-0068-4',
  },
  {
    authors: 'Heller, S. R., McNaught, A., Stein, S., Tchekhovskoi, D., Pletnev, I.',
    year: '2013',
    title: 'InChI — the worldwide chemical structure identifier standard',
    venue: 'Journal of Cheminformatics 5, 7',
    url: 'https://doi.org/10.1186/1758-2946-5-7',
    doi: '10.1186/1758-2946-5-7',
  },
  {
    authors: 'Goodman, J. M., Pletnev, I., Thiessen, P., Bolton, E., Heller, S. R.',
    year: '2021',
    title:
      'InChI version 1.06: now more than 99.99% reliable',
    venue: 'Journal of Cheminformatics 13, 40',
    url: 'https://doi.org/10.1186/s13321-021-00517-z',
    doi: '10.1186/s13321-021-00517-z',
  },
];

const OCL_CITATION: Citation = {
  authors: 'Sander, T., Freyss, J., von Korff, M., Rufener, C.',
  year: '2015',
  title:
    'DataWarrior: An Open-Source Program For Chemistry Aware Data Visualization And Analysis',
  venue: 'Journal of Chemical Information and Modeling 55, 460–473',
  url: 'https://doi.org/10.1021/ci500588j',
  doi: '10.1021/ci500588j',
};

/**
 * "About" tab: project background, attribution of the embedded
 * IUPAC InChI C library, and academic citations for InChI and
 * OpenChemLib that users of the library are expected to acknowledge
 * in their own publications.
 * @returns The About panel JSX.
 */
export function AboutPanel() {
  return (
    <div className="panel" style={{ gap: 16 }}>
      <h2 className="section-title">
        <Icon icon="info-sign" /> About this playground
      </h2>

      <Callout intent="primary" icon="lab-test">
        <p style={{ margin: 0 }}>
          <strong>inchi.cheminfo.org</strong> is an interactive playground for{' '}
          <a
            href="https://github.com/cheminfo/inchi"
            target="_blank"
            rel="noreferrer"
          >
            <code>inchi-js</code>
          </a>
          , a TypeScript wrapper around the official IUPAC InChI C library
          (v{INCHI_C_VERSION}) compiled to WebAssembly and embedded as a single
          self-contained ESM bundle — no extra fetch, no external <code>.wasm</code>{' '}
          file. The site lets you convert between Molfile, InChI, and InChIKey
          live in the browser, and stress-tests the embedded WASM build against
          the upstream IUPAC regression corpora.
        </p>
      </Callout>

      <section>
        <h3 style={{ marginBottom: 8 }}>Embedded software</h3>
        <ul style={{ marginTop: 0, paddingLeft: 20, lineHeight: 1.55 }}>
          <li>
            <strong>IUPAC InChI</strong> v{INCHI_C_VERSION} — the reference C
            implementation maintained by the InChI Trust and IUPAC. Source:{' '}
            <a
              href="https://github.com/IUPAC-InChI/InChI"
              target="_blank"
              rel="noreferrer"
            >
              IUPAC-InChI/InChI
            </a>
            . Licensed under the IUPAC/InChI Trust Licence.
          </li>
          <li>
            <strong>OpenChemLib</strong> — used by the playground for Molfile
            parsing, 2D depiction, canonical idCode comparison and the
            tautomer-aware roundtrip diagnostic. Source:{' '}
            <a
              href="https://github.com/cheminfo/openchemlib-js"
              target="_blank"
              rel="noreferrer"
            >
              cheminfo/openchemlib-js
            </a>
            . Original DataWarrior /{' '}
            <a
              href="https://github.com/Actelion/openchemlib"
              target="_blank"
              rel="noreferrer"
            >
              Actelion/openchemlib
            </a>{' '}
            project.
          </li>
          <li>
            <strong>IUPAC InChI test corpora</strong> — the SDFs in the
            "Tests" tab come verbatim from the{' '}
            <code>INCHI-1-TEST</code> subdirectory of the IUPAC InChI
            repository. They are bundled into the production build for offline
            replay.
          </li>
        </ul>
      </section>

      <section>
        <h3 style={{ marginBottom: 8 }}>How to cite InChI</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          When you use <code>inchi-js</code> (and therefore the IUPAC InChI
          algorithm) in a publication, please cite the original InChI papers.
          The 2015 paper is the canonical citation; the 2013 and 2021 papers
          cover the chronology and the v1.06+ reliability work.
        </p>
        <CitationList citations={INCHI_CITATIONS} />
      </section>

      <section>
        <h3 style={{ marginBottom: 8 }}>How to cite OpenChemLib</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          The playground uses OpenChemLib for every Molfile parse, 2D
          depiction, and idCode comparison. If you rely on that part of the
          stack, please cite:
        </p>
        <CitationList citations={[OCL_CITATION]} />
      </section>

      <section>
        <h3 style={{ marginBottom: 8 }}>Project links</h3>
        <ul style={{ marginTop: 0, paddingLeft: 20, lineHeight: 1.55 }}>
          <li>
            <a
              href="https://github.com/cheminfo/inchi"
              target="_blank"
              rel="noreferrer"
            >
              cheminfo/inchi
            </a>{' '}
            — this monorepo (library + playground).
          </li>
          <li>
            <a
              href="https://www.npmjs.com/package/inchi-js"
              target="_blank"
              rel="noreferrer"
            >
              npm: inchi-js
            </a>{' '}
            — the published library.
          </li>
          <li>
            <a
              href="https://www.inchi-trust.org/"
              target="_blank"
              rel="noreferrer"
            >
              inchi-trust.org
            </a>{' '}
            — the InChI Trust, custodian of the standard.
          </li>
          <li>
            <a href="https://www.cheminfo.org/" target="_blank" rel="noreferrer">
              cheminfo.org
            </a>{' '}
            — the cheminfo project at EPFL.
          </li>
        </ul>
      </section>

      <section>
        <h3 style={{ marginBottom: 8 }}>Licence</h3>
        <p style={{ marginTop: 0 }}>
          The wrapper code (<code>inchi-js</code> and this playground) is
          published under the <strong>MIT licence</strong>. The embedded IUPAC
          InChI C library remains under its original{' '}
          <a
            href="https://www.inchi-trust.org/download/"
            target="_blank"
            rel="noreferrer"
          >
            IUPAC/InChI Trust Licence
          </a>
          ; redistributing the bundled WASM means agreeing to that licence
          as well.
        </p>
      </section>
    </div>
  );
}

function CitationList({ citations }: { citations: Citation[] }) {
  return (
    <ol style={{ marginTop: 4, paddingLeft: 20, lineHeight: 1.55 }}>
      {citations.map((citation) => (
        <li key={citation.url} style={{ marginBottom: 8 }}>
          {citation.authors} ({citation.year}).{' '}
          <em>{citation.title}.</em> {citation.venue}.{' '}
          <a href={citation.url} target="_blank" rel="noreferrer">
            {citation.doi ? `doi:${citation.doi}` : citation.url}
          </a>
        </li>
      ))}
    </ol>
  );
}
