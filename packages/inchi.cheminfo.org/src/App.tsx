import { Button, Tab, Tabs } from '@blueprintjs/core';
import { useSignals } from '@preact/signals-react/runtime';
import { INCHI_C_VERSION } from 'inchi-js';
import { useState } from 'react';

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
    <div className={embedded ? 'app-shell app-shell-embedded' : 'app-shell'}>
      {!embedded && <AppHeader />}

      <Tabs
        id="root-tabs"
        size="large"
        className={isHidden('tabs') ? 'tab-list-hidden' : undefined}
        selectedTabId={tabId}
        onChange={selectTab}
        renderActiveTabPanelOnly
      >
        <Tab
          id="convert"
          title="Convert"
          panel={
            <div className="panel-grid" style={{ marginTop: 12 }}>
              {!isHidden('structure') && <StructureToInchiPanel />}
              {!isHidden('inchi') && <InchiToStructurePanel />}
            </div>
          }
        />
        <Tab id="batch" title="Batch convert" panel={<FileConvertPanel />} />
        <Tab
          id="tutorial"
          title="Tutorial"
          panel={
            <div style={{ marginTop: 12 }}>
              <Tutorial />
            </div>
          }
        />
        <Tab
          id="exercises"
          title="Exercises"
          panel={
            <div style={{ marginTop: 12 }}>
              <Exercises />
            </div>
          }
        />
        <Tab
          id="cheatsheet"
          title="Cheatsheet"
          panel={
            <div style={{ marginTop: 12 }}>
              <Cheatsheet />
            </div>
          }
        />
        <MoreMenu selected={tabId} onSelect={selectTab} />
      </Tabs>

      {isMoreTab(tabId) && <MorePanel tab={tabId} />}
    </div>
  );
}

/**
 * The title bar: what the site is, where the engine and the API live, and the
 * dialog that builds a link — or an iframe — onto the page on show.
 * @returns The header.
 */
function AppHeader() {
  const [sharing, setSharing] = useState(false);

  return (
    <div className="app-header">
      <h1 className="app-title">
        <img className="app-logo" src="/logo.svg" alt="" />
        <span className="app-title-site">inchi.cheminfo.org</span> — InChI
        playground
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {!isHidden('links') && (
          <>
            <a
              href="https://github.com/IUPAC-InChI/InChI"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 13 }}
              title="Version of the IUPAC InChI C library compiled to the embedded WASM"
            >
              IUPAC InChI v{INCHI_C_VERSION}
            </a>
            <a
              href="/documentation"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 13 }}
              title="HTTP API: convert a structure, or a whole CSV / TSV / XLSX / SDF file, to InChI and InChIKey"
            >
              API
            </a>
            <a
              href="https://github.com/cheminfo/inchi"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 13 }}
            >
              source
            </a>
          </>
        )}
        <Button
          size="small"
          icon="share"
          title="Share a link to this page, or frame it in your own site"
          onClick={() => setSharing(true)}
        >
          Share
        </Button>
      </div>
      {sharing && <ShareDialog isOpen onClose={() => setSharing(false)} />}
    </div>
  );
}
