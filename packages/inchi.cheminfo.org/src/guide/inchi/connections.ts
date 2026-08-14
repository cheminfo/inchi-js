export type ConnectionKind = 'chain' | 'branch' | 'closure';

export interface ConnectionStep {
  /** Canonical number the bond starts from. */
  from: number;
  /** Canonical number the bond leads to. */
  to: number;
  /**
   * `chain` when the walk carries straight on, `branch` when it went back
   * to an earlier atom to take another of its neighbours, `closure` when
   * the bond closes a ring instead of reaching a new atom.
   */
  kind: ConnectionKind;
}

/**
 * Replay the depth-first walk a `/c` layer encodes. Parentheses in the
 * layer hold every continuation of an atom but the last, so leaving one
 * restores the atom the branch started at.
 * @param layer - Content of the `/c` segment of one component.
 * @returns The bonds in the order the layer writes them.
 */
export function parseConnections(layer: string): ConnectionStep[] {
  const steps: ConnectionStep[] = [];
  const seen = new Set<number>();
  const stack: number[] = [];
  let current: number | null = null;
  let returned = false;
  let index = 0;

  while (index < layer.length) {
    const character = layer[index] as string;
    if (isDigit(character)) {
      let end = index;
      while (end < layer.length && isDigit(layer[end])) end++;
      const atom = Number.parseInt(layer.slice(index, end), 10);
      if (current === null) {
        current = atom;
        seen.add(atom);
      } else if (seen.has(atom)) {
        steps.push({ from: current, to: atom, kind: 'closure' });
      } else {
        steps.push({
          from: current,
          to: atom,
          kind: returned ? 'branch' : 'chain',
        });
        seen.add(atom);
        current = atom;
      }
      returned = false;
      index = end;
      continue;
    }
    if (character === '(') {
      if (current !== null) stack.push(current);
    } else if (character === ',' || character === ')') {
      const parent = character === ')' ? stack.pop() : stack.at(-1);
      if (parent !== undefined) {
        current = parent;
        returned = true;
      }
    }
    index++;
  }
  return steps;
}

/**
 * Split a layer into its per-component parts. Components are separated by
 * semicolons, and a run of identical components is written once behind a
 * `N*` multiplier.
 * @param layer - Content of a segment.
 * @returns One string per component, multipliers expanded.
 */
export function splitComponents(layer: string): string[] {
  const parts: string[] = [];
  for (const chunk of layer.split(';')) {
    const match = /^(?<count>\d+)\*(?<body>.*)$/s.exec(chunk);
    if (match) {
      const count = Number.parseInt(match.groups?.count ?? '1', 10);
      for (let i = 0; i < count; i++) parts.push(match.groups?.body ?? '');
    } else {
      parts.push(chunk);
    }
  }
  return parts;
}

function isDigit(character: string | undefined): boolean {
  return character !== undefined && character >= '0' && character <= '9';
}
