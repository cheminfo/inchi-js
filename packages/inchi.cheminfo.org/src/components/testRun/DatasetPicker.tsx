import { Button, HTMLSelect } from '@blueprintjs/core';

import type { TestDataset } from '../../roundtrip/datasets.ts';
import { TEST_DATASETS } from '../../roundtrip/datasets.ts';

/**
 * The dataset row every test panel opens with: pick a vendored IUPAC
 * fixture, start or stop the run, and read what the fixture holds.
 * @param props - Component props.
 * @param props.selectId - DOM id tying the label to the select.
 * @param props.runLabel - Text of the start button, e.g. `Run roundtrip`.
 * @param props.selectedDatasetId - Id of the dataset on show.
 * @param props.onSelect - Called with the newly picked dataset id.
 * @param props.selectedDataset - The picked dataset, undefined while none matches.
 * @param props.running - Whether a run is in flight, which swaps the button.
 * @param props.onRun - Starts a run.
 * @param props.onStop - Terminates the running worker.
 * @returns The picker row.
 */
export function DatasetPicker(props: {
  selectId: string;
  runLabel: string;
  selectedDatasetId: string;
  onSelect: (id: string) => void;
  selectedDataset: TestDataset | undefined;
  running: boolean;
  onRun: () => void;
  onStop: () => void;
}) {
  const {
    selectId,
    runLabel,
    selectedDatasetId,
    onSelect,
    selectedDataset,
    running,
    onRun,
    onStop,
  } = props;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
      }}
    >
      <label htmlFor={selectId} className="muted" style={{ fontSize: 12 }}>
        Dataset
      </label>
      <HTMLSelect
        id={selectId}
        value={selectedDatasetId}
        onChange={(event) => onSelect(event.currentTarget.value)}
        disabled={running}
      >
        {TEST_DATASETS.map((dataset) => (
          <option key={dataset.id} value={dataset.id}>
            {dataset.filename} (~{dataset.approxCount.toLocaleString()})
          </option>
        ))}
      </HTMLSelect>
      {running ? (
        <Button icon="stop" intent="danger" onClick={onStop} variant="solid">
          Stop
        </Button>
      ) : (
        <Button icon="play" intent="primary" onClick={onRun} variant="solid">
          {runLabel}
        </Button>
      )}
      {selectedDataset && (
        <span className="muted" style={{ fontSize: 12 }}>
          {selectedDataset.description} — <code>{selectedDataset.origin}</code>
        </span>
      )}
    </div>
  );
}
