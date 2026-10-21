import type { HTMLAttributes } from "react";
import { cx } from "./focus.ts";

type CardElement = "section" | "article" | "div" | "li" | "aside";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Semantic element to render; `section` by default. */
  as?: CardElement;
  /** Inner padding of 16 px; turn off for lists that run edge to edge. */
  padded?: boolean;
}

/** Surface card: 20 px radius, hairline border, soft shadow (invisible on dark). */
export function Card({ as: Element = "section", padded = true, className, ...rest }: CardProps) {
  return (
    <Element
      className={cx("rounded-[20px] border border-border bg-surface shadow-xs", padded && "p-4", className)}
      {...rest}
    />
  );
}
