export interface BrandMarkProps {
  /**
   * Edge of the square the mark is drawn in, in pixels.
   * @default 26
   */
  size?: number;
}

/**
 * The mark: a ring under a lens. An InChI is the string that identifies a
 * structure, so the mark is the act of looking one up rather than a picture of
 * a molecule. The ring and the lens share the second brand colour against the
 * plate, which is what keeps the two shapes apart at 16 px.
 *
 * Kept in step with `public/favicon.svg`, which is the same geometry written
 * out with literal colours because a file served on its own cannot read the
 * page's custom properties.
 * @param props - The mark size.
 * @param props.size - Edge of the square the mark is drawn in, in pixels.
 * @returns The mark, as an inline SVG.
 */
export function BrandMark(props: BrandMarkProps) {
  const { size = 26 } = props;

  return (
    <svg
      className="brand-mark"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="64" height="64" rx="12" fill="var(--brand)" />
      <g
        fill="none"
        stroke="var(--brand-alt)"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon
          points="25.5,11.5 14.67,17.75 14.67,30.25 25.5,36.5 36.33,30.25 36.33,17.75"
          strokeWidth="5"
        />
        <path d="M32.2 31.2 L51 50" strokeWidth="5.5" />
      </g>
    </svg>
  );
}

export interface WordmarkProps {
  /**
   * Extra class names, for sizing or spacing at the place it is used.
   * @default undefined
   */
  className?: string;
}

/**
 * The name, in the two colours this site owns. `inchi` has no internal split,
 * so the second colour comes from `.cheminfo`, with the faint dot between them
 * and no `.org`.
 *
 * The mark's yellow reaches about 1.5:1 on white, far too little for text, so
 * the second half is set in a darkened one of the same hue.
 * @param props - The wordmark options.
 * @param props.className - Extra class names, for sizing or spacing.
 * @returns The site name, in its two colours.
 */
export function Wordmark(props: WordmarkProps) {
  const { className } = props;

  return (
    <span className={className ? `wordmark ${className}` : 'wordmark'}>
      <span className="wordmark__lead">inchi</span>
      <span className="wordmark__dot">.</span>
      <span className="wordmark__alt">cheminfo</span>
    </span>
  );
}
