import { Callout, HTMLTable } from '@blueprintjs/core';

import type { SplitInchi } from '../inchi/layers.ts';
import { findSegment } from '../inchi/layers.ts';

interface DecodedEntry {
  written: string;
  reads: string;
}

/**
 * Decode the stereo and isotopic layers into sentences, so a sign can be
 * checked against the drawing without holding the conventions in mind.
 * @default showIsotopes false
 * @param props - Component props.
 * @param props.split - The parsed InChI.
 * @param props.showIsotopes - Decode `/i` instead of the stereo layers.
 * @returns The decoded layers.
 */
export function StereoPanel(props: {
  split: SplitInchi;
  showIsotopes?: boolean;
}) {
  const { split, showIsotopes = false } = props;

  const entries = showIsotopes ? isotopeEntries(split) : stereoEntries(split);
  if (entries.length === 0) {
    return (
      <Callout compact intent="primary">
        {showIsotopes
          ? 'Nothing is labelled here, so there is no isotopic layer.'
          : 'This structure has no stereo layers — no stereogenic bond or centre was found.'}
      </Callout>
    );
  }
  return (
    <HTMLTable compact striped className="guide-table">
      <thead>
        <tr>
          <th>Layer</th>
          <th>Reads as</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.written}>
            <td className="mono guide-token">{entry.written}</td>
            <td>{entry.reads}</td>
          </tr>
        ))}
      </tbody>
    </HTMLTable>
  );
}

function stereoEntries(split: SplitInchi): DecodedEntry[] {
  const entries: DecodedEntry[] = [];
  const doubleBonds = findSegment(split, 'b', 'stereo');
  if (doubleBonds) {
    for (const item of doubleBonds.value.split(',')) {
      entries.push({ written: `/b${item}`, reads: readDoubleBond(item) });
    }
  }
  const tetrahedral = findSegment(split, 't', 'stereo');
  if (tetrahedral) {
    for (const item of tetrahedral.value.split(',')) {
      entries.push({ written: `/t${item}`, reads: readTetrahedral(item) });
    }
  }
  const mirror = findSegment(split, 'm', 'stereo');
  if (mirror) {
    entries.push({
      written: `/m${mirror.value}`,
      reads:
        mirror.value === '1'
          ? 'the parities written in /t are those of the mirror image, so this compound is the other enantiomer'
          : 'the parities written in /t are those of this compound as drawn',
    });
  }
  const type = findSegment(split, 's', 'stereo');
  if (type) {
    entries.push({
      written: `/s${type.value}`,
      reads: readStereoType(type.value),
    });
  }
  return entries;
}

function isotopeEntries(split: SplitInchi): DecodedEntry[] {
  const layer = findSegment(split, 'i', 'isotopic');
  if (!layer) return [];
  if (!layer.value) {
    const exchangeable = findSegment(split, 'h', 'isotopic');
    if (!exchangeable) return [];
    return [
      {
        written: `/i/h${exchangeable.value}`,
        reads: `${exchangeable.value} — a label on an exchangeable hydrogen, which belongs to a mobile-H group rather than to one atom`,
      },
    ];
  }
  const entries: DecodedEntry[] = [];
  for (const item of layer.value.split(',')) {
    entries.push({ written: `/i${item}`, reads: readIsotope(item) });
  }
  const exchangeable = findSegment(split, 'h', 'isotopic');
  if (exchangeable) {
    entries.push({
      written: `/i/h${exchangeable.value}`,
      reads: 'labelled hydrogens that sit in a mobile-H group',
    });
  }
  return entries;
}

function readDoubleBond(item: string): string {
  const match = /^(?<a>\d+)-(?<b>\d+)(?<sign>[+\-?])$/.exec(item);
  if (!match) return item;
  const { a, b, sign } = match.groups as Record<string, string>;
  if (sign === '?') {
    return `the configuration of the bond between atoms ${a} and ${b} is not known`;
  }
  const side = sign === '-' ? 'the same side of' : 'opposite sides of';
  return `on the bond between atoms ${a} and ${b}, the higher-numbered neighbour at each end lies on ${side} the bond`;
}

function readTetrahedral(item: string): string {
  const match = /^(?<atom>\d+)(?<sign>[+\-?])$/.exec(item);
  if (!match) return item;
  const { atom, sign } = match.groups as Record<string, string>;
  if (sign === '?') {
    return `atom ${atom} is a stereocentre of unknown configuration`;
  }
  const direction = sign === '+' ? 'clockwise' : 'anticlockwise';
  return `looking from the hydrogen — or the lowest-numbered neighbour — towards atom ${atom}, the other three neighbours run ${direction} in increasing canonical number`;
}

function readStereoType(value: string): string {
  if (value === '1') {
    return 'absolute stereochemistry';
  }
  if (value === '2') {
    return 'relative stereochemistry, so no /m layer is written';
  }
  if (value === '3') {
    return 'racemic';
  }
  return `stereo type ${value}`;
}

function readIsotope(item: string): string {
  const match = /^(?<atom>\d+)(?<shift>[+-]\d+)?(?<label>[DT]\d*)?$/.exec(item);
  if (!match) return item;
  const { atom, shift, label } = match.groups as Record<
    string,
    string | undefined
  >;
  const parts: string[] = [];
  if (shift) {
    parts.push(
      `atom ${atom} is ${shift.replace('+', '')} mass unit${Math.abs(Number.parseInt(shift, 10)) === 1 ? '' : 's'} from the rounded average mass`,
    );
  }
  if (label) {
    const count = label.slice(1) || '1';
    parts.push(
      `atom ${atom} carries ${count} ${label.startsWith('D') ? 'deuterium' : 'tritium'}${count === '1' ? '' : 's'}`,
    );
  }
  return parts.join('; ') || item;
}
