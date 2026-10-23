import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cx, focusRing } from "./focus.ts";

export interface SwitchProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "role" | "aria-checked" | "type"> {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/**
 * On/off toggle with `role="switch"`. The visible track is 48 x 28 px; the
 * button around it is 48 x 44 px, the minimum touch target. Name it with
 * `aria-labelledby` (a visible title) or `aria-label`.
 */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, onChange, className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cx(
        "group inline-flex h-11 w-12 shrink-0 items-center justify-center rounded-full",
        "disabled:cursor-not-allowed disabled:opacity-50",
        focusRing,
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden="true"
        className={cx(
          "flex h-7 w-12 items-center rounded-full p-[3px] transition-colors motion-reduce:transition-none",
          checked ? "bg-accent" : "bg-track",
        )}
      >
        {/* Off: a gray thumb on the left, visible on the track in both themes. On: a surface thumb on amber. */}
        <span
          className={cx(
            "size-[22px] rounded-full shadow-sm transition-transform motion-reduce:transition-none",
            checked ? "translate-x-5 bg-surface" : "translate-x-0 bg-muted",
          )}
        />
      </span>
    </button>
  );
});
