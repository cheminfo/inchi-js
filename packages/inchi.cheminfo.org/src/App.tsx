import { Icon } from '@blueprintjs/core';
import { useSignals } from '@preact/signals-react/runtime';
import { INCHI_C_VERSION } from 'inchi-js';
import { useState } from 'react';

import { BrandMark, Wordmark } from './components/Brand.tsx';
import { InchiToStructurePanel } from './components/InchiToStructurePanel.tsx';
import { MoreMenu } from './components/MoreMenu.tsx';
import { MorePanel } from './components/MorePanel.tsx';
import { ShareDialog } from './components/ShareDialog.tsx';
import { StructureToInchiPanel } from './components/StructureToInchiPanel.tsx';
import { isMoreTab } from './components/moreTabs.ts';
import { FileConvertPanel } from './fileConvert/FileConvertPanel.tsx';
import { Cheatsheet } from './guide/pages/Cheatsheet.tsx';
import { Exercises } from './guide/pages/Exercises.tsx';
import { Tutorial } from './guide/pages/Tutorial.tsx';
import { selectTab, state } from './state/index.ts';
import { isEmbedded, isHidden } from './state/shareConfig.ts';

/**
 * Root of the playground. Five tabs plus a More dropdown:
 *
 *   • Convert — structure ↔ InChI live conversion.
 *   • Batch convert — append InChI and InChIKey columns to a CSV, TSV,
 *     XLSX, or SDF, entirely in the browser.
 *   • Tutorial — how an InChI is derived by hand, step by step.
 *   • Exercises — derive a layer yourself, checked against the engine.
 *   • Cheatsheet — a printable reference of the layers and their syntax.
 *   • More — a dropdown onto the IUPAC test suites, the bundle
 *     download, and the project background.
 *
 * Framed in another site (`?embed=1`), the header is left out so the page
 * gets the whole frame, and `?hide=tabs` drops the menu with it.
 * @returns The application root.
 */
export function App() {
  useSignals();
  const tabId = state.view.tab.value;
  const embedded = isEmbedded();

  return (
    <>
      {!embedded && <AppHeader tabId={tabId} />}

      <div className={embedded ? 'app-shell app-shell-embedded' : 'app-shell'}>
        {isMoreTab(tabId) ? (
          <MorePanel tab={tabId} />
        ) : (
          <RootPanel tab={tabId} />
        )}
      </div>
    </>
  );
}

/** The five pages of the daily flow, in the order the menu lists them. */
const ROOT_TABS = [
  { id: 'convert', title: 'Convert' },
  { id: 'batch', title: 'Batch convert' },
  { id: 'tutorial', title: 'Tutorial' },
  { id: 'exercises', title: 'Exercises' },
  { id: 'cheatsheet', title: 'Cheatsheet' },
] as const;

/**
 * The page the hash addresses, for the tabs that are not behind More.
 * @param props - The active tab.
 * @param props.tab - Id of the page to render.
 * @returns The page.
 */
function RootPanel(props: { tab: string }) {
  useSignals();
  const { tab } = props;

  if (tab === 'batch') return <FileConvertPanel />;
  if (tab === 'tutorial') return <Tutorial />;
  if (tab === 'exercises') return <Exercises />;
  if (tab === 'cheatsheet') return <Cheatsheet />;

  return (
    <div className="panel-grid">
      {!isHidden('structure') && <StructureToInchiPanel />}
      {!isHidden('inchi') && <InchiToStructurePanel />}
    </div>
  );
}

/**
 * The title bar: what the site is, where the engine and the API live, and the
 * dialog that builds a link — or an iframe — onto the page on show.
 * @param props - The active tab.
 * @param props.tabId - Id of the page on show, so the menu can mark it.
 * @returns The header.
 */
function AppHeader(props: { tabId: string }) {
  const { tabId } = props;
  const [sharing, setSharing] = useState(false);

  return (
    <>
      <header className="app-header">
        <div className="app-header__inner">
          <a href="#/convert" className="brand" title="inchi.cheminfo.org">
            <BrandMark />
            <Wordmark />
          </a>
          <nav className="app-header-nav">
            {!isHidden('tabs') && (
              <>
                {ROOT_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={
                      tab.id === tabId
                        ? 'nav-link nav-link--active'
                        : 'nav-link'
                    }
                    onClick={() => selectTab(tab.id)}
                  >
                    {tab.title}
                  </button>
                ))}
                <MoreMenu selected={tabId} onSelect={selectTab} />
              </>
            )}
            {!isHidden('links') && (
              <>
                <span className="app-header-sep" />
                <a
                  className="nav-link"
                  href="https://github.com/IUPAC-InChI/InChI"
                  target="_blank"
                  rel="noreferrer"
                  title="Version of the IUPAC InChI C library compiled to the embedded WASM"
                >
                  InChI v{INCHI_C_VERSION}
                </a>
                <a
                  className="nav-link"
                  href="/documentation"
                  target="_blank"
                  rel="noreferrer"
                  title="HTTP API: convert a structure, or a whole CSV / TSV / XLSX / SDF file, to InChI and InChIKey"
                >
                  API
                </a>
                <a
                  className="nav-link"
                  href="https://github.com/cheminfo/inchi"
                  target="_blank"
                  rel="noreferrer"
                >
                  Source
                </a>
              </>
            )}
            <button
              type="button"
              className="nav-link"
              title="Share a link to this page, or frame it in your own site"
              onClick={() => setSharing(true)}
            >
              <Icon icon="share" size={14} />
              Share
            </button>
          </nav>
        </div>
      </header>
      <p className="app-tagline">
        InChI playground — structure to InChI and back, in your browser
      </p>
      {sharing && <ShareDialog isOpen onClose={() => setSharing(false)} />}
    </>
  );
}
