import { formatBRL, HIDDEN_BRL } from "../../lib/money.ts";
import { useHideValues } from "../../lib/preferences.ts";
import { cx } from "./ui/focus.ts";

interface MoneyProps {
  /** Integer cents. */
  cents: number;
  className?: string;
  /** Prefix "+" on positive amounts (money received). Negatives always show "−". */
  signed?: boolean;
}

/** Every amount in the app renders here, so "hide values" masks all of them at once. */
export function Money({ cents, className, signed = false }: MoneyProps) {
  const [hidden] = useHideValues();
  const classes = cx("num", className);

  if (hidden) {
    // role="img" gives the mask a name screen readers announce instead of the dots.
    return (
      <span className={classes} role="img" aria-label="Valor oculto">
        {HIDDEN_BRL}
      </span>
    );
  }

  const text = formatBRL(cents);
  return <span className={classes}>{signed && cents > 0 ? `+${text}` : text}</span>;
}
