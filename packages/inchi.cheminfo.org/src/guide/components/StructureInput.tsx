import { Button, InputGroup } from '@blueprintjs/core';

/**
 * The editable structure box every guide page shares. The value is owned
 * by the page, so the field always shows what is actually being derived.
 * @default label 'Structure (SMILES)'
 * @param props - Component props.
 * @param props.value - The SMILES currently derived.
 * @param props.onChange - Called with a new SMILES.
 * @param props.onReset - Called to restore the step’s own structure.
 * @param props.label - Text shown above the field.
 * @returns The input row.
 */
export function StructureInput(props: {
  value: string;
  onChange: (smiles: string) => void;
  onReset?: () => void;
  label?: string;
}) {
  const { value, onChange, onReset, label = 'Structure (SMILES)' } = props;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div className="muted" style={{ fontSize: 12 }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <InputGroup
          className="mono"
          fill
          value={value}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          onValueChange={onChange}
        />
        {onReset && (
          <Button
            icon="reset"
            variant="minimal"
            title="Restore this step's structure"
            onClick={onReset}
          />
        )}
      </div>
    </div>
  );
}
