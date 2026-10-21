import { Eye, EyeOff } from "lucide-react";
import { useHideValues } from "../../lib/preferences.ts";
import { cx, focusRing, focusRingOnAccent } from "./ui/focus.ts";

interface HideValuesButtonProps {
  /** `accent` for the amber balance header, `surface` everywhere else. */
  tone?: "surface" | "accent";
  className?: string;
}

const TONE_CLASS = {
  surface: cx("border border-border bg-surface text-text hover:bg-neutral-soft", focusRing),
  // on-accent is the same near-black in both themes, so a tint of it is theme-safe.
  accent: cx("bg-on-accent/10 text-on-accent hover:bg-on-accent/15", focusRingOnAccent),
} as const;

/** Eye toggle that masks every amount rendered through `Money`. */
export function HideValuesButton({ tone = "surface", className }: HideValuesButtonProps) {
  const [hidden, setHidden] = useHideValues();
  const Icon = hidden ? EyeOff : Eye;
  return (
    <button
      type="button"
      aria-pressed={hidden}
      aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
      onClick={() => setHidden(!hidden)}
      className={cx(
        "grid size-11 shrink-0 place-items-center rounded-full transition-colors",
        TONE_CLASS[tone],
        className,
      )}
    >
      <Icon size={20} aria-hidden="true" />
    </button>
  );
}
