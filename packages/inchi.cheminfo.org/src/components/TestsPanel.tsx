import { Tab, Tabs } from '@blueprintjs/core';
import { useSignals } from '@preact/signals-react/runtime';

import { selectTestsTab, state } from '../state/index.ts';

import { ForwardTestPanel } from './ForwardTestPanel.tsx';
import { RoundtripPanel } from './RoundtripPanel.tsx';

/**
 * "Tests" tab — bundles two complementary test categories against the
 * vendored IUPAC test SDFs:
 *
 *   • Molfile → InChI — must pass on every record (regression check
 *     on the embedded WASM build).
 *   • Roundtrip (Molfile → InChI → Molfile → InChI) — the two InChI
 *     strings must be byte-identical for the round-trip to count as OK.
 *
 * The active sub-tab is reflected in the URL hash so links are
 * deep-shareable.
 * @returns The Tests tab JSX.
 */
export function TestsPanel() {
  useSignals();
  const testId = state.view.testsTab.value;

  return (
    <div style={{ marginTop: 8 }}>
      <Tabs
        id="tests-tabs"
        size="medium"
        selectedTabId={testId}
        onChange={selectTestsTab}
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
