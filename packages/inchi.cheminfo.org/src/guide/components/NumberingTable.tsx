import { Callout, HTMLTable, Tag } from '@blueprintjs/core';

import type { CanonicalRanking } from '../inchi/canonicalRanking.ts';
import type { Derivation } from '../inchi/derivation.ts';
import { countDistinct } from '../inchi/invariants.ts';

/**
 * Show the staged hand derivation of the canonical numbering: the three
 * invariants per atom, what each stage settles on, and whether the result
 * agrees with the numbering the engine actually used.
 * @param props - Component props.
 * @param props.derivation - The derivation to display.
 * @returns The table and its verdict.
 */
export function NumberingTable(props: { derivation: Derivation }) {
  const { derivation } = props;

  const { ranking, engineNumbers, matchesEngine, componentCount } = derivation;
  const { invariants, stages, hillOrder, ranks, usedTieBreaking } = ranking;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="muted" style={{ fontSize: 12 }}>
        Element ranking order for this structure:{' '}
        <span className="mono">{hillOrder.join(' < ')}</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <HTMLTable compact striped className="guide-table">
          <thead>
            <tr>
              <th>Atom</th>
              <th>El.</th>
              <th title="Position of the element in the ranking order">Hill</th>
              <th title="Connections to heavy atoms">Conn.</th>
              <th title="Attached hydrogens; 0 on a mobile-H endpoint">H</th>
              {stages.map((stage) => (
                <th key={stage.id} title={stage.addedKey}>
                  {stage.title}
                </th>
              ))}
              <th>Engine</th>
            </tr>
          </thead>
          <tbody>
            {invariants.map((invariant, index) => (
              <tr key={invariant.atom}>
                <td className="mono guide-token">{invariant.atom}</td>
                <td className="mono guide-token">{invariant.element}</td>
                <td className="mono guide-token">{invariant.hillRank}</td>
                <td className="mono guide-token">{invariant.connections}</td>
                <td className="mono guide-token">
                  {invariant.hydrogens}
                  {invariant.mobileGroupSize > 0 && (
                    <span className="muted" title="mobile-H endpoint">
                      {' '}
                      *
                    </span>
                  )}
                </td>
                {stages.map((stage) => (
                  <td key={stage.id} className="mono guide-token">
                    {stage.ranks[index]}
                  </td>
                ))}
                <td className="mono guide-token">
                  <strong>{engineNumbers.get(invariant.atom) ?? '—'}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </HTMLTable>
      </div>
      <StageSummary ranking={ranking} atomCount={ranks.length} />
      <Verdict
        matchesEngine={matchesEngine}
        componentCount={componentCount}
        usedTieBreaking={usedTieBreaking}
      />
    </div>
  );
}

function StageSummary({
  ranking,
  atomCount,
}: {
  ranking: CanonicalRanking;
  atomCount: number;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {ranking.stages.map((stage) => (
        <Tag key={stage.id} minimal round>
          {stage.title}: {countDistinct(stage.keyedRanks)} classes from the
          invariants
          {stage.rounds > 0 &&
            `, ${stage.distinctRanks}/${atomCount} after ${stage.rounds} refinement round${stage.rounds === 1 ? '' : 's'}`}
          {stage.rounds === 0 && !stage.tieBreaks && ' — refinement split none'}
          {stage.tieBreaks &&
            ` (${stage.tieBreaks.length} tie${stage.tieBreaks.length === 1 ? '' : 's'} broken)`}
        </Tag>
      ))}
    </div>
  );
}

function Verdict({
  matchesEngine,
  componentCount,
  usedTieBreaking,
}: {
  matchesEngine: boolean;
  componentCount: number;
  usedTieBreaking: boolean;
}) {
  if (componentCount > 1) {
    return (
      <Callout intent="primary" compact>
        This structure has {componentCount} components. The engine numbers each
        one separately; the hand derivation above treats the whole drawing at
        once, so the two columns are not comparable here.
      </Callout>
    );
  }
  if (matchesEngine) {
    return (
      <Callout intent="success" compact>
        The hand derivation reproduced the engine&rsquo;s numbering exactly
        {usedTieBreaking
          ? ', including the ties it had to break arbitrarily.'
          : ', with no arbitrary choice needed.'}
      </Callout>
    );
  }
  return (
    <Callout intent="warning" compact>
      The two numberings differ. Every layer below still comes from the engine
      and is correct — what this means is that the hand procedure had to make a
      choice the engine resolved by searching, which is exactly the limit
      described in the tie-breaking step.
    </Callout>
  );
}
