import { Button, Menu, MenuItem, Popover, Tab, Tabs } from '@blueprintjs/core';
import { INCHI_C_VERSION } from 'inchi-js';
import { useCallback, useEffect, useState } from 'react';

import { AboutPanel } from './components/AboutPanel.tsx';
import { DownloadPanel } from './components/DownloadPanel.tsx';
import { FastTooltip } from './components/FastTooltip.tsx';
import { HomePanel } from './components/HomePanel.tsx';
import { InchiToStructurePanel } from './components/InchiToStructurePanel.tsx';
import { Logo } from './components/Logo.tsx';
import { SdfToInchiPanel } from './components/SdfToInchiPanel.tsx';
import { StructureToInchiPanel } from './components/StructureToInchiPanel.tsx';
import { TestsPanel } from './components/TestsPanel.tsx';

type TabId = 'home' | 'convert' | 'sdf' | 'tests' | 'download' | 'about';

const VALID_TABS = new Set<TabId>([
  'home',
  'convert',
  'sdf',
  'tests',
  'download',
  'about',
]);

/** Secondary, reference/developer-oriented tabs grouped under "More". */
const MORE_TABS = new Set<TabId>(['tests', 'download', 'about']);

function readInitialTab(): TabId {
  const raw = globalThis.location.hash.replace(/^#\/?/, '').split('/')[0];
  if (VALID_TABS.has(raw as TabId)) return raw as TabId;
  return 'home';
}

/**
 * Root of the playground. The top navigation keeps the two end-user
 * actions front and centre, with the reference/developer tabs tucked
 * into a "More" dropdown:
 *
 *   • Home — landing page presenting the project and insisting every
 *     conversion runs locally, with no data ever sent to a server.
 *   • Convert — structure ↔ InChI live conversion (one molecule).
 *   • SDF — batch Molfile → InChI over a whole SDF file, listed in a
 *     virtualized table, re-downloadable with InChI/InChIKey fields added.
 *
 * Grouped under "More":
 *
 *   • Tests — Molfile → InChI and full roundtrip checks against the
 *     vendored IUPAC test SDFs.
 *   • Download — grab the prebuilt single-file ESM bundle and see how
 *     to embed it in plain HTML, in a bundler, or via npm.
 *   • About — project background, attribution, and academic citations.
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
    const nextTab = VALID_TABS.has(candidate) ? candidate : 'home';
    setTabId(nextTab);
    globalThis.history.replaceState(null, '', `#/${nextTab}`);
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="app-brand" href="#/home">
          <Logo size={20} />
          <span className="app-brand-name">InChI JS</span>
        </a>
        <Tabs
          id="root-tabs"
          className="app-nav"
          selectedTabId={tabId}
          onChange={handleTabChange}
        >
          <Tab id="home" title="Home" />
          <Tab id="convert" title="Convert" />
          <Tab id="sdf" title="SDF" />
        </Tabs>
        <Popover
          minimal
          placement="bottom-end"
          content={
            <Menu>
              <MenuItem
                icon="lab-test"
                text="Tests"
                active={tabId === 'tests'}
                onClick={() => handleTabChange('tests')}
              />
              <MenuItem
                icon="cloud-download"
                text="Download"
                active={tabId === 'download'}
                onClick={() => handleTabChange('download')}
              />
              <MenuItem
                icon="info-sign"
                text="About"
                active={tabId === 'about'}
                onClick={() => handleTabChange('about')}
              />
            </Menu>
          }
        >
          <Button
            variant="minimal"
            endIcon="caret-down"
            active={MORE_TABS.has(tabId)}
          >
            More
          </Button>
        </Popover>
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
        {tabId === 'home' && <HomePanel />}
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
