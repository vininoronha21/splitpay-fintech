import type { CSSProperties } from "react";

// Built from the fixed hero and accent tokens (the hero is dark in both themes).
const GLOW_TOP: CSSProperties = {
  background: "radial-gradient(circle, color-mix(in srgb, var(--color-accent) 38%, transparent), transparent 70%)",
};
const GLOW_BOTTOM: CSSProperties = {
  background:
    "radial-gradient(circle, color-mix(in srgb, var(--color-accent-strong) 16%, transparent), transparent 70%)",
};
const GRID_LINE = "color-mix(in srgb, var(--color-hero-text) 3.5%, transparent)";
const GRID_MASK = "radial-gradient(circle at 50% 45%, black 0%, transparent 75%)";
const GRID: CSSProperties = {
  backgroundImage: `linear-gradient(${GRID_LINE} 1px, transparent 1px), linear-gradient(90deg, ${GRID_LINE} 1px, transparent 1px)`,
  backgroundSize: "32px 32px",
  maskImage: GRID_MASK,
  WebkitMaskImage: GRID_MASK,
};

/**
 * Glow placement per hero. "entry" is the /entrar layout. "landing" keeps the
 * bottom glow's visible fade (70% of its radius) inside the hero, so the section
 * edge never cuts it flat, and grows both glows from lg to fit the wide hero.
 */
type GlowVariant = "entry" | "landing";

const GLOWS: Record<GlowVariant, { top: string; bottom: string }> = {
  entry: {
    top: "-top-[170px] -right-[130px] size-[380px]",
    bottom: "-bottom-[190px] -left-[150px] size-[340px]",
  },
  landing: {
    top: "-top-[170px] -right-[130px] size-[380px] lg:-top-[250px] lg:-right-[190px] lg:size-[600px]",
    bottom: "-bottom-[40px] -left-[170px] size-[360px] lg:-bottom-[80px] lg:-left-[240px] lg:size-[520px]",
  },
};

interface HeroBackdropProps {
  variant?: GlowVariant;
}

/**
 * Decoration of the dark hero shared by /entrar and the landing page: two amber
 * glows and a faint grid. The parent must be `relative overflow-hidden bg-hero`,
 * and its content `relative` so it paints above the decoration.
 */
export function HeroBackdrop({ variant = "entry" }: HeroBackdropProps) {
  const glows = GLOWS[variant];
  return (
    <>
      <div aria-hidden="true" className={`absolute rounded-full ${glows.top}`} style={GLOW_TOP} />
      <div aria-hidden="true" className={`absolute rounded-full ${glows.bottom}`} style={GLOW_BOTTOM} />
      <div aria-hidden="true" className="absolute inset-0" style={GRID} />
    </>
  );
}
