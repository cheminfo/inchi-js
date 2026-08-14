import { Callout, HTMLTable } from '@blueprintjs/core';

import { splitComponents } from '../inchi/connections.ts';
import {
  parseFixedHydrogens,
  parseMobileHydrogens,
} from '../inchi/hydrogens.ts';

/**
 * Decode an `/h` layer into plain sentences: which atoms carry how many
 * hydrogens, and which hydrogens are shared over a group instead.
 * @param props - Component props.
 * @param props.layer - Content of the `/h` segment.
 * @returns The decoded layer.
 */
export function HydrogenPanel(props: { layer: string }) {
  const { layer } = props;

  if (!layer) {
    return (
      <Callout compact intent="primary">
        This structure carries no hydrogens at all, so there is no `/h` layer.
      </Callout>
    );
  }
  const components = splitComponents(layer);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {components.map((component, index) => {
        const fixed = parseFixedHydrogens(component);
        const mobile = parseMobileHydrogens(component);
        return (
          <div
            key={`component-${offsetOf(components, index)}`}
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            {components.length > 1 && (
              <div className="muted" style={{ fontSize: 12 }}>
                Component {index + 1} of {components.length}
                {component ? '' : ' — carries no hydrogens'}
              </div>
            )}
            {(fixed.length > 0 || mobile.length > 0) && (
              <HTMLTable compact striped className="guide-table">
                <thead>
                  <tr>
                    <th>Written as</th>
                    <th>Atoms</th>
                    <th>Reads as</th>
                  </tr>
                </thead>
                <tbody>
                  {fixed.map((group) => (
                    <tr key={`fixed-${group.atoms.join('-')}`}>
                      <td className="mono">
                        {collapse(group.atoms)}H
                        {group.hydrogens > 1 ? group.hydrogens : ''}
                      </td>
                      <td className="mono">{group.atoms.join(', ')}</td>
                      <td>
                        {group.atoms.length === 1 ? 'atom' : 'each of atoms'}{' '}
                        {group.atoms.join(', ')} carries {group.hydrogens}{' '}
                        hydrogen{group.hydrogens === 1 ? '' : 's'}
                      </td>
                    </tr>
                  ))}
                  {mobile.map((group) => (
                    <tr key={`mobile-${group.atoms.join('-')}`}>
                      <td className="mono">
                        (H{group.hydrogens > 1 ? group.hydrogens : ''}
                        {group.charges > 0
                          ? `-${group.charges > 1 ? group.charges : ''}`
                          : ''}
                        ,{group.atoms.join(',')})
                      </td>
                      <td className="mono">{group.atoms.join(', ')}</td>
                      <td>
                        {group.hydrogens} mobile hydrogen
                        {group.hydrogens === 1 ? '' : 's'} shared over atoms{' '}
                        {group.atoms.join(', ')}
                        {group.charges > 0 &&
                          `, carrying ${group.charges} negative charge${group.charges === 1 ? '' : 's'}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </HTMLTable>
            )}
          </div>
        );
      })}
      {components.some((component) => component.includes('(')) && (
        <Callout compact intent="warning">
          A parenthesised group is the reason tautomers of this structure share
          one identifier. Its atoms also count no hydrogen of their own when the
          atoms were ranked, which is visible in the numbering table.
        </Callout>
      )}
    </div>
  );
}

function collapse(atoms: number[]): string {
  const parts: string[] = [];
  let start = 0;
  for (let i = 1; i <= atoms.length; i++) {
    const previous = atoms[i - 1] as number;
    if (i === atoms.length || (atoms[i] as number) !== previous + 1) {
      const first = atoms[start] as number;
      parts.push(first === previous ? `${first}` : `${first}-${previous}`);
      start = i;
    }
  }
  return parts.join(',');
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
