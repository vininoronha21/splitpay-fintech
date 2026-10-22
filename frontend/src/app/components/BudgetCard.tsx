import { ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { linkCardClasses } from "./CardHeader.tsx";
import { Money } from "./Money.tsx";
import { Card, cx, ErrorState, Skeleton } from "./ui/index.ts";
import { monthName } from "../../lib/dates.ts";
import { useResource } from "../../lib/useResource.ts";
import { getBudget } from "../../services/api.ts";
import type { Budget } from "../../types/api.ts";

/** "Orçamento de outubro": own spending against the monthly budget; opens Gastos do mês. */
export function BudgetCard() {
  const budget = useResource((signal) => getBudget(signal), []);

  if (budget.status === "loading") {
    return (
      <Card aria-busy="true" aria-label="Carregando orçamento">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="mt-2.5 h-7 w-52" />
        <Skeleton className="mt-3 h-2 w-full rounded-full!" />
        <div className="mt-2 flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-28" />
        </div>
      </Card>
    );
  }
  if (budget.status === "error") {
    return <ErrorState title="Não foi possível carregar o orçamento" message={budget.error.message} onRetry={budget.retry} />;
  }
  return <BudgetContent budget={budget.data} />;
}

function BudgetContent({ budget }: { budget: Budget }) {
  const over = budget.remaining_cents < 0;
  // The bar stops at 100% wide; the text still shows the real percentage.
  const width = Math.min(budget.used_percent, 100);

  return (
    <Link to="/gastos-do-mes" className={linkCardClasses}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 text-base leading-snug font-semibold">Orçamento de {monthName(budget.month)}</h2>
        <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden="true" />
      </div>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-1.5">
        <Money cents={budget.spent_cents} className="text-[22px] leading-tight font-bold" />
        <span className="num text-[13px] text-muted">
          de <Money cents={budget.budget_cents} />
        </span>
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-track" aria-hidden="true">
        <div className={cx("h-full rounded-full", over ? "bg-danger" : "bg-accent")} style={{ width: `${width}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-x-3 text-xs text-muted">
        <span className="num">{budget.used_percent}% usado</span>
        {over ? (
          <span className="num font-semibold text-danger">
            Passou <Money cents={-budget.remaining_cents} />
          </span>
        ) : (
          <span className="num">
            Restam <Money cents={budget.remaining_cents} />
          </span>
        )}
      </div>
    </Link>
  );
}
