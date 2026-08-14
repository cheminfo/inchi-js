import { Button, ButtonGroup, Callout, Tag } from '@blueprintjs/core';
import { useSignals } from '@preact/signals-react/runtime';
import { useCallback, useState } from 'react';

import { selectStep, state } from '../../state/index.ts';
import { isHidden } from '../../state/shareConfig.ts';
import { DerivationPanel } from '../components/DerivationPanel.tsx';
import { GlossaryText } from '../components/GlossaryText.tsx';
import { LayerBreakdown } from '../components/LayerBreakdown.tsx';
import { NumberedStructure } from '../components/NumberedStructure.tsx';
import { StructureInput } from '../components/StructureInput.tsx';
import { TUTORIAL_STEPS } from '../data/tutorial.ts';
import type { TutorialStep } from '../data/types.ts';
import { LEVELS } from '../data/types.ts';
import { useDerivation } from '../useDerivation.ts';

/**
 * The guided derivation. Each step preloads a structure into a live
 * panel: the reader can edit it and watch the layer under discussion
 * change, which is the whole point of working through it here rather than
 * on paper.
 * @returns The tutorial page.
 */
export function Tutorial() {
  useSignals();
  const stepId = state.preferences.guide.step.value;
  const step = (TUTORIAL_STEPS.find((item) => item.id === stepId) ??
    TUTORIAL_STEPS[0]) as TutorialStep;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!isHidden('steps') && (
        <StepPicker current={step.id} onSelect={selectStep} />
      )}
      <StepView key={step.id} step={step} onSelect={selectStep} />
    </div>
  );
}

/**
 * One tutorial step, keyed on the step so the editable structure resets
 * to the step's own when the reader moves on.
 * @param props - Component props.
 * @param props.step - The step to show.
 * @param props.onSelect - Called with the id of the step to move to.
 * @returns The step.
 */
function StepView(props: {
  step: TutorialStep;
  onSelect: (id: string) => void;
}) {
  const { step, onSelect } = props;
  const [smiles, setSmiles] = useState(step.smiles);
  const result = useDerivation(smiles, step.inchiOptions);
  const index = TUTORIAL_STEPS.indexOf(step);
  const goTo = useCallback(
    (next: number) => {
      const target = TUTORIAL_STEPS[next];
      if (target) onSelect(target.id);
    },
    [onSelect],
  );

  return (
    <div className="panel-grid">
      <div className="panel">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <h2 className="section-title" style={{ flex: 1 }}>
            {index + 1}. {step.title}
          </h2>
          <Tag minimal intent={intentOf(step)}>
            {titleOf(step)}
          </Tag>
        </div>

        <p style={{ margin: 0, lineHeight: 1.55 }}>
          <GlossaryText>{step.description}</GlossaryText>
        </p>

        <div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
            With pen and paper
          </div>
          <ol className="guide-procedure">
            {step.procedure.map((line) => (
              <li key={line}>
                <GlossaryText>{line}</GlossaryText>
              </li>
            ))}
          </ol>
        </div>

        {step.caveat && (
          <Callout compact intent="warning" title="Where this gets hard">
            <GlossaryText>{step.caveat}</GlossaryText>
          </Callout>
        )}

        <ButtonGroup>
          <Button
            icon="chevron-left"
            disabled={index === 0}
            onClick={() => goTo(index - 1)}
          >
            Previous
          </Button>
          <Button
            endIcon="chevron-right"
            disabled={index === TUTORIAL_STEPS.length - 1}
            onClick={() => goTo(index + 1)}
          >
            Next
          </Button>
        </ButtonGroup>
      </div>

      <div className="panel">
        <StructureInput
          value={smiles}
          onChange={setSmiles}
          onReset={
            smiles === step.smiles ? undefined : () => setSmiles(step.smiles)
          }
        />
        {result.error && <div className="error-card">{result.error}</div>}
        {result.warning && <div className="warning-card">{result.warning}</div>}
        <NumberedStructure
          molfile={result.molfile}
          numbers={result.derivation?.engineNumbers ?? new Map()}
        />
        <LayerBreakdown inchi={result.inchi} focus={step.focus} />
        <DerivationPanel kind={step.panel} result={result} />
      </div>
    </div>
  );
}

function StepPicker({
  current,
  onSelect,
}: {
  current: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {LEVELS.map((level) => {
        const steps = TUTORIAL_STEPS.filter((step) => step.level === level.id);
        return (
          <div
            key={level.id}
            className="guide-level-strip"
            style={{ background: level.background, borderColor: level.border }}
          >
            <div className="guide-level-title">{level.title}</div>
            {steps.map((step) => (
              <Button
                key={step.id}
                size="small"
                variant={step.id === current ? 'solid' : 'minimal'}
                intent={step.id === current ? level.intent : undefined}
                title={step.title}
                onClick={() => onSelect(step.id)}
              >
                {TUTORIAL_STEPS.indexOf(step) + 1}
              </Button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function intentOf(step: TutorialStep) {
  return LEVELS.find((level) => level.id === step.level)?.intent;
}

function titleOf(step: TutorialStep) {
  return LEVELS.find((level) => level.id === step.level)?.title ?? step.level;
}
