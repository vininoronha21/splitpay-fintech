import type { ReactNode } from "react";
import { Link } from "react-router";
import { cx, focusRing } from "./ui/index.ts";

interface CardHeaderProps {
  title: ReactNode;
  /** Id for `aria-labelledby` on the card. */
  titleId?: string;
  /** Short helper line under the title. */
  note?: ReactNode;
  /** Text link at the right, e.g. "Ver tudo". */
  link?: { to: string; label: ReactNode };
}

/** Same look as `Card`, on a router link: the whole card opens the target screen. */
export const linkCardClasses = cx(
  "block rounded-[20px] border border-border bg-surface p-4 shadow-xs transition-colors",
  "hover:border-muted motion-reduce:transition-none",
  focusRing,
);

/** Card title (16 px semibold) with an optional note and an amber text link. */
export function CardHeader({ title, titleId, note, link }: CardHeaderProps) {
  return (
    <div>
      {/* With a link the row is 44 px tall, the link's touch target; cards trim their top padding to match. */}
      <div className={cx("flex items-center justify-between gap-3", link && "min-h-11")}>
        <h2 id={titleId} className="min-w-0 text-base leading-snug font-semibold">
          {title}
        </h2>
        {link ? (
          <Link
            to={link.to}
            className={cx(
              "inline-flex min-h-11 shrink-0 items-center rounded-xl pl-2 text-sm font-semibold text-accent-text hover:underline",
              focusRing,
            )}
          >
            {link.label}
          </Link>
        ) : null}
      </div>
      {note ? <p className="mt-0.5 text-xs text-muted">{note}</p> : null}
    </div>
  );
}
