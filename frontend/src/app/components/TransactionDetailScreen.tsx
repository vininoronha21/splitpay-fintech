import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, SearchX } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { CardHeader } from "./CardHeader.tsx";
import { Money } from "./Money.tsx";
import { SettleActions } from "./SettleActions.tsx";
import { Avatar, buttonClasses, Card, cx, ErrorState, focusRing, Skeleton, StatusPill } from "./ui/index.ts";
import { formatLongDate } from "../../lib/dates.ts";
import { formatBRL } from "../../lib/money.ts";
import {
  firstName,
  installmentLabel,
  paymentMethodLabel,
  splitModeLabel,
  statusLabel,
} from "../../lib/statement.ts";
import { useResource } from "../../lib/useResource.ts";
import { getTransaction } from "../../services/api.ts";
import type { SplitDetail, TransactionDetail } from "../../types/api.ts";

/** Longest signed amount drawn at the large size on a 360 px screen. */
const LARGE_AMOUNT_CHARS = 15;

/** "12" -> 12; "abc", "0", "-1", "1.5" or an id past the safe integers -> null (not found, no request). */
function parseId(raw: string | undefined): number | null {
  if (raw === undefined || !/^[1-9]\d*$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : null;
}

/**
 * /extrato/:id (US03). Keyed by id, so opening another entry starts from a
 * fresh request and no local copy carries over.
 */
export function TransactionDetailScreen() {
  const id = parseId(useParams().id);
  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-3 md:gap-4">
      <BackButton />
      {id === null ? <DetailNotFound /> : <TransactionDetailView key={id} id={id} />}
    </div>
  );
}

/** Back to the previous screen (the list keeps its filter), or to /extrato when opened directly. */
function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <button
      type="button"
      aria-label="Voltar"
      onClick={() => (location.key !== "default" ? navigate(-1) : navigate("/extrato"))}
      className={cx(
        "grid size-11 shrink-0 place-items-center rounded-full border border-border bg-surface text-text hover:bg-neutral-soft",
        focusRing,
      )}
    >
      <ArrowLeft size={18} aria-hidden="true" />
    </button>
  );
}

function DetailNotFound() {
  return (
    <Card className="flex flex-col items-center px-4 py-8 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-neutral-soft text-neutral-soft-text">
        <SearchX size={22} aria-hidden="true" />
      </span>
      <h1 className="mt-3 font-semibold">Lançamento não encontrado</h1>
      <Link to="/extrato" className={cx(buttonClasses({ size: "sm" }), "mt-4")}>
        Voltar para o extrato
      </Link>
    </Card>
  );
}

function TransactionDetailView({ id }: { id: number }) {
  const resource = useResource((signal) => getTransaction(id, signal), [id]);
  // Local copy after a settle or a background reload; null means "use the loaded data".
  const [override, setOverride] = useState<TransactionDetail | null>(null);
  const reload = useRef<AbortController | null>(null);

  useEffect(() => () => reload.current?.abort(), []);

  if (resource.status === "loading") return <DetailSkeleton />;
  if (resource.status === "error") {
    if (resource.error.status === 404) return <DetailNotFound />;
    return (
      <ErrorState title="Não foi possível carregar o lançamento" message={resource.error.message} onRetry={resource.retry} />
    );
  }

  const detail = override ?? resource.data;

  function handleSettled(split: SplitDetail) {
    setOverride((current) => ({ ...(current ?? detail), split }));
  }

  // 409: another visitor closed the share first; the detail reloads in the background.
  function handleConflict() {
    reload.current?.abort();
    const controller = new AbortController();
    reload.current = controller;
    getTransaction(id, controller.signal).then(
      (fresh) => {
        if (!controller.signal.aborted) setOverride(fresh);
      },
      () => {
        // The message already says the share was closed; the current data stays.
      },
    );
  }

  return (
    <>
      <DetailHeader detail={detail} />
      <DetailFields detail={detail} />
      {detail.split ? (
        <SplitCard
          transactionId={detail.id}
          split={detail.split}
          onSettled={handleSettled}
          onConflict={handleConflict}
        />
      ) : null}
    </>
  );
}

