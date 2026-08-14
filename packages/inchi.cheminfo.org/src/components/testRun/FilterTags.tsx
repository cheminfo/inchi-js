import { Tag } from '@blueprintjs/core';

/** One capsule of a {@link FilterTags} row. */
export interface FilterOption<TFilter extends string> {
  id: TFilter;
  label: string;
  count: number;
  intent: 'success' | 'warning' | 'danger' | 'primary';
}

/**
 * The capsule row that narrows a results table. Each capsule keeps its
 * semantic colour whether or not it is active — `minimal` is what encodes
 * the selection.
 * @param props - Component props.
 * @param props.filter - The active capsule.
 * @param props.onChange - Called with the newly picked filter.
 * @param props.options - One entry per capsule, in display order.
 * @returns The filter row.
 */
export function FilterTags<TFilter extends string>(props: {
  filter: TFilter;
  onChange: (filter: TFilter) => void;
  options: Array<FilterOption<TFilter>>;
}) {
  const { filter, onChange, options } = props;

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map((option) => (
        <Tag
          key={option.id}
          interactive
          minimal={filter !== option.id}
          intent={option.intent}
          onClick={() => onChange(option.id)}
        >
          {option.label} ({option.count.toLocaleString()})
        </Tag>
      ))}
    </div>
  );
}
