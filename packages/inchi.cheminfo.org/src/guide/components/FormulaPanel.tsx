import { HTMLTable } from '@blueprintjs/core';
import type { Molecule } from 'openchemlib';
import { MF } from 'react-mf';

import { hillElementOrder } from '../inchi/invariants.ts';

/**
 * Show the element counts a formula is built from, in Hill order, next to
 * the ranking order the numbering step uses — the two differ only in
 * where hydrogen sits, which is a recurring trap.
 * @param props - Component props.
 * @param props.molecule - The structure to count.
 * @param props.formula - The formula layer the engine produced.
 * @returns The counts table.
 */
export function FormulaPanel(props: { molecule: Molecule; formula: string }) {
  const { molecule, formula } = props;

  const counts = elementCounts(molecule);
  const formulaOrder = hillFormulaOrder([...counts.keys()]);
  const rankingOrder = hillElementOrder([...counts.keys()]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <HTMLTable compact striped className="guide-table">
        <thead>
          <tr>
            <th>Element</th>
            <th>Count</th>
            <th>Position in the formula</th>
            <th>Position when ranking atoms</th>
          </tr>
        </thead>
        <tbody>
          {formulaOrder.map((element) => (
            <tr key={element}>
              <td className="mono guide-token">{element}</td>
              <td className="mono guide-token">{counts.get(element)}</td>
              <td className="mono guide-token">
                {formulaOrder.indexOf(element) + 1}
              </td>
              <td className="mono guide-token">
                {element === 'H' ? '—' : rankingOrder.indexOf(element) + 1}
              </td>
            </tr>
          ))}
        </tbody>
      </HTMLTable>
      <div className="result-card">
        <div className="muted" style={{ fontSize: 12 }}>
          Formula layer
        </div>
        <MF mf={formula} />
      </div>
      <div className="muted" style={{ fontSize: 12 }}>
        Hydrogen comes second in the formula but last in the ranking order, and
        it is left out of the skeleton altogether — hence the dash.
      </div>
    </div>
  );
}

function elementCounts(molecule: Molecule): Map<string, number> {
  const counts = new Map<string, number>();
  const atomCount = molecule.getAllAtoms();
  let hydrogens = 0;
  for (let i = 0; i < atomCount; i++) {
    const element = molecule.getAtomLabel(i);
    if (element === 'H') {
      hydrogens++;
      continue;
    }
    counts.set(element, (counts.get(element) ?? 0) + 1);
    hydrogens += molecule.getAllHydrogens(i);
  }
  if (hydrogens > 0) counts.set('H', hydrogens);
  return counts;
}

function hillFormulaOrder(elements: string[]): string[] {
  // Without carbon, Hill order is plain alphabetical — hydrogen included.
  if (!elements.includes('C')) return elements.toSorted();
  const rest: string[] = [];
  let hasHydrogen = false;
  for (const element of elements) {
    if (element === 'C') continue;
    else if (element === 'H') hasHydrogen = true;
    else rest.push(element);
  }
  rest.sort();
  return hasHydrogen ? ['C', 'H', ...rest] : ['C', ...rest];
}
