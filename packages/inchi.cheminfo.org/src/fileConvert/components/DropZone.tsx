import { Button, Icon } from '@blueprintjs/core';
import type { DragEvent } from 'react';
import { useCallback, useRef, useState } from 'react';

const ACCEPT = '.csv,.tsv,.tab,.txt,.xlsx,.xlsm,.sdf,.sd,.mol';

/** Props of {@link DropZone}. */
export interface DropZoneProps {
  /** Called with the file the user dropped or picked. */
  onFile: (file: File) => void;
  /** Whether a conversion is running, which disables the zone. */
  disabled: boolean;
}

/**
 * Drag-and-drop target and file picker for the file to enrich.
 * @param props - The drop handler and the disabled flag.
 * @returns The drop zone JSX.
 */
export function DropZone(props: DropZoneProps) {
  const { onFile, disabled } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setOver(false);
      if (disabled) return;
      const file = event.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile, disabled],
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      style={{
        border: `2px dashed ${over ? '#2d72d2' : '#d3d8de'}`,
        background: over ? '#e8f1fc' : '#fbfcfd',
        borderRadius: 6,
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Icon icon="cloud-upload" size={28} className="muted" />
      <div style={{ fontWeight: 600 }}>Drop a CSV, TSV, XLSX or SDF here</div>
      <div className="muted" style={{ fontSize: 13, textAlign: 'center' }}>
        The structure column is detected automatically. Nothing is uploaded —
        the whole conversion runs in your browser.
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        style={{ display: 'none' }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = '';
        }}
      />
      <Button
        icon="folder-open"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        Choose a file
      </Button>
    </div>
  );
}
