import type { TooltipProps } from '@blueprintjs/core';
import { Tooltip } from '@blueprintjs/core';
import type { CSSProperties, ReactNode } from 'react';
import { createElement } from 'react';

import { TOOLTIP_OPEN_DELAY } from './tooltipConfig.ts';

/**
 * A BlueprintJS `Tooltip` preconfigured to appear quickly on hover, meant
 * to replace the native `title` attribute (which the browser reveals only
 * after a long, fixed delay). When `content` is empty the children are
 * returned untouched, so it is safe to use with values that may be
 * missing.
 * @param props - Standard `Tooltip` props. `compact`, `placement="top"`
 *   and a fast `hoverOpenDelay` are applied as defaults and may be
 *   overridden by passing the corresponding prop.
 * @param props.content - The hint text to display on hover.
 * @param props.children - The element the tooltip is attached to.
 * @returns The children, wrapped in a fast tooltip when `content` is set.
 */
export function FastTooltip({ content, children, ...rest }: TooltipProps) {
  if (content === undefined || content === '') {
    return <>{children}</>;
  }
  return (
    <Tooltip
      compact
      placement="top"
      hoverOpenDelay={TOOLTIP_OPEN_DELAY}
      content={content}
      {...rest}
    >
      {children}
    </Tooltip>
  );
}

interface EllipsisTooltipProps {
  /** Full text — truncated in the element, shown in full in the tooltip. */
  value: string;
  /** The element tag to render. Defaults to `'div'`. */
  tag?: 'div' | 'span' | 'td';
  /** Class names forwarded to the rendered element. */
  className?: string;
  /** Inline styles forwarded to the rendered element. */
  style?: CSSProperties;
  /** Rendered content. Defaults to `value`. */
  children?: ReactNode;
}

/**
 * A single-line, ellipsis-truncated cell that reveals its full `value` in
 * a fast tooltip on hover. Uses BlueprintJS's `renderTarget` API so the
 * tooltip attaches directly to the rendered element — no wrapper element
 * is inserted, which preserves grid / flex / table layout and the CSS
 * truncation. When `value` is empty no tooltip is attached.
 * @param props - The component props.
 * @param props.value - Full text, truncated in the cell, shown in full in the tooltip.
 * @param props.tag - The element tag to render. Defaults to `'div'`.
 * @param props.className - Class names forwarded to the rendered element.
 * @param props.style - Inline styles forwarded to the rendered element.
 * @param props.children - Rendered content. Defaults to `value`.
 * @returns The element, with a tooltip when `value` is non-empty.
 */
export function EllipsisTooltip({
  value,
  tag = 'div',
  className,
  style,
  children,
}: EllipsisTooltipProps) {
  if (!value) {
    return createElement(tag, { className, style }, children ?? value);
  }
  return (
    <Tooltip
      content={value}
      compact
      placement="top"
      hoverOpenDelay={TOOLTIP_OPEN_DELAY}
      openOnTargetFocus={false}
      popoverClassName="value-tooltip"
      renderTarget={({
        ref,
        className: targetClass,
        onMouseEnter,
        onMouseLeave,
        onFocus,
        onBlur,
        onContextMenu,
      }) =>
        createElement(
          tag,
          {
            ref,
            className: [className, targetClass].filter(Boolean).join(' '),
            style,
            onMouseEnter,
            onMouseLeave,
            onFocus,
            onBlur,
            onContextMenu,
          },
          children ?? value,
        )
      }
    />
  );
}
