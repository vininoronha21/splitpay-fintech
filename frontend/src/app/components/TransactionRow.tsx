import type { ReactNode } from "react";
import { ArrowDownToLine, Wallet } from "lucide-react";
import { Link } from "react-router";
import { Money } from "./Money.tsx";
import { Avatar, cx, focusRing, StatusPill } from "./ui/index.ts";
import { formatShortDate } from "../../lib/dates.ts";
import { formatBRL } from "../../lib/money.ts";
import { useHideValues } from "../../lib/preferences.ts";
import { statusLabel } from "../../lib/statement.ts";
import type { TransactionSummary } from "../../types/api.ts";

interface TransactionRowProps {
  transaction: TransactionSummary;
  /** Status pill of a split expense: always, never, or from `md` only (Início). */
  showStatus?: boolean | "md";
  /** Makes the row content one link (the detail view, spec 011). */
  href?: string;
  /** Status in the link's accessible name, e.g. "Pago em 20 out"; defaults to the pill label. */
  statusText?: string;
  /** Line under the description, outside the link (Extrato: status pill and the friend's share). */
  extra?: ReactNode;
  /** Buttons outside the link: under the row on mobile, at its right from `md` when they fit. */
  actions?: ReactNode;
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

/** Signed full amount as cents: expenses negative, incomes positive. */
function signedCents(transaction: TransactionSummary): number {
  return transaction.type === "income" ? transaction.amount_cents : -transaction.amount_cents;
}

/**
 * One entry of a transaction list (Início and Extrato). Expenses show the full
 * amount paid with a minus sign; incomes a plus sign in green. With `href` the
 * content is a single link named "description, amount, status"; `extra` and
 * `actions` stay outside it, so no interactive element is nested in another.
 */
export function TransactionRow({
  transaction,
  showStatus = false,
  href,
  statusText,
  extra,
  actions,
  className,
}: TransactionRowProps) {
  const [hidden] = useHideValues();
  const income = transaction.type === "income";
  const status = transaction.split_status;
  const cents = signedCents(transaction);

  const content = (
    <>
      <RowIcon transaction={transaction} />
      {/* The amount wraps under the text, right aligned, when keeping it beside would leave the text under 8rem. */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-x-3 gap-y-0.5">
        <div className="min-w-0 flex-[1_1_8rem]">
          <p className={cx("truncate text-sm font-medium", href && "group-hover:underline")}>{transaction.description}</p>
          <p className="truncate text-xs text-muted">{metaLine(transaction)}</p>
        </div>
        {status && showStatus ? (
          <StatusPill status={status} className={showStatus === "md" ? "max-md:hidden" : undefined} />
        ) : null}
        <Money
          cents={cents}
          signed={income}
          className={cx("shrink-0 text-right text-sm font-semibold md:min-w-[110px]", income && "text-success")}
        />
      </div>
    </>
  );

  if (!href) {
    return (
      <li className={cx("flex items-center gap-3 border-b border-border py-3 last:border-b-0", className)}>{content}</li>
    );
  }

  // The visible amount goes through Money; the link's name follows the same mask.
  const amountText = hidden ? "Valor oculto" : `${income ? "+" : ""}${formatBRL(cents)}`;
  const statusName = statusText ?? (status ? statusLabel(status, null) : null);
  const name = [transaction.description, amountText, statusName].filter(Boolean).join(", ");

  return (
    <li className={cx("border-b border-border py-3 last:border-b-0", className)}>
      {/* Wraps: the actions sit at the right of the text when both fit (md), under it otherwise. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-[1_1_18rem]">
          <Link
            to={href}
            aria-label={name}
            className={cx("group -m-1 flex min-h-11 items-center gap-3 rounded-xl p-1", focusRing)}
          >
            {content}
          </Link>
          {extra ? <div className="mt-1.5 pl-13">{extra}</div> : null}
        </div>
        {actions}
      </div>
    </li>
  );
}
