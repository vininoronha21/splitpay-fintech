import { forwardRef, type InputHTMLAttributes } from "react";
import { FieldFrame, useFieldIds } from "./TextField.tsx";
import { cx } from "./focus.ts";

export interface MoneyFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "inputMode" | "size"> {
  label: string;
  /** Text as typed ("1.234,56"); the parent converts it with `parseBRL`. */
  value: string;
  onChange: (text: string) => void;
  hint?: string;
  error?: string;
  className?: string;
}

/** Keeps only what a pt-BR amount can contain: digits, thousands dots and the decimal comma. */
function sanitize(text: string): string {
  return text.replace(/[^\d.,]/g, "");
}

/**
 * Steps the font down for long amounts so the whole value stays visible in the
 * 226 px input at 360 px: up to 15 characters at 26 px, "10.000.000.000,00"
 * (17, the largest valid amount) at 22 px, anything longer at 18 px.
 */
function amountFontClass(value: string): string {
  if (value.length <= 15) return "text-[26px]";
  if (value.length <= 18) return "text-[22px]";
  return "text-lg";
}

/** Large amount input with a fixed "R$" prefix, as in the Novo gasto prototype. */
export const MoneyField = forwardRef<HTMLInputElement, MoneyFieldProps>(function MoneyField(
  { label, value, onChange, hint, error, id, className, placeholder = "0,00", ...rest },
  ref,
) {
  const { inputId, hintId, errorId, describedBy } = useFieldIds(id, hint, error);
  return (
    <FieldFrame
      inputId={inputId}
      label={label}
      hint={hint}
      error={error}
      hintId={hintId}
      errorId={errorId}
      className={className}
    >
      {/* The wrapper draws border and focus ring, so the prefix sits inside the box. */}
      <div
        className={cx(
          "mt-2 flex h-15 items-center gap-2 rounded-xl border-2 bg-surface px-4 transition-colors motion-reduce:transition-none",
          "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent-text",
          // In error the border stays red while focused; focus moves here after an error.
          error ? "border-danger" : "border-field-border focus-within:border-accent",
        )}
      >
        <span className="text-lg font-bold text-muted" aria-hidden="true">
          R$
        </span>
        <input
          ref={ref}
          id={inputId}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(sanitize(event.target.value))}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cx(
            "num h-full w-full min-w-0 flex-1 bg-transparent font-bold text-text outline-none placeholder:text-muted",
            amountFontClass(value),
          )}
          {...rest}
        />
      </div>
    </FieldFrame>
  );
});
