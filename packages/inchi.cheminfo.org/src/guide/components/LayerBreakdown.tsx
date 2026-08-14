import { Tooltip } from '@blueprintjs/core';

import type { FocusLayer } from '../data/types.ts';
import type { InchiSegment } from '../inchi/layers.ts';
import { defaultBlockFor, splitInchi } from '../inchi/layers.ts';

const BLOCK_COLOURS: Record<string, string> = {
  main: '#215db0',
  charge: '#935610',
  stereo: '#9d3f5b',
  isotopic: '#5a4fa3',
  fixedH: '#1c6e42',
  reconnected: '#5f6b7c',
  polymer: '#5f6b7c',
};

/**
 * Show an InChI string cut into its layers, each hoverable and coloured
 * by the block it belongs to, with one layer optionally singled out.
 * @param props - Component props.
 * @param props.inchi - The InChI string to break down.
 * @param props.focus - Layer to highlight, if any.
 * @returns The annotated string.
 */
export function LayerBreakdown(props: {
  inchi: string;
  focus?: FocusLayer | null;
}) {
  const { inchi, focus } = props;

  const split = splitInchi(inchi);
  if (split.segments.length === 0) {
    return <div className="muted">No InChI yet.</div>;
  }
  return (
    <div className="guide-layers mono">
      <span className="guide-layer-version">{split.version}</span>
      {segmentKeys(split.segments).map(([key, segment], index) => (
        <Segment
          key={key}
          segment={segment}
          highlighted={isFocused(segment, focus)}
          alternate={index % 2 === 1}
        />
      ))}
    </div>
  );
}

function Segment({
  segment,
  highlighted,
  alternate,
}: {
  segment: InchiSegment;
  highlighted: boolean;
  alternate: boolean;
}) {
  const colour = BLOCK_COLOURS[segment.block] ?? '#1c2127';
  // Neighbouring layers often share a block colour, so the tint alternates to
  // keep the boundary readable without a gap between the highlights.
  const tint = highlighted ? 30 : alternate ? 18 : 9;
  return (
    <Tooltip
      content={`${segment.name} — ${segment.block} block`}
      hoverOpenDelay={150}
    >
      <span
        className={
          highlighted ? 'guide-layer guide-layer-focus' : 'guide-layer'
        }
        style={{
          color: colour,
          background: `color-mix(in srgb, ${colour} ${tint}%, transparent)`,
        }}
      >
        /{segment.letter}
        {segment.value}
      </span>
    </Tooltip>
  );
}

/**
 * Give each segment a key built from what comes before it, so the list is
 * keyed by position in the string rather than by array index.
 * @param segments - The segments to key.
 * @returns Key/segment pairs in order.
 */
function segmentKeys(
  segments: readonly InchiSegment[],
): Array<[string, InchiSegment]> {
  const pairs: Array<[string, InchiSegment]> = [];
  let offset = 0;
  for (const segment of segments) {
    pairs.push([`${offset}-${segment.letter}`, segment]);
    offset += segment.letter.length + segment.value.length + 1;
  }
  return pairs;
}

function isFocused(
  segment: InchiSegment,
  focus: FocusLayer | null | undefined,
): boolean {
  if (!focus) return false;
  if (segment.letter !== focus.letter) return false;
  return segment.block === (focus.block ?? defaultBlockFor(focus.letter));
}
