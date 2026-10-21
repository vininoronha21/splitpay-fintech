import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cx } from "./focus.ts";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Next step, usually a Button. */
  action?: ReactNode;
  className?: string;
}

/** Centered message for lists and charts with nothing to show yet. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cx("flex flex-col items-center px-4 py-8 text-center", className)}>
      <span className="grid size-12 place-items-center rounded-full bg-neutral-soft text-neutral-soft-text">
        <Icon size={22} aria-hidden="true" />
      </span>
      <p className="mt-3 font-semibold">{title}</p>
      {description ? <p className="mt-1 max-w-xs text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
