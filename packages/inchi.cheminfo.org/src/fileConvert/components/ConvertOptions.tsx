import { FormGroup, HTMLSelect, InputGroup, Switch } from '@blueprintjs/core';

import type { ConvertSettings } from '../useFileConvert.ts';

/** Props of {@link ConvertOptions}. */
export interface ConvertOptionsProps {
  /** Current settings. */
  settings: ConvertSettings;
  /** Called with the settings to merge in. */
  onChange: (patch: Partial<ConvertSettings>) => void;
  /** Columns of the loaded file, offered as structure-column overrides. */
  columns: string[];
  /**
   * Whether a SMILES column is worth offering — the file holds molfiles and
   * carries none of its own.
   */
  canAppendSmiles: boolean;
  /** Whether the controls are disabled while a conversion runs. */
  disabled: boolean;
}

/**
 * Structure column override, the columns to append, and the raw InChI option
 * string. The output format is picked in the download section.
 * @param props - Settings, change handler, columns, and the disabled flag.
 * @returns The options row JSX.
 */
export function ConvertOptions(props: ConvertOptionsProps) {
  const { settings, onChange, columns, canAppendSmiles, disabled } = props;
  const nothingSelected =
    !settings.inchi &&
    !settings.inchikey &&
    !settings.auxinfo &&
    !(settings.smiles && canAppendSmiles);

  return (
    <div className="convert-options">
      <FormGroup
        label="Structure column"
        helperText={settings.column ? 'Forced' : 'Auto-detected'}
      >
        <HTMLSelect
          value={settings.column}
          disabled={disabled}
          onChange={(event) => {
            onChange({ column: event.currentTarget.value });
          }}
        >
          <option value="">Detect automatically</option>
          {columns.map((column) => (
            <option key={column} value={column}>
              {column}
            </option>
          ))}
        </HTMLSelect>
      </FormGroup>

      <FormGroup
        label="InChI options"
        helperText="Raw option string, e.g. -RecMet -FixedH"
      >
        <InputGroup
          value={settings.inchiOptions}
          disabled={disabled}
          placeholder="(none)"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          onChange={(event) => {
            onChange({ inchiOptions: event.target.value });
          }}
        />
      </FormGroup>

      <FormGroup
        label="Columns to append"
        intent={nothingSelected ? 'danger' : 'none'}
        helperText={nothingSelected ? 'Pick at least one' : undefined}
      >
        {canAppendSmiles && (
          <Switch
            checked={settings.smiles}
            disabled={disabled}
            label="SMILES"
            onChange={(event) => {
              onChange({ smiles: event.currentTarget.checked });
            }}
          />
        )}
        <Switch
          checked={settings.inchi}
          disabled={disabled}
          label="InChI"
          onChange={(event) => {
            onChange({ inchi: event.currentTarget.checked });
          }}
        />
        <Switch
          checked={settings.inchikey}
          disabled={disabled}
          label="InChIKey"
          onChange={(event) => {
            onChange({ inchikey: event.currentTarget.checked });
          }}
        />
        <Switch
          checked={settings.auxinfo}
          disabled={disabled}
          label="AuxInfo"
          onChange={(event) => {
            onChange({ auxinfo: event.currentTarget.checked });
          }}
        />
      </FormGroup>
    </div>
  );
}
