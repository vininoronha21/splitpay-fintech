import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cx, focusRing } from "./focus.ts";

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed"> {
  selected: boolean;
}

/** Toggle chip (category picker); the parent decides single or multiple selection. */
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { selected, type = "button", className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-pressed={selected}
      className={cx(
        "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm whitespace-nowrap",
        "transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border-accent-edge bg-accent-soft font-semibold text-accent-soft-text"
          : "border-border bg-surface font-medium text-text hover:bg-neutral-soft",
        focusRing,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
