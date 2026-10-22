import { ChevronRight, Clock } from "lucide-react";
import { Link } from "react-router";
import { linkCardClasses } from "./CardHeader.tsx";
import { Money } from "./Money.tsx";
import { Card, cx, ErrorState, Skeleton } from "./ui/index.ts";
import { formatBRL } from "../../lib/money.ts";
import { useResource } from "../../lib/useResource.ts";
import { getReimbursementSummary } from "../../services/api.ts";

/** "1 reembolso em aberto", "4 reembolsos em aberto" or "Nenhum reembolso em aberto". */
function openCountLabel(count: number): string {
  if (count === 0) return "Nenhum reembolso em aberto";
  return count === 1 ? "1 reembolso em aberto" : `${count} reembolsos em aberto`;
}

/** "A receber de amigos": open reimbursements; opens Extrato filtered by them. */
export function ReceivableCard() {
  const summary = useResource((signal) => getReimbursementSummary(signal), []);

  if (summary.status === "error") {
    return (
      <ErrorState
        title="Não foi possível carregar os reembolsos"
        message={summary.error.message}
        onRetry={summary.retry}
      />
    );
  }

  const icon = (
    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-soft-text">
      <Clock size={20} aria-hidden="true" />
    </span>
  );

  if (summary.status === "loading") {
    return (
      <Card aria-busy="true" aria-label="Carregando reembolsos" className="flex items-center gap-3">
        {icon}
        <div className="min-w-0 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-1 h-6 w-28" />
          <Skeleton className="mt-1 h-4 w-40" />
        </div>
      </Card>
    );
  }

  return (
    <Link to="/extrato?status=em_aberto" className={cx(linkCardClasses, "flex items-center gap-3")}>
      {icon}
      <div className="min-w-0 flex-1">
        <h2 className="text-[13px] text-muted">A receber de amigos</h2>
        <p className={cx("leading-snug font-bold", formatBRL(summary.data.open_cents).length > 16 ? "text-lg" : "text-xl")}>
          <Money cents={summary.data.open_cents} />
        </p>
        <p className="text-xs text-muted">{openCountLabel(summary.data.open_count)}</p>
      </div>
      <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden="true" />
    </Link>
  );
}
