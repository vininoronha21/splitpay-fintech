import { Check, CheckCheck, Clock, type LucideIcon } from "lucide-react";
import type { SplitStatus } from "../../../types/api.ts";
import { cx } from "./focus.ts";

interface StatusStyle {
  label: string;
  icon: LucideIcon;
  className: string;
}

// Real reimbursement statuses only (spec 008); there is no overdue state.
const STATUS_STYLE: Record<SplitStatus, StatusStyle> = {
  em_aberto: { label: "Aguardando reembolso", icon: Clock, className: "bg-accent-soft text-accent-soft-text" },
  pago: { label: "Pago", icon: Check, className: "bg-success-soft text-success-soft-text" },
  acertado: { label: "Acertado", icon: CheckCheck, className: "bg-neutral-soft text-neutral-soft-text" },
};

export interface StatusPillProps {
  status: SplitStatus;
  /** Replaces the default label, e.g. "Pago em 20 out". */
  label?: string;
  className?: string;
}

/** Reimbursement status: tinted fill, icon and label, never color alone. */
export function StatusPill({ status, label, className }: StatusPillProps) {
  const style = STATUS_STYLE[status];
  const Icon = style.icon;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-xs leading-tight font-semibold whitespace-nowrap",
        style.className,
        className,
      )}
    >
      <Icon size={12} strokeWidth={2.4} aria-hidden="true" />
      {label ?? style.label}
    </span>
  );
}
