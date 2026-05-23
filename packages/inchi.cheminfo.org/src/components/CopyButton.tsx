import { Button } from '@blueprintjs/core';
import { useCallback, useState } from 'react';

interface CopyButtonProps {
  value: string;
  label?: string;
}

/**
 * Tiny minimal copy-to-clipboard button used in every result box.
 * Briefly swaps the icon to a tick to confirm the copy succeeded.
 * @param props - The component props.
 * @param props.value - The string to write to the clipboard. The button is
 *   disabled when empty.
 * @param props.label - Optional name of the value, used to build a
 *   descriptive `title` tooltip (e.g. `Copy InChI to clipboard`).
 * @returns The button JSX.
 */
export function CopyButton({ value, label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    if (!value) return;
    void navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      globalThis.setTimeout(() => setCopied(false), 1500);
    });
  }, [value]);
  return (
    <Button
      size="small"
      icon={copied ? 'tick' : 'duplicate'}
      variant="minimal"
      disabled={!value}
      title={label ? `Copy ${label} to clipboard` : 'Copy to clipboard'}
      onClick={handleCopy}
    />
  );
}
