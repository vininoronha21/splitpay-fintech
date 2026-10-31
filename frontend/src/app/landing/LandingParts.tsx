import type { ReactNode } from "react";
import { cx } from "../components/ui/index.ts";
import { formatBRL } from "../../lib/money.ts";

/** Content column: 1140 px at most, inside a 16 px (mobile) or 24 px gutter. */
export const CONTAINER = "mx-auto w-full max-w-[1140px]";
export const GUTTER = "px-4 md:px-6";
/** Vertical rhythm of the sections below the hero: 64 px mobile, 120 px from lg. */
export const SECTION = cx(GUTTER, "py-16 lg:py-[120px]");
export const SECTION_TITLE = "text-[28px] leading-tight font-bold tracking-[-0.02em] text-balance md:text-[40px] lg:text-5xl";
export const SECTION_LEAD = "mt-4 max-w-[620px] text-base text-pretty text-muted md:text-lg";

/** On the dark hero and the dark startup band, amber (11.8:1 on #0b0b0c) is the ring that shows in both themes. */
export const heroFocusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

type Tone = "page" | "hero";

const EYEBROW: Record<Tone, string> = {
  page: "border-border bg-surface text-text",
  hero: "border-hero-text/15 bg-hero-text/5 text-hero-text",
};

/** Section label pill with an amber dot (design language, landing blocks). */
export function Eyebrow({ children, tone = "page" }: { children: ReactNode; tone?: Tone }) {
  return (
    <p
      className={cx(
        "inline-flex items-center gap-2 rounded-full border py-1.5 pr-4 pl-3 text-xs font-semibold tracking-[0.08em] uppercase",
        EYEBROW[tone],
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
      {children}
    </p>
  );
}

interface AmountProps {
  cents: number;
  /** Prefix "+" on positive amounts (money received). */
  signed?: boolean;
  /** Start value of the count-up in cents; the markup always shows `cents`. */
  from?: number;
  className?: string;
}

/**
 * A sample amount inside a landing screen. Plain formatBRL instead of Money:
 * these are illustration values, not the visitor's data, so "hide values" does
 * not mask them. `data-count-*` lets the motion count it up in integer cents.
 */
export function Amount({ cents, signed = false, from, className }: AmountProps) {
  const text = formatBRL(cents);
  return (
    <span
      className={cx("num", className)}
      data-count-to={from === undefined ? undefined : cents}
      data-count-from={from}
      data-count-sign={signed ? "plus" : undefined}
    >
      {signed && cents > 0 ? `+${text}` : text}
    </span>
  );
}

/** Landing replica of `ui/Card`: same radius, hairline and soft shadow, never interactive. */
export function ScreenCard({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-[20px] border border-border bg-surface p-4 shadow-xs", className)}>{children}</div>;
}

/** Uppercase field label, as in FieldFrame and the split section. */
export function ScreenLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("text-xs font-semibold tracking-[0.06em] text-muted uppercase", className)}>{children}</p>;
}

/** Which screen motion to build for a frame (see screenMotion.ts). */
export type ScreenKind = "split" | "rules" | "receivables" | "balance" | "charts";

interface ScreenFrameProps {
  kind: ScreenKind;
  /** Title of the app screen it replicates, drawn as its top bar. */
  title: string;
  /** What the drawing shows, for screen readers (the drawing itself is aria-hidden). */
  description: string;
  children: ReactNode;
}

/**
 * Device frame around an app screen drawn in markup. The chrome is its own
 * layer, so the feature tour can keep one device on screen while the contents
 * change. Decorative and never focusable: the description carries the meaning.
 */
export function ScreenFrame({ kind, title, description, children }: ScreenFrameProps) {
  return (
    <figure data-motion="screen" className="mx-auto w-full max-w-[400px]">
      <figcaption className="sr-only">{description}</figcaption>
      <div data-motion="device" aria-hidden="true" className="relative p-3 sm:p-4">
        <div
          data-motion="chrome"
          className="absolute inset-0 rounded-[30px] border border-border bg-bg shadow-[0_30px_60px_-24px_rgba(0,0,0,.28)]"
        />
        <div data-motion="screen-content" data-screen={kind} className="@container relative flex flex-col gap-3">
          <p className="px-1 pt-1 text-lg leading-tight font-bold tracking-[-0.01em]">{title}</p>
          {children}
        </div>
      </div>
    </figure>
  );
}
