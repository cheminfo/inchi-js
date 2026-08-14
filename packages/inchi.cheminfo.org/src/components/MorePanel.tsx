import { AboutPanel } from './AboutPanel.tsx';
import { DownloadPanel } from './DownloadPanel.tsx';
import { TestsPanel } from './TestsPanel.tsx';
import type { MoreTabId } from './moreTabs.ts';

/** Props of {@link MorePanel}. */
export interface MorePanelProps {
  /** The page picked in the More dropdown. */
  tab: MoreTabId;
}

/**
 * The page behind the More dropdown: the IUPAC test suites, the bundle
 * download, or the project background.
 * @param props - The page to show.
 * @returns That page.
 */
export function MorePanel(props: MorePanelProps) {
  const { tab } = props;

  return (
    <div style={{ marginTop: 12 }}>
      {tab === 'tests' && <TestsPanel />}
      {tab === 'download' && <DownloadPanel />}
      {tab === 'about' && <AboutPanel />}
    </div>
  );
}
