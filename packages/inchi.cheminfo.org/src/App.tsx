import { Tab, Tabs } from '@blueprintjs/core';
import { INCHI_C_VERSION } from 'inchi-js';
import { useCallback, useEffect, useState } from 'react';

import { AboutPanel } from './components/AboutPanel.tsx';
import { DownloadPanel } from './components/DownloadPanel.tsx';
import { InchiToStructurePanel } from './components/InchiToStructurePanel.tsx';
import { StructureToInchiPanel } from './components/StructureToInchiPanel.tsx';
import { TestsPanel } from './components/TestsPanel.tsx';

type TabId = 'convert' | 'tests' | 'download' | 'about';

const VALID_TABS = new Set<TabId>(['convert', 'tests', 'download', 'about']);

function readInitialTab(): TabId {
  const raw = globalThis.location.hash.replace(/^#\/?/, '').split('/')[0];
  if (VALID_TABS.has(raw as TabId)) return raw as TabId;
  return 'convert';
}

/**
 * Root of the playground. Four tabs:
 *
 *   • Convert — structure ↔ InChI live conversion.
 *   • Tests — Molfile → InChI (must pass) and full
 *     Molfile → InChI → Molfile → InChI roundtrip (InChI strings must
 *     match) against the vendored IUPAC test SDFs.
 *   • Download — grab the prebuilt single-file ESM bundle and see
 *     how to embed it in plain HTML, in a bundler, or via npm.
 *   • About — project background, attribution, and academic
 *     citations for InChI and OpenChemLib.
 * @returns The application root.
 */
export function App() {
  const [tabId, setTabId] = useState<TabId>(() => readInitialTab());

  useEffect(() => {
    const onHashChange = () => setTabId(readInitialTab());
    globalThis.addEventListener('hashchange', onHashChange);
    return () => globalThis.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleTabChange = useCallback((next: string | number) => {
    const candidate = String(next) as TabId;
    const nextTab = VALID_TABS.has(candidate) ? candidate : 'convert';
    setTabId(nextTab);
    globalThis.history.replaceState(null, '', `#/${nextTab}`);
  }, []);

  return (
    <div className="app-shell">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22 }}>
          inchi.cheminfo.org — InChI playground
        </h1>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
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
            href="https://github.com/cheminfo/inchi"
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 13 }}
          >
            source
          </a>
        </div>
      </div>

      <Tabs
        id="root-tabs"
        size="large"
        selectedTabId={tabId}
        onChange={handleTabChange}
        renderActiveTabPanelOnly
      >
        <Tab
          id="convert"
          title="Convert"
          panel={
            <div className="panel-grid" style={{ marginTop: 12 }}>
              <StructureToInchiPanel />
              <InchiToStructurePanel />
            </div>
          }
        />
        <Tab id="tests" title="Tests" panel={<TestsPanel />} />
        <Tab
          id="download"
          title="Download"
          panel={
            <div style={{ marginTop: 12 }}>
              <DownloadPanel />
            </div>
          }
        />
        <Tab
          id="about"
          title="About"
          panel={
            <div style={{ marginTop: 12 }}>
              <AboutPanel />
            </div>
          }
        />
      </Tabs>
    </div>
  );
}
