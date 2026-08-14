import type { Intent } from '@blueprintjs/core';
import { Button, InputGroup, Switch, Tag } from '@blueprintjs/core';

import { ROW_STATUSES } from '../previewFilter.ts';
import type { RowStatus } from '../previewModel.ts';

/** Colour and wording of each outcome capsule. */
const STATUS_LABEL: Record<RowStatus, string> = {
  ok: 'converted',
  warning: 'warnings',
  error: 'errors',
};
const STATUS_INTENT: Record<RowStatus, Intent> = {
  ok: 'success',
  warning: 'warning',
  error: 'danger',
};

/** Props of {@link PreviewToolbar}. */
export interface PreviewToolbarProps {
  /** Current search text. */
  query: string;
  onQueryChange: (query: string) => void;
  /** Statuses kept; empty keeps every record. */
  statuses: ReadonlySet<RowStatus>;
  onStatusesChange: (statuses: ReadonlySet<RowStatus>) => void;
  /** How many records ended in each status. */
  counts: Record<RowStatus, number> | null;
  /** Records the file holds, and how many the filter keeps. */
  total: number;
  shown: number;
  /** Whether the molecules are drawn. */
  showStructures: boolean;
  onShowStructuresChange: (show: boolean) => void;
}

/**
 * Search box, outcome capsules and structure toggle sitting above the preview
 * table.
 * @param props - The filter state and the callbacks that change it.
 * @returns The toolbar JSX.
 */
export function PreviewToolbar(props: PreviewToolbarProps) {
  const {
    query,
    onQueryChange,
    statuses,
    onStatusesChange,
    counts,
    total,
    shown,
    showStructures,
    onShowStructuresChange,
  } = props;

  function toggleStatus(status: RowStatus) {
    const next = new Set(statuses);
    if (!next.delete(status)) next.add(status);
    onStatusesChange(next);
  }

  return (
    <div className="preview-toolbar">
      <InputGroup
        leftIcon="search"
        placeholder="Search every column…"
        value={query}
        onValueChange={onQueryChange}
        rightElement={
          query ? (
            <Button
              icon="cross"
              variant="minimal"
              onClick={() => onQueryChange('')}
            />
          ) : undefined
        }
        style={{ width: 260 }}
      />

      {counts && (
        <div className="preview-capsules">
          <Tag
            interactive
            minimal={statuses.size > 0}
            onClick={() => onStatusesChange(new Set())}
          >
            all ({total.toLocaleString()})
          </Tag>
          {ROW_STATUSES.map((status) => (
            <Tag
              key={status}
              interactive
              minimal={!statuses.has(status)}
              intent={STATUS_INTENT[status]}
              onClick={() => toggleStatus(status)}
            >
              {STATUS_LABEL[status]} ({counts[status].toLocaleString()})
            </Tag>
          ))}
        </div>
      )}

      <div style={{ flex: 1 }} />

      <span className="muted" style={{ fontSize: 12 }}>
        {shown === total
          ? `${total.toLocaleString()} record${total === 1 ? '' : 's'}`
          : `${shown.toLocaleString()} of ${total.toLocaleString()} records`}
      </span>

      <Switch
        checked={showStructures}
        onChange={(event) => {
          onShowStructuresChange(event.currentTarget.checked);
        }}
        label="Structures"
        style={{ margin: 0 }}
      />
    </div>
  );
}
