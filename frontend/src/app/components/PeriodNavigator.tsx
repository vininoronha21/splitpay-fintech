import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cx, focusRing, Skeleton } from "./ui/index.ts";
import type { Period } from "../../types/api.ts";

/** Oldest offset the API accepts (`GET /dashboard/charts`). */
export const MIN_OFFSET = -520;

const BUTTON_LABELS: Record<Period, { previous: string; next: string }> = {
  week: { previous: "Semana anterior", next: "Próxima semana" },
  month: { previous: "Mês anterior", next: "Próximo mês" },
  year: { previous: "Ano anterior", next: "Próximo ano" },
};

interface PeriodNavigatorProps {
  period: Period;
  /** 0 is the current period, -1 the one before. */
  offset: number;
  /** "Outubro de 2026"; null while loading, "" when it could not load. */
  label: string | null;
  onOffsetChange: (offset: number) => void;
}

const iconButton = cx(
  "grid size-11 shrink-0 place-items-center rounded-full border border-border bg-surface text-text transition-colors",
  "hover:bg-neutral-soft motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface",
  focusRing,
);

/**
 * Previous and next buttons around the period label; next stops at the current period.
 * A press that reaches a limit disables that button, which would drop focus to
 * the page, so focus moves to the other arrow first.
 */
export function PeriodNavigator({ period, offset, label, onOffsetChange }: PeriodNavigatorProps) {
  const labels = BUTTON_LABELS[period];
  const previousButton = useRef<HTMLButtonElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);

  function step(next: number) {
    onOffsetChange(next);
    if (next <= MIN_OFFSET) nextButton.current?.focus();
    else if (next >= 0) previousButton.current?.focus();
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        className={iconButton}
        aria-label={labels.previous}
        ref={previousButton}
        disabled={offset <= MIN_OFFSET}
        onClick={() => step(offset - 1)}
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      {/* Announced when it changes, so the buttons give spoken feedback. A week across years may wrap. */}
      <p aria-live="polite" className="min-w-0 text-center text-[15px] leading-tight font-semibold text-balance tabular-nums">
        {label === null ? <Skeleton className="h-5 w-36" /> : label}
      </p>
      <button
        type="button"
        className={iconButton}
        aria-label={labels.next}
        ref={nextButton}
        disabled={offset >= 0}
        onClick={() => step(offset + 1)}
      >
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