/** Type, description and the signed full amount (Business Rule 5). */
function DetailHeader({ detail }: { detail: TransactionDetail }) {
  const income = detail.type === "income";
  const cents = income ? detail.amount_cents : -detail.amount_cents;
  const large = formatBRL(cents).length + (income ? 1 : 0) <= LARGE_AMOUNT_CHARS;
  return (
    <Card>
      <p className="text-xs font-semibold tracking-[0.06em] text-muted uppercase">{income ? "Receita" : "Gasto"}</p>
      <h1 className="mt-1 text-xl leading-snug font-bold break-words md:text-2xl">{detail.description}</h1>
      <p className={cx("mt-2 leading-tight font-bold", large ? "text-[28px] md:text-[32px]" : "text-xl md:text-2xl")}>
        <Money cents={cents} signed={income} className={income ? "text-success" : undefined} />
      </p>
    </Card>
  );
}

interface FieldProps {
  label: string;
  /** null shows "Não informado". */
  children: ReactNode;
  /** Label above the value, for long text such as Observações. */
  stacked?: boolean;
}

/** One `dt`/`dd` pair; an empty optional value reads "Não informado" in muted. */
function Field({ label, children, stacked = false }: FieldProps) {
  const empty = children === null || children === undefined;
  return (
    <div
      className={cx(
        "border-b border-border py-3 last:border-b-0",
        stacked ? "flex flex-col gap-1" : "flex items-center justify-between gap-4",
      )}
    >
      <dt className="max-w-[50%] shrink-0 text-sm break-words text-muted">{label}</dt>
      <dd
        className={cx(
          "min-w-0 text-sm break-words",
          stacked ? "whitespace-pre-line" : "text-right",
          empty ? "text-muted" : "font-medium",
        )}
      >
        {empty ? "Não informado" : children}
      </dd>
    </div>
  );
}

/** The US03 field set; every optional field is always listed. */
function DetailFields({ detail }: { detail: TransactionDetail }) {
  return (
    <Card padded={false} className="px-4 pt-4 pb-1 md:px-6">
      <CardHeader title="Detalhes" titleId="detalhes-titulo" />
      <dl aria-labelledby="detalhes-titulo">
        <Field label="Data">{formatLongDate(detail.occurred_on)}</Field>
        {detail.type === "expense" ? <Field label="Categoria">{detail.category_name}</Field> : null}
        <Field label="Local">{detail.place}</Field>
        <Field label="Forma de pagamento">
          {detail.payment_method ? paymentMethodLabel(detail.payment_method) : null}
        </Field>
        <Field label="Parcela">{installmentLabel(detail.installment_number, detail.installment_total)}</Field>
        <Field label="Observações" stacked>
          {detail.notes}
        </Field>
      </dl>
    </Card>
  );
}

interface SplitCardProps {
  transactionId: number;
  split: SplitDetail;
  onSettled: (split: SplitDetail) => void;
  onConflict: () => void;
}

/** "Divisão": the friend, how it was split, both shares, the status and, while open, the actions. */
function SplitCard({ transactionId, split, onSettled, onConflict }: SplitCardProps) {
  return (
    <Card padded={false} className="px-4 pt-4 pb-1 md:px-6">
      <CardHeader title="Divisão" titleId="divisao-titulo" />
      <dl aria-labelledby="divisao-titulo">
        <Field label="Amigo">
          <span className="flex min-w-0 items-center justify-end gap-2">
            <Avatar name={split.person_name} size="sm" tone="accent" />
            {/* The detail shows the full name: it wraps instead of truncating. */}
            <span className="min-w-0 break-words">{split.person_name}</span>
          </span>
        </Field>
        <Field label="Como dividiu">{splitModeLabel(split)}</Field>
        <Field label={`Parte de ${firstName(split.person_name)}`}>
          <Money cents={split.friend_share_cents} />
        </Field>
        <Field label="Sua parte">
          <Money cents={split.user_share_cents} />
        </Field>
        <Field label="Status">
          <StatusPill status={split.status} label={statusLabel(split.status, split.settled_on)} />
        </Field>
      </dl>
      <SettleActions
        transactionId={transactionId}
        friendName={split.person_name}
        shareCents={split.friend_share_cents}
        status={split.status}
        layout="block"
        onSettled={onSettled}
        onConflict={onConflict}
      />
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando lançamento" className="flex flex-col gap-3 md:gap-4">
      <Card>
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="mt-2 h-6 w-56 max-w-full" />
        <Skeleton className="mt-3 h-8 w-40" />
      </Card>
      <Card>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex items-center justify-between gap-4 py-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </Card>
    </div>
  );
}
