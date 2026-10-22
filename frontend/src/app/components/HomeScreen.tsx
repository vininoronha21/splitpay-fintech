import { BalanceHeader } from "./BalanceHeader.tsx";
import { BudgetCard } from "./BudgetCard.tsx";
import { CategorySummaryCard } from "./CategorySummaryCard.tsx";
import { QuickActions } from "./QuickActions.tsx";
import { ReceivableCard } from "./ReceivableCard.tsx";
import { RecentTransactionsCard } from "./RecentTransactionsCard.tsx";

/**
 * Início. Arranges the cards only; each card loads its own data, so one failed
 * request shows one error card. A single stack on mobile, two columns from `lg`
 * (balance, budget and "A receber" left; categories and entries right).
 */
export function HomeScreen() {
  return (
    <div className="grid grid-cols-1 items-start gap-3 md:gap-4 lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-5">
      <h1 className="sr-only">Início</h1>
      <div className="flex min-w-0 flex-col gap-3 md:gap-4">
        {/* Full width below md (AppLayout drops its gutter on Início); the rest keeps a 16 px gutter. */}
        <BalanceHeader />
        <div className="flex flex-col gap-3 px-4 md:gap-4 md:px-0">
          <QuickActions />
          <BudgetCard />
          <ReceivableCard />
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-3 px-4 md:gap-4 md:px-0">
        <CategorySummaryCard />
        <RecentTransactionsCard />
      </div>
    </div>
  );
}
