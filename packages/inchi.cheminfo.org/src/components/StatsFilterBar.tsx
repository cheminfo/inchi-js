import { Button, Callout, Tag } from '@blueprintjs/core';

import { FastTooltip } from './FastTooltip.tsx';
import type { Stats, StatusFilter } from './sdfRows.ts';

const FILTERS: Array<{
  key: StatusFilter;
  label: string;
  intent: 'success' | 'danger' | 'warning';
}> = [
  { key: 'ok', label: 'OK', intent: 'success' },
  { key: 'error', label: 'Errors', intent: 'danger' },
  { key: 'warning', label: 'Warnings', intent: 'warning' },
];

/**
 * Summary callout above the molecule table. Shows the overall success
 * count and three toggleable status tags (OK / Errors / Warnings) that
 * filter the table. Clicking an active tag clears it; a "Clear" button
 * appears while any filter is active.
 * @param props - Component props.
 * @param props.stats - Aggregated counts over every computed molecule.
 * @param props.activeFilters - The currently active status filters.
 * @param props.filteredCount - Number of rows currently visible.
 * @param props.onToggle - Toggle a single status filter on or off.
 * @param props.onClear - Clear every active filter.
 * @returns The stats and filter bar JSX.
 */
export function StatsFilterBar({
  stats,
  activeFilters,
  filteredCount,
  onToggle,
  onClear,
}: {
  stats: Stats;
  activeFilters: Set<StatusFilter>;
  filteredCount: number;
  onToggle: (filter: StatusFilter) => void;
  onClear: () => void;
}) {
  const counts: Record<StatusFilter, number> = {
    ok: stats.ok,
    error: stats.error,
    warning: stats.warning,
  };
  const hasFilter = activeFilters.size > 0;
  return (
    <Callout
      icon={stats.error === 0 ? 'tick-circle' : 'warning-sign'}
      intent={stats.error === 0 ? 'success' : 'warning'}
      title={`${stats.ok.toLocaleString()} / ${stats.total.toLocaleString()} structures produced an InChI`}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginTop: 4,
          alignItems: 'center',
        }}
      >
        {FILTERS.map((filter) => (
          <FilterTag
            key={filter.key}
            label={filter.label}
            count={counts[filter.key]}
            intent={filter.intent}
            active={activeFilters.has(filter.key)}
            onToggle={() => onToggle(filter.key)}
          />
        ))}
        {hasFilter && (
          <>
            <span className="muted" style={{ fontSize: 12 }}>
              · showing {filteredCount.toLocaleString()} /{' '}
              {stats.total.toLocaleString()}
            </span>
            <Button
              variant="minimal"
              size="small"
              icon="filter-remove"
              onClick={onClear}
            >
              Clear
            </Button>
          </>
        )}
      </div>
    </Callout>
  );
}

function FilterTag({
  label,
  count,
  intent,
  active,
  onToggle,
}: {
  label: string;
  count: number;
  intent: 'success' | 'danger' | 'warning';
  active: boolean;
  onToggle: () => void;
}) {
  const interactive = count > 0;
  let title = `Click to show only ${label}`;
  if (!interactive) title = `No ${label.toLowerCase()} to filter`;
  else if (active) title = `Showing only ${label} — click to clear`;
  return (
    <FastTooltip content={title}>
      <Tag
        intent={intent}
        minimal={!active}
        interactive={interactive}
        icon={active ? 'filter' : undefined}
        onClick={interactive ? onToggle : undefined}
        style={interactive ? undefined : { opacity: 0.55, cursor: 'default' }}
      >
        {label}: {count}
      </Tag>
    </FastTooltip>
  );
}
