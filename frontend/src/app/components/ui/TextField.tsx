import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cx, focusRing } from "./focus.ts";

interface FieldFrameProps {
  inputId: string;
  label: string;
  hint?: string;
  error?: string;
  hintId: string;
  errorId: string;
  className?: string;
  children: ReactNode;
}

/** Label, control slot, hint and error, shared by TextField and MoneyField. */
export function FieldFrame({ inputId, label, hint, error, hintId, errorId, className, children }: FieldFrameProps) {
  return (
    <div className={className}>
      <label htmlFor={inputId} className="block text-xs font-semibold tracking-[0.06em] text-muted uppercase">
        {label}
      </label>
      {children}
      {error ? (
        <p id={errorId} className="mt-2 flex items-start gap-1.5 text-sm text-danger">
          <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
      {hint ? (
        <p id={hintId} className="mt-2 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Ids and ARIA attributes linking a control to its hint and error. */
export function useFieldIds(id: string | undefined, hint?: string, error?: string) {
  const generated = useId();
  const inputId = id ?? generated;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
  return { inputId, hintId, errorId, describedBy };
}

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label: string;
  /** Helper text under the field, in `muted`. */
  hint?: string;
  /** pt-BR error message; marks the field invalid and is announced with it. */
  error?: string;
  /** Classes for the wrapper (label, input and messages). */
  className?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, id, className, type = "text", ...rest },
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
      <input
        ref={ref}
        id={inputId}
        type={type}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(
          "mt-2 h-12 w-full min-w-0 rounded-xl border bg-surface px-4 text-base text-text placeholder:text-muted",
          "transition-colors focus:border-accent motion-reduce:transition-none",
          "disabled:cursor-not-allowed disabled:opacity-60",
          error ? "border-danger" : "border-border",
          focusRing,
        )}
        {...rest}
      />
    </FieldFrame>
  );
});
