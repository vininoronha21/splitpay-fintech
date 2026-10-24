import { Money } from "./Money.tsx";
import { Card, cx, Skeleton } from "./ui/index.ts";
import { formatBRL } from "../../lib/money.ts";
import { openCountLabel, type StatementTotals } from "../../lib/statement.ts";

/** Longest amount that fits half of a 360 px screen at 20 px ("R$ 99.999,99" is 12). */
const HALF_WIDTH_CHARS = 13;

interface StatementSummaryProps {
  /** null while the lists load. */
  totals: StatementTotals | null;
}

/**
 * "A receber" and "Já recebido" side by side in one card, as in the
 * prototype. Very large amounts stack the two halves below `md` instead of
 * shrinking the type until it is unreadable.
 */
export function StatementSummary({ totals }: StatementSummaryProps) {
  if (totals === null) {
    return (
      <Card aria-busy="true" aria-label="Carregando resumo" padded={false} className="grid grid-cols-2 divide-x divide-border">
        {[0, 1].map((index) => (
          <div key={index} className="p-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-1.5 h-6 w-28 max-w-full" />
            <Skeleton className="mt-1.5 h-3.5 w-24 max-w-full" />
          </div>
        ))}
      </Card>
    );
  }

  const long = Math.max(formatBRL(totals.openCents).length, formatBRL(totals.receivedCents).length) > HALF_WIDTH_CHARS;
  const amountClass = cx("mt-0.5 leading-snug font-bold", long ? "text-lg" : "text-xl");

  return (
    <Card
      padded={false}
      className={cx(
        "grid divide-border",
        long ? "grid-cols-1 divide-y md:grid-cols-2 md:divide-x md:divide-y-0" : "grid-cols-2 divide-x",
      )}
    >
      <section aria-labelledby="resumo-a-receber" className="min-w-0 p-4">
        <h2 id="resumo-a-receber" className="text-[13px] text-muted">
          A receber
        </h2>
        <p className={cx(amountClass, "text-accent-text")}>
          <Money cents={totals.openCents} />
        </p>
        <p className="truncate text-xs text-muted">{openCountLabel(totals.openCount)}</p>
      </section>
      <section aria-labelledby="resumo-recebido" className="min-w-0 p-4">
        <h2 id="resumo-recebido" className="text-[13px] text-muted">
          Já recebido
        </h2>
        <p className={cx(amountClass, "text-success")}>
          <Money cents={totals.receivedCents} />
        </p>
        <p className="truncate text-xs text-muted">Somado ao saldo</p>
      </section>
    </Card>
  );
}
