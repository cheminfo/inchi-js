import { ProgressBar } from '@blueprintjs/core';
import type { ReactNode } from 'react';

import type { RunProgress } from '../../roundtrip/runOverSdf.ts';

/**
 * The `done / total` line and bar shown while a fixture is running. The
 * per-status tally on the right differs per test, so it comes in as a
 * node rather than being derived here.
 * @param props - Component props.
 * @param props.progress - How many records are done out of the total.
 * @param props.running - Whether the run is still going, which animates the bar.
 * @param props.summary - The right-hand tally, e.g. `ok 12 · errors 0`.
 * @returns The progress row.
 */
export function ProgressRow(props: {
  progress: RunProgress;
  running: boolean;
  summary: ReactNode;
}) {
  const { progress, running, summary } = props;
  const fraction = progress.total === 0 ? 0 : progress.done / progress.total;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
        }}
      >
        <span className="muted">
          {progress.done.toLocaleString()} / {progress.total.toLocaleString()}{' '}
          structures processed
        </span>
        <span className="muted">{summary}</span>
      </div>
      <ProgressBar
        animate={running}
        stripes={running}
        intent={running ? 'primary' : 'success'}
        value={fraction}
      />
    </div>
  );
}
