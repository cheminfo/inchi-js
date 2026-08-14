import { Alert, Button, Icon, ProgressBar, Tag } from '@blueprintjs/core';
import { useSignals } from '@preact/signals-react/runtime';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import {
  clearExercises,
  selectExercise,
  state,
  updateExercise,
} from '../../state/index.ts';
import { isHidden } from '../../state/shareConfig.ts';
import { ExerciseCard } from '../components/ExerciseCard.tsx';
import { EXERCISES } from '../data/exercises.ts';
import type { Exercise } from '../data/types.ts';
import { LEVELS } from '../data/types.ts';
import type { ExerciseState } from '../exerciseState.ts';
import { defaultExerciseState } from '../exerciseState.ts';

/**
 * The self-paced half of the guide: derive a layer, have it checked
 * against the engine, and reach for a hint only when stuck.
 * @returns The exercises page.
 */
export function Exercises() {
  useSignals();
  const states = state.preferences.guide.exercises.value;
  const activeId = state.preferences.guide.exerciseId.value;
  const [clearing, setClearing] = useState(false);
  const active =
    EXERCISES.find((exercise) => exercise.id === activeId) ?? EXERCISES[0];

  const solved = EXERCISES.filter(
    (exercise) => states[exercise.id]?.status === 'solved',
  ).length;

  return (
    <div
      className={
        isHidden('list')
          ? 'guide-exercises guide-exercises-alone'
          : 'guide-exercises'
      }
    >
      {!isHidden('list') && (
        <div className="panel guide-exercise-list">
          <h2 className="section-title">Exercises</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <ProgressBar
              intent="success"
              stripes={false}
              value={solved / EXERCISES.length}
            />
            <div className="muted" style={{ fontSize: 12 }}>
              {solved} of {EXERCISES.length} solved
            </div>
          </div>
          <ExerciseList
            activeId={active?.id ?? ''}
            states={states}
            onSelect={selectExercise}
          />
          {!isHidden('clear') && (
            <Button
              variant="minimal"
              intent="danger"
              icon="trash"
              onClick={() => setClearing(true)}
            >
              Clear all answers
            </Button>
          )}
        </div>
      )}

      {active && (
        <ExerciseCard
          key={active.id}
          exercise={active}
          state={states[active.id] ?? defaultExerciseState()}
          onChange={(patch) => updateExercise(active.id, patch)}
        />
      )}

      <Alert
        isOpen={clearing}
        intent="danger"
        icon="trash"
        confirmButtonText="Clear everything"
        cancelButtonText="Keep my answers"
        onCancel={() => setClearing(false)}
        onConfirm={() => {
          clearExercises();
          setClearing(false);
        }}
      >
        This deletes every answer, hint and solved mark for all{' '}
        {EXERCISES.length} exercises. It cannot be undone.
      </Alert>
    </div>
  );
}

function ExerciseList({
  activeId,
  states,
  onSelect,
}: {
  activeId: string;
  states: Record<string, ExerciseState>;
  onSelect: (id: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(activeId);
  const selectRef = useRef(onSelect);

  useLayoutEffect(() => {
    activeRef.current = activeId;
    selectRef.current = onSelect;
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      const focused = document.activeElement;
      if (
        focused instanceof HTMLInputElement ||
        focused instanceof HTMLTextAreaElement ||
        focused instanceof HTMLSelectElement
      ) {
        return;
      }
      event.preventDefault();
      const current = EXERCISES.findIndex(
        (exercise) => exercise.id === activeRef.current,
      );
      const next =
        event.key === 'ArrowDown'
          ? Math.min(current + 1, EXERCISES.length - 1)
          : Math.max(current - 1, 0);
      const target = EXERCISES[next];
      if (target && next !== current) selectRef.current(target.id);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-selected="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeId]);

  return (
    <div ref={listRef} className="guide-exercise-scroll">
      {EXERCISES.map((exercise) => (
        <ExerciseRow
          key={exercise.id}
          exercise={exercise}
          state={states[exercise.id]}
          selected={exercise.id === activeId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function ExerciseRow({
  exercise,
  state,
  selected,
  onSelect,
}: {
  exercise: Exercise;
  state: ExerciseState | undefined;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const status = state?.status ?? 'idle';
  const level = LEVELS.find((item) => item.id === exercise.level);
  return (
    <Button
      alignText="left"
      fill
      variant={selected ? 'solid' : 'outlined'}
      active={selected}
      data-selected={selected ? 'true' : undefined}
      onClick={() => onSelect(exercise.id)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon
          icon={
            status === 'solved'
              ? 'tick-circle'
              : status === 'attempted'
                ? 'warning-sign'
                : 'circle'
          }
          intent={
            status === 'solved'
              ? 'success'
              : status === 'attempted'
                ? 'warning'
                : undefined
          }
        />
        <span style={{ flex: 1 }}>{exercise.title}</span>
        <Tag minimal intent={level?.intent}>
          {exercise.kind}
        </Tag>
        {status === 'solved' && (state?.hintsRevealed ?? 0) > 0 && (
          <Tag minimal intent="primary">
            {state?.hintsRevealed} hint
            {state?.hintsRevealed === 1 ? '' : 's'}
          </Tag>
        )}
      </div>
    </Button>
  );
}
