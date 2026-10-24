import { forwardRef, type ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { cx, focusRing } from "./focus.ts";

export type ButtonVariant = "primary" | "ghost" | "danger" | "success";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * `primary` amber fill; `ghost` outlined surface; `danger` outlined with red text (e.g. "Sair");
   * `success` green tint for money coming in (e.g. "Recebi").
   */
  variant?: ButtonVariant;
  /** `sm` 44 px (row actions), `md` 48 px (forms, main actions). */
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Leading icon, decorative; the label carries the meaning. */
  icon?: LucideIcon;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent shadow-[0_3px_13px_rgba(251,191,36,.18)] hover:bg-accent-strong",
  ghost: "border border-border bg-surface text-text hover:bg-neutral-soft",
  danger: "border border-border bg-surface text-danger hover:bg-danger-soft",
  success: "border border-success/30 bg-success-soft text-success-soft-text hover:border-success/60",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "min-h-11 rounded-[10px] px-4 text-sm",
  md: "min-h-12 rounded-xl px-5 text-base",
};

export interface ButtonClassOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

/** Button styling as a class string, so a router `Link` can look like a Button. */
export function buttonClasses({ variant = "primary", size = "md", fullWidth = false }: ButtonClassOptions = {}): string {
  return cx(
    "inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition",
    "active:scale-[.98] motion-reduce:transition-none motion-reduce:active:scale-100",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:active:scale-100",
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    fullWidth && "w-full",
    focusRing,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size = "md", fullWidth, icon: Icon, type = "button", className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(buttonClasses({ variant, size, fullWidth }), className)}
      {...rest}
    >
      {Icon ? <Icon size={size === "sm" ? 16 : 18} aria-hidden="true" /> : null}
      {children}
    </button>
  );
});
