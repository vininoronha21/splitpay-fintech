/**
 * Extrato logic (spec 011), free of React: joins the two API lists, filters by
 * reimbursement status, sums the summary cards and builds the pt-BR labels.
 * Every amount is integer cents; totals are plain integer sums.
 */
import { formatShortDate } from "./dates.ts";
import { trimInvisible } from "./text.ts";
import type {
  Cents,
  IsoDate,
  PaymentMethod,
  Reimbursement,
  SplitDetail,
  SplitMode,
  SplitStatus,
  TransactionSummary,
} from "../types/api.ts";

/** One Extrato row: a transaction and, for a split expense, its friend's share. */
export interface StatementEntry {
  transaction: TransactionSummary;
  reimbursement: Reimbursement | null;
}

/** The two summary cards: "A receber" and "Já recebido". */
export interface StatementTotals {
  openCents: Cents;
  openCount: number;
  receivedCents: Cents;
}

/** Statuses in chip order, after "Todos". */
export const STATUS_FILTERS: readonly SplitStatus[] = ["em_aberto", "pago", "acertado"];

/** `?status=` value to a status; a missing or unknown value means "Todos" (null). */
export function parseStatusParam(value: string | null): SplitStatus | null {
  return value === "em_aberto" || value === "pago" || value === "acertado" ? value : null;
}

/**
 * Attaches each reimbursement to its transaction, keeping the API order of
 * `transactions` (newest first). A transaction without a share gets null.
 */
export function buildEntries(
  transactions: readonly TransactionSummary[],
  reimbursements: readonly Reimbursement[],
): StatementEntry[] {
  const byTransaction = new Map<number, Reimbursement>();
  for (const reimbursement of reimbursements) {
    byTransaction.set(reimbursement.transaction_id, reimbursement);
  }
  return transactions.map((transaction) => ({
    transaction,
    reimbursement: byTransaction.get(transaction.id) ?? null,
  }));
}

/**
 * Entries for a chip: every entry for "Todos" (null), otherwise the split
 * expenses whose share has `status`. Ids in `keep` stay listed whatever their
 * status, so a row settled under "Em aberto" updates in place instead of
 * vanishing under the user's finger.
 */
export function filterEntries(
  entries: readonly StatementEntry[],
  status: SplitStatus | null,
  keep: ReadonlySet<number> = new Set(),
): StatementEntry[] {
  if (status === null) {
    return [...entries];
  }
  return entries.filter(
    (entry) => entry.reimbursement?.status === status || keep.has(entry.transaction.id),
  );
}

/** Integer sums of the friends' shares: open ones and those received (pago). */
export function statementTotals(entries: readonly StatementEntry[]): StatementTotals {
  let openCents = 0;
  let openCount = 0;
  let receivedCents = 0;
  for (const { reimbursement } of entries) {
    if (reimbursement === null) continue;
    if (reimbursement.status === "em_aberto") {
      openCents += reimbursement.share_cents;
      openCount += 1;
    } else if (reimbursement.status === "pago") {
      receivedCents += reimbursement.share_cents;
    }
  }
  return { openCents, openCount, receivedCents };
}

/**
 * The entries after `PATCH /reimbursements/{id}` answered with `split`: only
 * that entry changes (status, settled day and share), the others keep their
 * identity, so the list, the filter and the totals follow without a refetch.
 */
export function applySettle(
  entries: readonly StatementEntry[],
  transactionId: number,
  split: SplitDetail,
): StatementEntry[] {
  return entries.map((entry) => {
    if (entry.transaction.id !== transactionId || entry.reimbursement === null) {
      return entry;
    }
    return {
      transaction: { ...entry.transaction, split_status: split.status },
      reimbursement: {
        ...entry.reimbursement,
        status: split.status,
        settled_on: split.settled_on,
        share_cents: split.friend_share_cents,
      },
    };
  });
}

/** "Ana Lima" -> "Ana"; a blank name stays as given. */
export function firstName(name: string): string {
  const trimmed = trimInvisible(name);
  return trimmed.split(/\s+/u)[0] ?? trimmed;
}

/** Status pill text: "Aguardando reembolso", "Pago em 20 out", "Acertado em 14 out". */
export function statusLabel(status: SplitStatus, settledOn: IsoDate | null): string {
  switch (status) {
    case "em_aberto":
      return "Aguardando reembolso";
    case "pago":
      return settledOn ? `Pago em ${formatShortDate(settledOn)}` : "Pago";
    case "acertado":
      return settledOn ? `Acertado em ${formatShortDate(settledOn)}` : "Acertado";
  }
}

/** "1 em aberto", "4 em aberto" or "Nada em aberto". */
export function openCountLabel(count: number): string {
  return count === 0 ? "Nada em aberto" : `${count} em aberto`;
}

/** Title of the empty list for a chip. */
export function emptyFilterTitle(status: SplitStatus): string {
  switch (status) {
    case "em_aberto":
      return "Nenhum reembolso em aberto";
    case "pago":
      return "Nenhum reembolso pago";
    case "acertado":
      return "Nenhum reembolso acertado";
  }
}

/** "Como dividiu": "Igual", "30%" or "Valor fixo". */
export function splitModeLabel(split: { mode: SplitMode; percent: number | null }): string {
  switch (split.mode) {
    case "equal":
      return "Igual";
    case "percentage":
      return `${split.percent ?? 0}%`;
    case "fixed":
      return "Valor fixo";
  }
}

/** "3 de 10", or null when the expense has no installments. */
export function installmentLabel(number: number | null, total: number | null): string | null {
  return number !== null && total !== null ? `${number} de ${total}` : null;
}

/** Payment methods in the order the form offers them. */
export const PAYMENT_METHODS: readonly PaymentMethod[] = ["pix", "debito", "credito", "dinheiro"];

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "Pix",
  debito: "Débito",
  credito: "Crédito",
  dinheiro: "Dinheiro",
};

/** "pix" -> "Pix", "debito" -> "Débito". */
export function paymentMethodLabel(method: PaymentMethod): string {
  return PAYMENT_METHOD_LABELS[method];
}
