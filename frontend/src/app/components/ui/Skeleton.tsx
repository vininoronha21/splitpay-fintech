import { cx } from "./focus.ts";

export interface SkeletonProps {
  /** Size and shape, e.g. "h-6 w-32" or "h-24 w-full rounded-[20px]". */
  className?: string;
}

/**
 * Loading placeholder that keeps the final height. Decorative: the region that
 * shows it should carry `aria-busy` or a status message for screen readers.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cx("block animate-pulse rounded-xl bg-track motion-reduce:animate-none", className)}
    />
  );
}
