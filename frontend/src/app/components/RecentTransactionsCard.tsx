import { Plus, ReceiptText } from "lucide-react";
import { Link } from "react-router";
import { CardHeader } from "./CardHeader.tsx";
import { TransactionRow } from "./TransactionRow.tsx";
import { buttonClasses, Card, EmptyState, ErrorState, Skeleton } from "./ui/index.ts";
import { useResource } from "../../lib/useResource.ts";
import { listTransactions } from "../../services/api.ts";

/** Rows on screen: three on mobile, a fourth from `md`. */
const ROWS = 4;

/** "Últimos lançamentos": the newest entries, as the API lists them (newest first). */
export function RecentTransactionsCard() {
  const transactions = useResource((signal) => listTransactions({}, signal), []);

  if (transactions.status === "error") {
    return (
      <ErrorState
        title="Não foi possível carregar os lançamentos"
        message={transactions.error.message}
        onRetry={transactions.retry}
      />
    );
  }

  const header = (
    <CardHeader title="Últimos lançamentos" titleId="lancamentos-titulo" link={{ to: "/extrato", label: "Ver extrato" }} />
  );

  if (transactions.status === "loading") {
    return (
      <Card aria-busy="true" aria-label="Carregando lançamentos" className="pt-1 pb-1 md:px-6 md:pt-2 md:pb-2">
        {header}
        <div>
          {Array.from({ length: ROWS }, (_, index) => (
            <div key={index} className={index === ROWS - 1 ? "hidden items-center gap-3 py-3 md:flex" : "flex items-center gap-3 py-3"}>
              <Skeleton className="size-10 rounded-full!" />
              <div className="flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-1.5 h-3.5 w-28" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const latest = transactions.data.slice(0, ROWS);

  return (
    <Card aria-labelledby="lancamentos-titulo" className="pt-1 pb-1 md:px-6 md:pt-2 md:pb-2">
      {header}
      {latest.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="Nenhum lançamento ainda"
          className="py-6"
          action={
            <Link to="/novo-gasto" className={buttonClasses({ size: "sm" })}>
              <Plus size={16} aria-hidden="true" />
              Novo gasto
            </Link>
          }
        />
      ) : (
        <ul>
          {latest.map((transaction, index) => (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
              href={`/extrato/${transaction.id}`}
              showStatus="md"
              // The fourth row appears from md; below it the third row is the last one.
              className={index === ROWS - 1 ? "max-md:hidden" : index === ROWS - 2 ? "max-md:border-b-0" : undefined}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
