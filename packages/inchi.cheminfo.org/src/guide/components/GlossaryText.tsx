import { Tooltip } from '@blueprintjs/core';
import type { ReactNode } from 'react';

import { GLOSSARY } from '../data/glossary.ts';
import type { GlossaryEntry } from '../data/types.ts';

const MARKER = /\[\[(?<term>[^\]]+)\]\]/g;

/**
 * Render prose that may carry `[[term]]` markers, turning each known term
 * into a hoverable definition. Write `[[term|shown text]]` when the
 * sentence needs a different wording than the glossary key. A marker with
 * no entry renders as plain text, so a term can be linked before it is
 * written.
 * @param props - Component props.
 * @param props.children - The prose to render.
 * @returns The prose with its glossary terms made interactive.
 */
export function GlossaryText(props: { children: string }) {
  const { children } = props;

  return <>{renderMarkers(children)}</>;
}

function renderMarkers(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  MARKER.lastIndex = 0;
  let match = MARKER.exec(text);
  while (match !== null) {
    if (match.index > lastIndex) {
      nodes.push(...renderCode(text.slice(lastIndex, match.index), key++));
    }
    const raw = match.groups?.term ?? '';
    const [term = '', label] = raw.split('|');
    const entry = GLOSSARY[term.toLowerCase()];
    const shown = label ?? term;
    nodes.push(
      entry ? (
        <Tooltip
          key={`term-${key++}`}
          content={<GlossaryBody entry={entry} />}
          hoverOpenDelay={150}
          popoverClassName="guide-glossary-popover"
        >
          <span className="guide-term">{shown}</span>
        </Tooltip>
      ) : (
        <span key={`term-${key++}`}>{shown}</span>
      ),
    );
    lastIndex = match.index + match[0].length;
    match = MARKER.exec(text);
  }
  if (lastIndex < text.length) {
    nodes.push(...renderCode(text.slice(lastIndex), key));
  }
  return nodes;
}

const CODE = /`(?<code>[^`]+)`/g;

function renderCode(text: string, keyBase: number): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  CODE.lastIndex = 0;
  let match = CODE.exec(text);
  while (match !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    nodes.push(
      <code key={`code-${keyBase}-${key++}`} className="guide-code">
        {match.groups?.code}
      </code>,
    );
    lastIndex = match.index + match[0].length;
    match = CODE.exec(text);
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function GlossaryBody({ entry }: { entry: GlossaryEntry }) {
  return (
    <div style={{ maxWidth: 340 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{entry.title}</div>
      <div style={{ marginBottom: entry.examples.length > 0 ? 6 : 0 }}>
        {entry.summary}
      </div>
      {entry.examples.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {entry.examples.map((example) => (
            <li key={example.snippet} style={{ marginBottom: 2 }}>
              <code className="guide-code">{example.snippet}</code>
              {example.on && <span> on {example.on}</span>}
              {example.note && (
                <span style={{ fontStyle: 'italic' }}> — {example.note}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
