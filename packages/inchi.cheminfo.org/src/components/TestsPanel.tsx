import { Tab, Tabs } from '@blueprintjs/core';
import { useCallback, useEffect, useState } from 'react';

import { ForwardTestPanel } from './ForwardTestPanel.tsx';
import { RoundtripPanel } from './RoundtripPanel.tsx';

type TestId = 'forward' | 'roundtrip';

function readInitialTest(): TestId {
  const raw = globalThis.location.hash.replace(/^#\/?/, '');
  if (raw === 'tests/roundtrip') return 'roundtrip';
  return 'forward';
}

/**
 * "Tests" tab — bundles two complementary test categories against the
 * vendored IUPAC test SDFs:
 *
 *   • Molfile → InChI — must pass on every record (regression check
 *     on the embedded WASM build).
 *   • Roundtrip (Molfile → InChI → Molfile) — exploratory comparison
 *     against the OpenChemLib canonical idCode; mismatches are
 *     expected and categorised.
 *
 * The active sub-tab is reflected in the URL hash so links are
 * deep-shareable.
 * @returns The Tests tab JSX.
 */
export function TestsPanel() {
  const [testId, setTestId] = useState<TestId>(() => readInitialTest());

  useEffect(() => {
    const onHashChange = () => {
      const raw = globalThis.location.hash.replace(/^#\/?/, '');
      if (raw.startsWith('tests/')) {
        setTestId(raw === 'tests/roundtrip' ? 'roundtrip' : 'forward');
      }
    };
    globalThis.addEventListener('hashchange', onHashChange);
    return () => globalThis.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleChange = useCallback((next: string | number) => {
    const nextTest = next === 'roundtrip' ? 'roundtrip' : 'forward';
    setTestId(nextTest);
    globalThis.history.replaceState(null, '', `#/tests/${nextTest}`);
  }, []);

  return (
    <div style={{ marginTop: 8 }}>
      <Tabs
        id="tests-tabs"
        size="medium"
        selectedTabId={testId}
        onChange={handleChange}
        renderActiveTabPanelOnly
      >
        <Tab
          id="forward"
          title="Molfile → InChI"
          panel={
            <div style={{ marginTop: 12 }}>
              <ForwardTestPanel />
            </div>
          }
        />
        <Tab
          id="roundtrip"
          title="Roundtrip (Molfile → InChI → Molfile)"
          panel={
            <div style={{ marginTop: 12 }}>
              <RoundtripPanel />
            </div>
          }
        />
      </Tabs>
    </div>
  );
}
