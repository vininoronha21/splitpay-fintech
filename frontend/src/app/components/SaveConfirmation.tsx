import { useEffect, useState } from "react";
import { CircleCheck } from "lucide-react";
import { cx } from "./ui/index.ts";
import type { TransactionType } from "../../types/api.ts";

/** How long the message stays fully visible, then how long it takes to fade. */
const VISIBLE_MS = 2600;
const FADE_MS = 400;

const MESSAGES: Record<TransactionType, string> = {
  expense: "Gasto registrado.",
  income: "Receita registrada.",
};

/** Router state the form sends to Início after saving: `{ saved: "expense" | "income" }`. */
export interface SavedState {
  saved: TransactionType;
}

export function isSavedState(value: unknown): value is SavedState {
  if (typeof value !== "object" || value === null || !("saved" in value)) return false;
  return value.saved === "expense" || value.saved === "income";
}

type Phase = "idle" | "shown" | "fading";

interface SaveConfirmationProps {
  /** The type just saved, or null when Início opened normally. */
  saved: TransactionType | null;
}

/**
 * Short confirmation after saving, floating above the tab bar. The status
 * region is always mounted and the text is inserted after mount, so screen
 * readers announce it. It fades out; with reduced motion it just disappears.
 */
export function SaveConfirmation({ saved }: SaveConfirmationProps) {
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    if (saved === null) return;
    const show = window.setTimeout(() => setPhase("shown"), 50);
    const fade = window.setTimeout(() => setPhase("fading"), VISIBLE_MS);
    const hide = window.setTimeout(() => setPhase("idle"), VISIBLE_MS + FADE_MS);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(fade);
      window.clearTimeout(hide);
    };
  }, [saved]);

  const message = saved !== null && phase !== "idle" ? MESSAGES[saved] : null;

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(76px+env(safe-area-inset-bottom))] z-50 flex justify-center md:top-24 md:bottom-auto"
    >
      {/* A success-soft tint over an opaque surface: on dark a plain surface pill vanished over the cards. */}
      {message ? (
        <p
          className={cx(
            "max-w-full rounded-full bg-surface shadow-lg",
            "transition-opacity duration-400 motion-reduce:transition-none",
            phase === "fading" ? "opacity-0" : "opacity-100",
          )}
        >
          <span className="flex items-center gap-2 rounded-full border border-success/30 bg-success-soft px-4 py-3 text-sm font-semibold text-success-soft-text">
            <CircleCheck size={18} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{message}</span>
          </span>
        </p>
      ) : null}
    </div>
  );
}
