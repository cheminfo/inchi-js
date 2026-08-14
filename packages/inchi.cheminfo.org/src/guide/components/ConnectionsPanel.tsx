import { Callout, HTMLTable, Tag } from '@blueprintjs/core';

import type { ConnectionStep } from '../inchi/connections.ts';
import { parseConnections, splitComponents } from '../inchi/connections.ts';

const KIND_LABEL: Record<ConnectionStep['kind'], string> = {
  chain: 'carry on',
  branch: 'back to it for another neighbour',
  closure: 'closes a ring',
};

const KIND_INTENT: Record<
  ConnectionStep['kind'],
  'primary' | 'warning' | null
> = {
  chain: null,
  branch: 'primary',
  closure: 'warning',
};

/**
 * Replay the `/c` layer bond by bond, so the walk it encodes can be
 * followed against the numbered drawing beside it.
 * @param props - Component props.
 * @param props.layer - Content of the `/c` segment.
 * @returns The walk, one row per bond.
 */
export function ConnectionsPanel(props: { layer: string }) {
  const { layer } = props;

  const components = splitComponents(layer);
  if (components.length === 0 || !layer) {
    return (
      <Callout compact intent="primary">
        This structure is a single atom, so it has no connections layer at all.
      </Callout>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {components.map((component, index) => (
        <ComponentWalk
          key={`component-${offsetOf(components, index)}`}
          component={component}
          index={index}
          total={components.length}
        />
      ))}
      <div className="muted" style={{ fontSize: 12 }}>
        A row marked <em>back to it</em> is where the layer left a parenthesis
        and returned to an earlier atom; a ring closure is a number the walk had
        already visited.
      </div>
    </div>
  );
}

function ComponentWalk({
  component,
  index,
  total,
}: {
  component: string;
  index: number;
  total: number;
}) {
  const steps = parseConnections(component);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {total > 1 && (
        <div className="muted" style={{ fontSize: 12 }}>
          Component {index + 1} of {total}
          {component ? '' : ' — contributes no connections'}
        </div>
      )}
      {steps.length > 0 && (
        <HTMLTable compact striped className="guide-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Bond</th>
              <th>What the walk did</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((step, position) => (
              <tr key={`${position + 1}:${step.from}-${step.to}`}>
                <td className="mono guide-token">{position + 1}</td>
                <td className="mono guide-token">
                  {step.from} → {step.to}
                </td>
                <td>
                  {KIND_INTENT[step.kind] === null ? (
                    <span className="muted">{KIND_LABEL[step.kind]}</span>
                  ) : (
                    <Tag minimal intent={KIND_INTENT[step.kind] ?? undefined}>
                      {KIND_LABEL[step.kind]}
                    </Tag>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </HTMLTable>
      )}
    </div>
  );
}

/**
 * Character offset of a component inside the layer it came from, used as
 * a stable key that does not depend on the array index.
 * @param components - Every component of the layer.
 * @param index - Position of the component.
 * @returns The offset of that component.
 */
function offsetOf(components: readonly string[], index: number): number {
  let offset = 0;
  for (let i = 0; i < index; i++) {
    offset += (components[i] as string).length + 1;
  }
  return offset;
}
