import { useId } from "react";

interface BrandMarkProps {
  /** Width and height in px. */
  size?: number;
  className?: string;
  /** Accessible name; without it the mark is decorative (the wordmark names it). */
  title?: string;
}

/**
 * SplitPay logo: black roundel, amber S, diagonal cut at the center (the "split").
 * Colors are fixed brand colors, identical in both themes and in `public/favicon.svg`.
 */
export function BrandMark({ size = 32, className, title }: BrandMarkProps) {
  const titleId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      {...(title ? { role: "img", "aria-labelledby": titleId } : { "aria-hidden": true })}
      focusable="false"
    >
      {title ? <title id={titleId}>{title}</title> : null}
      <circle cx="24" cy="24" r="24" fill="#111111" />
      <path d="M32 16 A8 8 0 1 0 24 24 A8 8 0 1 1 16 32" fill="none" stroke="#fbbf24" strokeWidth="5.6" />
      <path d="M20.5 28 L27.5 20" stroke="#111111" strokeWidth="2.6" />
    </svg>
  );
}
