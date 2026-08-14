interface LogoProps {
  /** Rendered width/height in pixels. Defaults to `22`. */
  size?: number;
}

/**
 * Small InChI JS mark: an aromatic hexagon (the universal chemistry glyph)
 * with a highlighted vertex standing in for the derived identifier. Drawn
 * with `currentColor` so it inherits the surrounding text color.
 * @param props - Component props.
 * @param props.size - Rendered width/height in pixels.
 * @returns The inline SVG logo.
 */
export function Logo({ size = 22 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
      role="img"
    >
      <polygon points="20,12 16,18.9 8,18.9 4,12 8,5.1 16,5.1" />
      <line x1="8.7" y1="6.4" x2="14.6" y2="6.4" />
      <line x1="5.8" y1="12" x2="8.7" y2="17" />
      <circle cx="20" cy="12" r="2.1" fill="currentColor" stroke="none" />
    </svg>
  );
}
