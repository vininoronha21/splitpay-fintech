import { ArrowDownToLine, Wallet } from "lucide-react";
import { Money } from "./Money.tsx";
import { Avatar, cx, StatusPill } from "./ui/index.ts";
import { formatShortDate } from "../../lib/dates.ts";
import type { TransactionSummary } from "../../types/api.ts";

interface TransactionRowProps {
  transaction: TransactionSummary;
  /** Status pill of a split expense: always, never, or from `md` only (Início). */
  showStatus?: boolean | "md";
  className?: string;
}

/** "Transporte, 20 out", "Com Ana Lima, 20 out" or "Receita, 13 out". */
function metaLine(transaction: TransactionSummary): string {
  const date = formatShortDate(transaction.occurred_on);
  if (transaction.friend_name) return `Com ${transaction.friend_name}, ${date}`;
  if (transaction.category_name) return `${transaction.category_name}, ${date}`;
  return `${transaction.type === "income" ? "Receita" : "Sem categoria"}, ${date}`;
}

function RowIcon({ transaction }: { transaction: TransactionSummary }) {
  if (transaction.friend_name) {
    return <Avatar name={transaction.friend_name} tone="accent" />;
  }
  const income = transaction.type === "income";
  const Icon = income ? ArrowDownToLine : Wallet;
  return (
    <span
      aria-hidden="true"
      className={cx(
        "grid size-10 shrink-0 place-items-center rounded-full",
        income ? "bg-success-soft text-success-soft-text" : "bg-accent-soft text-accent-soft-text",
      )}
    >
      <Icon size={18} />
    </span>
  );
}

/**
 * One entry of a transaction list (Início, and Extrato in 011). Expenses show
 * the full amount paid with a minus sign; incomes a plus sign in green.
 */
export function TransactionRow({ transaction, showStatus = false, className }: TransactionRowProps) {
  const income = transaction.type === "income";
  const status = transaction.split_status;

  return (
    <li className={cx("flex items-center gap-3 border-b border-border py-3 last:border-b-0", className)}>
      <RowIcon transaction={transaction} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{transaction.description}</p>
        <p className="truncate text-xs text-muted">{metaLine(transaction)}</p>
      </div>
      {status && showStatus ? (
        <StatusPill status={status} className={showStatus === "md" ? "max-md:hidden" : undefined} />
      ) : null}
      <Money
        cents={income ? transaction.amount_cents : -transaction.amount_cents}
        signed={income}
        className={cx("shrink-0 text-right text-sm font-semibold md:min-w-[110px]", income && "text-success")}
      />
    </li>
  );
}
