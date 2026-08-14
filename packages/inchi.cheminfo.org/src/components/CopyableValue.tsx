import { Tooltip } from '@blueprintjs/core';
import type { CSSProperties } from 'react';
import { useCallback, useState } from 'react';

import { TOOLTIP_OPEN_DELAY } from './tooltipConfig.ts';

interface CopyableValueProps {
  /** The string to display and copy. When empty, a muted placeholder is shown instead and the value is not interactive. */
  value: string;
  /** Optional name of the value, used to build the hover tooltip (e.g. `Click to copy InChI`). */
  label?: string;
  /** Text shown (muted) when `value` is empty. Defaults to `—`. */
  placeholder?: string;
  /** Extra class names appended after the base `mono copyable-value` classes. */
  className?: string;
  /** Inline styles forwarded to the rendered element. */
  style?: CSSProperties;
}

/**
 * A monospaced value that copies itself to the clipboard when clicked.
 * The cursor turns into a copy cursor on hover and the value briefly
 * flashes to confirm the copy succeeded — no separate copy button is
 * needed. When `value` is empty it renders a muted placeholder and is
 * not interactive.
 * @param props - The component props.
 * @param props.value - The string to display and copy.
 * @param props.label - Optional value name used in the hover tooltip.
 * @param props.placeholder - Text shown when `value` is empty. Defaults to `—`.
 * @param props.className - Extra class names appended after the base classes.
 * @param props.style - Inline styles forwarded to the rendered element.
 * @returns The clickable value JSX.
 */
export function CopyableValue({
  value,
  label,
  placeholder = '—',
  className,
  style,
}: CopyableValueProps) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    if (!value) return;
    void navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      globalThis.setTimeout(() => setCopied(false), 1200);
    });
  }, [value]);

  if (!value) {
    return (
      <span
        className={['mono', className].filter(Boolean).join(' ')}
        style={style}
      >
        <span className="muted">{placeholder}</span>
      </span>
    );
  }

  const classes = [
    'mono',
    'copyable-value',
    copied && 'copyable-value-copied',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const tooltipContent = copied
    ? 'Copied!'
    : label
      ? `Click to copy ${label}`
      : 'Click to copy';

  return (
    <Tooltip
      content={tooltipContent}
      compact
      placement="top"
      hoverOpenDelay={TOOLTIP_OPEN_DELAY}
      openOnTargetFocus={false}
      renderTarget={({
        ref,
        className: targetClass,
        onMouseEnter,
        onMouseLeave,
        onFocus,
        onBlur,
        onContextMenu,
      }) => (
        <span
          ref={ref}
          className={[classes, targetClass].filter(Boolean).join(' ')}
          style={style}
          role="button"
          tabIndex={0}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onFocus={onFocus}
          onBlur={onBlur}
          onContextMenu={onContextMenu}
          onClick={handleCopy}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleCopy();
            }
          }}
        >
          {value}
        </span>
      )}
    />
  );
}
