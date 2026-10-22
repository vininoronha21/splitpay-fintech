import type { ReactNode } from "react";
import { Money } from "./Money.tsx";
import { cx } from "./ui/focus.ts";
import { formatBRL } from "../../lib/money.ts";

export interface DonutSlice {
  key: string;
  /** Integer cents; zero slices are skipped. */
  cents: number;
  /** Literal Tailwind stroke class, e.g. from `categoryColor(id).stroke`. */
  strokeClass: string;
}

interface DonutChartProps {
  slices: readonly DonutSlice[];
  /** Width and height in px. */
  size: number;
  strokeWidth: number;
  /** Centered over the hole, e.g. a `DonutTotal`. */
  children?: ReactNode;
  className?: string;
}

/** Surface gap between slices, in px along the ring. */
const GAP = 2;

/**
 * Hand-drawn donut: one SVG circle per slice, each drawn as a single dash of
 * the ring (`stroke-dasharray`) and shifted by the slices before it. Decorative
 * (`aria-hidden`): the legend next to it carries the same numbers as text.
 */
export function DonutChart({ slices, size, strokeWidth, children, className }: DonutChartProps) {
  const visible = slices.filter((slice) => slice.cents > 0);
  const total = visible.reduce((sum, slice) => sum + slice.cents, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Ring geometry only: the ratio of integer cents sets a length in px, never an amount.
  let start = 0;
  const arcs = visible.map((slice) => {
    const length = (circumference * slice.cents) / total;
    const arc = { slice, start, length };
    start += length;
    return arc;
  });

  return (
    <div className={cx("relative grid shrink-0 place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" focusable="false">
        <g transform={`rotate(-90 ${center} ${center})`} fill="none" strokeWidth={strokeWidth}>
          {arcs.map(({ slice, start: offset, length }) => (
            <circle
              key={slice.key}
              cx={center}
              cy={center}
              r={radius}
              className={slice.strokeClass}
              // A lone slice is the full ring, so it gets no gap.
              strokeDasharray={
                arcs.length === 1 ? undefined : `${Math.max(length - GAP, 1)} ${circumference}`
              }
              strokeDashoffset={arcs.length === 1 ? undefined : -offset}
            />
          ))}
        </g>
      </svg>
      {children ? <div className="absolute inset-0 grid place-items-center">{children}</div> : null}
    </div>
  );
}

interface DonutTotalProps {
  cents: number;
  /** `md` for the home card, `lg` for Gastos do mês. */
  size?: "md" | "lg";
}

/**
 * Font step for the amount by its formatted length: `[longest length, class]`,
 * first match wins. Measured so every corner of the text box stays at least
 * 6 px inside the hole (124 px for `md`, 142 px for `lg`) up to
 * R$ 90.071.992.547.409,91 (24 characters, the largest safe integer of cents).
 * Amounts up to 16 characters keep their earlier size.
 */
const AMOUNT_STEPS: Record<"md" | "lg", readonly (readonly [number, string])[]> = {
  md: [
    [12, "text-base"],
    [14, "text-sm"],
    [16, "text-xs"],
    [17, "text-[11px]"],
    [19, "text-[10px]"],
    [21, "text-[9px]"],
    [Infinity, "text-[8px]"],
  ],
  lg: [
    [12, "text-lg"],
    [16, "text-sm"],
    [19, "text-xs"],
    [20, "text-[11px]"],
    [22, "text-[10px]"],
    [Infinity, "text-[9px]"],
  ],
};

function amountClass(cents: number, size: "md" | "lg"): string {
  const length = formatBRL(cents).length;
  const step = AMOUNT_STEPS[size].find(([longest]) => length <= longest);
  return step ? step[1] : "text-[8px]";
}

/** "Total" over the amount, for the center of a donut. */
export function DonutTotal({ cents, size = "md" }: DonutTotalProps) {
  return (
    <div className="flex flex-col items-center leading-tight">
      <span className="text-xs text-muted">Total</span>
      <Money cents={cents} className={cx("font-bold", amountClass(cents, size))} />
    </div>
  );
}
