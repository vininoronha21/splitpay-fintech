import { forwardRef, type ReactNode, type TextareaHTMLAttributes } from "react";
import { FieldFrame, useFieldIds } from "./TextField.tsx";
import { cx, focusRing } from "./focus.ts";

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  /** Helper text under the field, in `muted`. */
  hint?: string;
  /** pt-BR error message; marks the field invalid and is announced with it. */
  error?: string;
  /** Shown at the right end of the hint line (needs `hint`), e.g. a "3/10" counter. */
  aside?: ReactNode;
  /** Classes for the wrapper (label, textarea and messages). */
  className?: string;
}

/** Multi-line text field with the same label, hint and error as TextField. */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, hint, error, aside, id, className, rows = 3, onFocus, ...rest },
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
      aside={aside}
      className={className}
    >
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onFocus={(event) => {
          // Chrome scrolls only the caret into view on focus, which can leave the box's lower part
          // under the tab bar; "nearest" scrolls the whole box and honors theme.css scroll-padding.
          event.currentTarget.scrollIntoView({ block: "nearest" });
          onFocus?.(event);
        }}
        className={cx(
          "mt-2 block min-h-24 w-full min-w-0 resize-y rounded-xl border bg-surface px-4 py-3 text-base text-text",
          "placeholder:text-muted transition-colors motion-reduce:transition-none",
          "disabled:cursor-not-allowed disabled:opacity-60",
          // In error the border stays red while focused; focus moves here after an error.
          error ? "border-danger" : "border-border focus:border-accent",
          focusRing,
        )}
        {...rest}
      />
    </FieldFrame>
  );
});
