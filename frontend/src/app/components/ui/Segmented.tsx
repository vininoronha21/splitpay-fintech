import { useRef, type KeyboardEvent } from "react";
import { cx, focusRing } from "./focus.ts";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedProps<T extends string> {
  /** Accessible name of the group (used when `labelledBy` is not given). */
  label: string;
  /** Id of a visible heading that names the group. */
  labelledBy?: string;
  /** Id of helper text describing the group. */
  describedBy?: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

const NEXT_KEYS = new Set(["ArrowRight", "ArrowDown"]);
const PREVIOUS_KEYS = new Set(["ArrowLeft", "ArrowUp"]);

/**
 * Single choice among a few options, built as a radio group: one tab stop,
 * arrow keys move and select (roving tabindex), Home and End jump to the ends.
 */
export function Segmented<T extends string>({
  label,
  labelledBy,
  describedBy,
  options,
  value,
  onChange,
  className,
}: SegmentedProps<T>) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  function select(index: number) {
    const option = options[index];
    if (!option) {
      return;
    }
    onChange(option.value);
    buttons.current[index]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = options.length - 1;
    let target: number | null = null;
    if (NEXT_KEYS.has(event.key)) target = index === last ? 0 : index + 1;
    else if (PREVIOUS_KEYS.has(event.key)) target = index === 0 ? last : index - 1;
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = last;
    if (target === null) {
      return;
    }
    event.preventDefault();
    select(target);
  }

  return (
    <div
      role="radiogroup"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className={cx("grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-neutral-soft p-1", className)}
    >
      {options.map((option, index) => {
        const checked = index === selectedIndex;
        return (
          <button
            key={option.value}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => select(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cx(
              "min-h-11 min-w-0 truncate rounded-[9px] px-2 text-sm transition-colors motion-reduce:transition-none",
              checked ? "bg-segment-selected font-semibold text-segment-selected-text shadow-sm" : "font-medium text-muted hover:text-text",
              focusRing,
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
