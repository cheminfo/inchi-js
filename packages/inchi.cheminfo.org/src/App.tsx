import { Tab, Tabs } from '@blueprintjs/core';
import { INCHI_C_VERSION } from 'inchi-js';
import { useCallback, useEffect, useState } from 'react';

import { AboutPanel } from './components/AboutPanel.tsx';
import { DownloadPanel } from './components/DownloadPanel.tsx';
import { FastTooltip } from './components/FastTooltip.tsx';
import { InchiToStructurePanel } from './components/InchiToStructurePanel.tsx';
import { Logo } from './components/Logo.tsx';
import { SdfToInchiPanel } from './components/SdfToInchiPanel.tsx';
import { StructureToInchiPanel } from './components/StructureToInchiPanel.tsx';
import { TestsPanel } from './components/TestsPanel.tsx';

type TabId = 'convert' | 'sdf' | 'tests' | 'download' | 'about';

const VALID_TABS = new Set<TabId>([
  'convert',
  'sdf',
  'tests',
  'download',
  'about',
]);

function readInitialTab(): TabId {
  const raw = globalThis.location.hash.replace(/^#\/?/, '').split('/')[0];
  if (VALID_TABS.has(raw as TabId)) return raw as TabId;
  return 'convert';
}

/**
 * Root of the playground. Five tabs:
 *
 *   • Convert — structure ↔ InChI live conversion.
 *   • SDF — batch Molfile → InChI over a whole SDF file, listed in a
 *     virtualized table, re-downloadable with InChI/InChIKey fields added.
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
      <header className="app-header">
        <div className="app-brand">
          <Logo size={20} />
          <span className="app-brand-name">InChI JS</span>
        </div>
        <Tabs
          id="root-tabs"
          className="app-nav"
          selectedTabId={tabId}
          onChange={handleTabChange}
        >
          <Tab id="convert" title="Convert" />
          <Tab id="sdf" title="SDF" />
          <Tab id="tests" title="Tests" />
          <Tab id="download" title="Download" />
          <Tab id="about" title="About" />
        </Tabs>
        <div className="app-links">
          <FastTooltip content="Version of the IUPAC InChI C library compiled to the embedded WASM">
            <a
              href="https://github.com/IUPAC-InChI/InChI"
              target="_blank"
              rel="noreferrer"
            >
              InChI v{INCHI_C_VERSION}
            </a>
          </FastTooltip>
          <a
            href="https://github.com/cheminfo/inchi"
            target="_blank"
            rel="noreferrer"
          >
            source
          </a>
        </div>
      </header>

      <main
        className={
          tabId === 'sdf' || tabId === 'tests'
            ? 'app-main app-main--fill'
            : 'app-main'
        }
      >
        {tabId === 'convert' && (
          <div className="panel-grid">
            <StructureToInchiPanel />
            <InchiToStructurePanel />
          </div>
        )}
        {tabId === 'sdf' && <SdfToInchiPanel />}
        {tabId === 'tests' && <TestsPanel />}
        {tabId === 'download' && <DownloadPanel />}
        {tabId === 'about' && <AboutPanel />}
      </main>
    </div>
  );
}
