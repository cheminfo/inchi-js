import { Button, Callout, InputGroup, Tag } from '@blueprintjs/core';
import { useMemo } from 'react';

import { CopyButton } from '../../components/CopyButton.tsx';
import { isHidden } from '../../state/shareConfig.ts';
import type { Exercise } from '../data/types.ts';
import { LEVELS } from '../data/types.ts';
import type { ExerciseState } from '../exerciseState.ts';
import type { AnswerCheck } from '../inchi/validate.ts';
import { checkFullInchi, checkLayer, checkText } from '../inchi/validate.ts';
import { useDerivation } from '../useDerivation.ts';

import { GlossaryText } from './GlossaryText.tsx';
import { LayerBreakdown } from './LayerBreakdown.tsx';
import { NumberedStructure } from './NumberedStructure.tsx';

/**
 * One challenge: the task, a live answer box checked against the InChI the
 * engine computes for the same structure, hints revealed one at a time,
 * and the answer itself as a last resort.
 * @param props - Component props.
 * @param props.exercise - The exercise to render.
 * @param props.state - Its stored answer, hints and status.
 * @param props.onChange - Called with the fields that changed.
 * @returns The exercise card.
 */
export function ExerciseCard(props: {
  exercise: Exercise;
  state: ExerciseState;
  onChange: (patch: Partial<ExerciseState>) => void;
}) {
  const { exercise, state, onChange } = props;

  const result = useDerivation(exercise.smiles ?? '');
  const target = exercise.inchi ?? result.inchi;
  const check = useMemo(
    () => runCheck(exercise, state.answer, target),
    [exercise, state.answer, target],
  );
  const level = LEVELS.find((item) => item.id === exercise.level);
  const ready = Boolean(target);

  return (
    <div className="panel">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <h2 className="section-title" style={{ flex: 1 }}>
          {exercise.title}
        </h2>
        <Tag minimal intent={level?.intent}>
          {level?.title}
        </Tag>
      </div>

      <p style={{ margin: 0, lineHeight: 1.55 }}>
        <GlossaryText>{exercise.description}</GlossaryText>
      </p>

      {exercise.smiles && (
        <NumberedStructure
          molfile={result.molfile}
          numbers={new Map()}
          height={200}
        />
      )}
      {exercise.inchi && (
        <div className="result-card">
          <div className="muted" style={{ fontSize: 12 }}>
            Read this InChI
          </div>
          <LayerBreakdown inchi={exercise.inchi} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {exercise.kind === 'layer' && exercise.letter && (
          <span
            className="mono"
            style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            /{exercise.letter}
          </span>
        )}
        <InputGroup
          className="mono"
          fill
          value={state.answer}
          placeholder={exercise.placeholder ?? 'your answer'}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          intent={
            state.status === 'idle' || !state.answer
              ? undefined
              : check.passed
                ? 'success'
                : 'danger'
          }
          onValueChange={(answer) =>
            onChange({
              answer,
              status:
                state.status === 'idle'
                  ? 'idle'
                  : runCheck(exercise, answer, target).passed
                    ? 'solved'
                    : 'attempted',
            })
          }
        />
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Button
          intent="primary"
          disabled={!ready}
          onClick={() =>
            onChange({ status: check.passed ? 'solved' : 'attempted' })
          }
        >
          Check
        </Button>
        {!isHidden('hints') && (
          <Button
            disabled={state.hintsRevealed >= exercise.hints.length}
            onClick={() => onChange({ hintsRevealed: state.hintsRevealed + 1 })}
          >
            Reveal hint ({state.hintsRevealed}/{exercise.hints.length})
          </Button>
        )}
        {!isHidden('answers') && (
          <Button
            disabled={!ready}
            onClick={() => onChange({ showSolution: !state.showSolution })}
          >
            {state.showSolution ? 'Hide answer' : 'Reveal answer'}
          </Button>
        )}
        {!isHidden('clear') && (
          <Button
            variant="minimal"
            onClick={() =>
              onChange({
                answer: '',
                status: 'idle',
                hintsRevealed: 0,
                showSolution: false,
              })
            }
          >
            Reset
          </Button>
        )}
      </div>

      {state.status === 'solved' && check.passed && (
        <Callout compact intent="success">
          <div>
            Correct
            {state.hintsRevealed > 0 &&
              ` — solved with ${state.hintsRevealed} hint${state.hintsRevealed === 1 ? '' : 's'}`}
            .
          </div>
          {!exercise.inchi && target && (
            <div style={{ marginTop: 6 }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                className="muted"
              >
                <span style={{ fontSize: 12 }}>The full InChI</span>
                <CopyButton value={target} label="InChI" />
              </div>
              <LayerBreakdown
                inchi={target}
                focus={
                  exercise.kind === 'layer' && exercise.letter
                    ? { letter: exercise.letter, block: exercise.block }
                    : null
                }
              />
            </div>
          )}
        </Callout>
      )}
      {state.status === 'attempted' && !check.passed && (
        <Callout compact intent="danger" title="Not quite yet">
          {check.reason}
        </Callout>
      )}

      {state.hintsRevealed > 0 && !isHidden('hints') && (
        <Callout compact intent="primary" title="Hints">
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            {exercise.hints.slice(0, state.hintsRevealed).map((hint) => (
              <li key={hint}>
                <GlossaryText>{hint}</GlossaryText>
              </li>
            ))}
          </ol>
        </Callout>
      )}

      {state.showSolution && !isHidden('answers') && (
        <Callout compact intent="warning" title="Answer">
          <div className="mono">{check.expected}</div>
        </Callout>
      )}

      {result.error && <div className="error-card">{result.error}</div>}
    </div>
  );
}

function runCheck(
  exercise: Exercise,
  answer: string,
  target: string,
): AnswerCheck {
  if (exercise.kind === 'read') {
    return checkText(answer, exercise.expected ?? '');
  }
  if (!target) {
    return {
      passed: false,
      expected: '',
      actual: answer,
      reason: 'Computing…',
    };
  }
  if (exercise.kind === 'full') return checkFullInchi(answer, target);
  return checkLayer(answer, target, exercise.letter ?? '', exercise.block);
}
