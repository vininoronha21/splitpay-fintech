import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { BalanceHeader } from "./BalanceHeader.tsx";
import { BudgetCard } from "./BudgetCard.tsx";
import { CategorySummaryCard } from "./CategorySummaryCard.tsx";
import { QuickActions } from "./QuickActions.tsx";
import { ReceivableCard } from "./ReceivableCard.tsx";
import { RecentTransactionsCard } from "./RecentTransactionsCard.tsx";
import { isSavedState, SaveConfirmation } from "./SaveConfirmation.tsx";
import type { TransactionType } from "../../types/api.ts";

/**
 * The type just saved by the Novo gasto form, read once from router state.
 * The state is then cleared with `replace`, so a reload or a later visit
 * does not show the confirmation again.
 */
function useSavedConfirmation(): TransactionType | null {
  const location = useLocation();
  const navigate = useNavigate();
  const [saved] = useState<TransactionType | null>(() => (isSavedState(location.state) ? location.state.saved : null));
  const hasState = location.state !== null && location.state !== undefined;

  useEffect(() => {
    if (hasState) {
      navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null });
    }
  }, [hasState, navigate, location.pathname, location.search]);

  return saved;
}

/**
 * Início. Arranges the cards only; each card loads its own data, so one failed
 * request shows one error card. A single stack on mobile, two columns from `lg`
 * (balance, budget and "A receber" left; categories and entries right).
 */
export function HomeScreen() {
  const saved = useSavedConfirmation();
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
      <SaveConfirmation saved={saved} />
    </div>
  );
}
