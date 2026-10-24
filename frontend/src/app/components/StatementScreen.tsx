import { useEffect, useRef, useState } from "react";
import { Plus, ReceiptText } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { Money } from "./Money.tsx";
import { ScreenTitle } from "./ScreenPlaceholder.tsx";
import { SettleActions } from "./SettleActions.tsx";
import { StatementSummary } from "./StatementSummary.tsx";
import { StatusFilter } from "./StatusFilter.tsx";
import { TransactionRow } from "./TransactionRow.tsx";
import { buttonClasses, Card, cx, EmptyState, ErrorState, Skeleton, StatusPill } from "./ui/index.ts";
import {
  applySettle,
  buildEntries,
  emptyFilterTitle,
  filterEntries,
  firstName,
  parseStatusParam,
  statementTotals,
  statusLabel,
  type StatementEntry,
} from "../../lib/statement.ts";
import { useResource } from "../../lib/useResource.ts";
import { listReimbursements, listTransactions } from "../../services/api.ts";
import type { Reimbursement, SplitDetail, SplitStatus } from "../../types/api.ts";

const SKELETON_ROWS = 5;

/** Both lists in one request pair, joined by transaction id (spec Data Rules). */
async function loadEntries(signal: AbortSignal): Promise<StatementEntry[]> {
  const [transactions, reimbursements] = await Promise.all([
    listTransactions({}, signal),
    listReimbursements({}, signal),
  ]);
  return buildEntries(transactions, reimbursements);
}

/** Rows settled while a chip is selected stay on screen until the chip changes. */
interface KeptRows {
  status: SplitStatus | null;
  ids: ReadonlySet<number>;
}

/**
 * Extrato (US03, US01). Loads every transaction and every share once per
 * visit; chips filter on the client and a settle updates one entry in place,
 * so the list, the chip filter and the summary always agree.
 */
export function StatementScreen() {
  const [params, setParams] = useSearchParams();
  const status = parseStatusParam(params.get("status"));
  const resource = useResource((signal) => loadEntries(signal), []);

  // Local copy after a settle or a background reload; null means "use the loaded data".
  const [override, setOverride] = useState<StatementEntry[] | null>(null);
  const [kept, setKept] = useState<KeptRows>({ status: null, ids: new Set() });
  const reload = useRef<AbortController | null>(null);

  useEffect(() => () => reload.current?.abort(), []);

  const entries = override ?? (resource.status === "ready" ? resource.data : null);

  // A new chip starts a new view: rows settled under the previous one are not kept.
  const changeStatus = (next: SplitStatus | null) => {
    setKept({ status: next, ids: new Set() });
    setParams(next === null ? {} : { status: next }, { replace: true });
  };

  function keep(id: number) {
    setKept((current) => ({ status, ids: new Set(current.status === status ? [...current.ids, id] : [id]) }));
  }

  function handleSettled(id: number, split: SplitDetail) {
    keep(id);
    // A settle only happens on a drawn row, so `entries` is set here.
    setOverride((current) => applySettle(current ?? entries ?? [], id, split));
  }

  // 409: another visitor closed the share. The list reloads in the background,
  // so the row keeps its message instead of turning into a skeleton.
  function handleConflict(id: number) {
    keep(id);
    reload.current?.abort();
    const controller = new AbortController();
    reload.current = controller;
    loadEntries(controller.signal).then(
      (fresh) => {
        if (!controller.signal.aborted) setOverride(fresh);
      },
      () => {
        // The row already says the share was closed; the current list stays.
      },
    );
  }

  const retry = () => {
    setOverride(null);
    resource.retry();
  };

  const keptIds = kept.status === status ? kept.ids : new Set<number>();

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-3 md:gap-4">
      <div>
        <ScreenTitle>Extrato</ScreenTitle>
        <p className="mt-1 text-sm text-muted">Seus lançamentos e reembolsos</p>
      </div>

      {resource.status === "error" ? (
        <ErrorState title="Não foi possível carregar o extrato" message={resource.error.message} onRetry={retry} />
      ) : (
        <StatementSummary totals={entries ? statementTotals(entries) : null} />
      )}

      <StatusFilter value={status} onChange={changeStatus} />

      {entries === null ? (
        resource.status === "error" ? null : <ListSkeleton />
      ) : (
        <StatementList
          entries={filterEntries(entries, status, keptIds)}
          status={status}
          onSettled={handleSettled}
          onConflict={handleConflict}
        />
      )}

      <p className="text-xs leading-relaxed text-muted">
        Recebi: a parte do amigo volta para o seu saldo. Já acertamos: encerra o reembolso sem alterar o saldo, por
        exemplo quando vocês compensaram de outra forma. As duas ações são definitivas.
      </p>
    </div>
  );
}

function ListSkeleton() {
  return (
    <Card aria-busy="true" aria-label="Carregando lançamentos" className="py-1 md:px-6">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <div key={index} className="flex items-center gap-3 border-b border-border py-3 last:border-b-0">
          <Skeleton className="size-10 rounded-full!" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="mt-1.5 h-3.5 w-28 max-w-full" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </Card>
  );
}

interface StatementListProps {
  entries: StatementEntry[];
  status: SplitStatus | null;
  onSettled: (id: number, split: SplitDetail) => void;
  onConflict: (id: number) => void;
}

function StatementList({ entries, status, onSettled, onConflict }: StatementListProps) {
  if (entries.length === 0) {
    return (
      <Card>
        {status === null ? (
          <EmptyState
            icon={ReceiptText}
            title="Nenhum lançamento ainda"
            action={
              <Link to="/novo-gasto" className={buttonClasses({ size: "sm" })}>
                <Plus size={16} aria-hidden="true" />
                Novo gasto
              </Link>
            }
          />
        ) : (
          <EmptyState icon={ReceiptText} title={emptyFilterTitle(status)} />
        )}
      </Card>
    );
  }

  return (
    <Card padded={false} className="px-4 py-1 md:px-6">
      <ul aria-label="Lançamentos">
        {entries.map(({ transaction, reimbursement }) => (
          <TransactionRow
            key={transaction.id}
            transaction={transaction}
            href={`/extrato/${transaction.id}`}
            statusText={reimbursement ? statusLabel(reimbursement.status, reimbursement.settled_on) : undefined}
            extra={reimbursement ? <SplitLine reimbursement={reimbursement} /> : undefined}
            actions={
              reimbursement ? (
                <SettleActions
                  transactionId={transaction.id}
                  friendName={reimbursement.person_name}
                  shareCents={reimbursement.share_cents}
                  status={reimbursement.status}
                  layout="row"
                  onSettled={(split) => onSettled(transaction.id, split)}
                  onConflict={() => onConflict(transaction.id)}
                />
              ) : undefined
            }
          />
        ))}
      </ul>
    </Card>
  );
}

/** Status pill with its date and "Parte de Ana: R$ 93,95". */
function SplitLine({ reimbursement }: { reimbursement: Reimbursement }) {
  const open = reimbursement.status === "em_aberto";
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <StatusPill status={reimbursement.status} label={statusLabel(reimbursement.status, reimbursement.settled_on)} />
      <span className="flex max-w-full min-w-0 text-xs text-muted">
        <span className="truncate">Parte de {firstName(reimbursement.person_name)}:</span>
        <Money
          cents={reimbursement.share_cents}
          className={cx("ml-1 shrink-0 font-semibold", open ? "text-accent-text" : "text-text")}
        />
      </span>
    </div>
  );
}
