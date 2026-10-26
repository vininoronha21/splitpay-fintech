import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { CardHeader } from "./CardHeader.tsx";
import { FormFeedback } from "./FormFeedback.tsx";
import { Money } from "./Money.tsx";
import { Button, Card, cx, ErrorState, MoneyField, Skeleton, TextArea } from "./ui/index.ts";
import {
  ADJUSTMENT_FIELD_ORDER,
  previewDelta,
  reasonCounter,
  toAdjustmentPayload,
  validateAdjustment,
  type AdjustmentField,
  type AdjustmentValues,
} from "../../lib/settings.ts";
import { useResource } from "../../lib/useResource.ts";
import { ApiError, createAdjustment, getBalance } from "../../services/api.ts";
import type { Cents } from "../../types/api.ts";

const GENERIC_ERROR_MESSAGE = "Algo deu errado. Tente novamente.";
const EMPTY_VALUES: AdjustmentValues = { newBalanceText: "", reason: "" };

interface AdjustBalanceCardProps {
  /** Bumped by SettingsScreen after each adjustment; reloads "Saldo atual". */
  version: number;
  /** One adjustment was stored: the screen reloads the balance and the history. */
  onAdjusted: () => void;
}

/**
 * "Ajustar saldo" (US05). The user types the balance the bank shows; the API
 * stores the delta against the balance at that moment (Business Rule 12).
 * The last loaded balance stays while it reloads, so the form never unmounts
 * and the "Saldo ajustado." line is announced.
 */
export function AdjustBalanceCard({ version, onAdjusted }: AdjustBalanceCardProps) {
  const balance = useResource((signal) => getBalance(signal), [version]);
  const loadedCents = balance.status === "ready" ? balance.data.balance_cents : null;
  const [lastCents, setLastCents] = useState<Cents | null>(null);

  useEffect(() => {
    if (loadedCents !== null) setLastCents(loadedCents);
  }, [loadedCents]);

  const currentCents = loadedCents ?? lastCents;

  if (balance.status === "error") {
    return <ErrorState title="Não foi possível carregar o saldo" message={balance.error.message} onRetry={balance.retry} />;
  }
  if (currentCents === null) {
    return <AdjustSkeleton />;
  }
  return <AdjustForm currentCents={currentCents} refreshing={loadedCents === null} onAdjusted={onAdjusted} />;
}

function AdjustSkeleton() {
  return (
    <Card aria-busy="true" aria-label="Carregando saldo">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="mt-1.5 h-4 w-full max-w-72" />
      <Skeleton className="mt-4 h-13 w-full rounded-2xl!" />
      <Skeleton className="mt-5 h-4 w-24" />
      <Skeleton className="mt-2 h-15 w-full" />
      <Skeleton className="mt-5 h-4 w-28" />
      <Skeleton className="mt-2 h-24 w-full" />
      <Skeleton className="mt-5 h-12 w-full" />
    </Card>
  );
}

interface AdjustFormProps {
  currentCents: Cents;
  /** The balance is reloading after an adjustment; the amount shows a skeleton. */
  refreshing: boolean;
  onAdjusted: () => void;
}

function AdjustForm({ currentCents, refreshing, onAdjusted }: AdjustFormProps) {
  const titleId = useId();
  const [values, setValues] = useState<AdjustmentValues>(EMPTY_VALUES);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const savingRef = useRef(false);
  const fields = useRef<Partial<Record<AdjustmentField, HTMLElement | null>>>({});

  const errors = submitted ? validateAdjustment(values, currentCents) : {};
  const delta = previewDelta(values.newBalanceText, currentCents);

  function update(patch: Partial<AdjustmentValues>) {
    setValues((current) => ({ ...current, ...patch }));
    setApiError(null);
    setSuccess(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    setSubmitted(true);
    setSuccess(null);
    const found = validateAdjustment(values, currentCents);
    const firstInvalid = ADJUSTMENT_FIELD_ORDER.find((field) => found[field] !== undefined);
    if (firstInvalid !== undefined) {
      fields.current[firstInvalid]?.focus();
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setApiError(null);
    try {
      await createAdjustment(toAdjustmentPayload(values));
      setValues(EMPTY_VALUES);
      setSubmitted(false);
      setSuccess("Saldo ajustado.");
      onAdjusted();
    } catch (caught) {
      setApiError(caught instanceof ApiError ? caught.message : GENERIC_ERROR_MESSAGE);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <Card aria-labelledby={titleId}>
      <CardHeader
        title="Ajustar saldo"
        titleId={titleId}
        note="Use quando o saldo do app estiver diferente do saldo no banco."
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl bg-neutral-soft px-4 py-3.5">
        <span className="text-sm text-muted">Saldo atual</span>
        {refreshing ? (
          <Skeleton className="h-6 w-28" />
        ) : (
          <Money cents={currentCents} className="text-lg leading-tight font-bold" />
        )}
      </div>

      <form noValidate onSubmit={(event) => void handleSubmit(event)} className="mt-5">
        <MoneyField
          ref={(element) => {
            fields.current.newBalance = element;
          }}
          label="Novo saldo"
          value={values.newBalanceText}
          onChange={(newBalanceText) => update({ newBalanceText })}
          error={errors.newBalance}
        />
        {delta !== null ? (
          <p className="mt-2 text-sm text-muted">
            Diferença:{" "}
            <Money cents={delta} signed className={cx("font-semibold", delta > 0 ? "text-success" : "text-danger")} />
          </p>
        ) : null}

        <TextArea
          ref={(element) => {
            fields.current.reason = element;
          }}
          className="mt-5"
          label="Justificativa"
          placeholder="Ex.: tarifa bancária não registrada"
          value={values.reason}
          onChange={(event) => update({ reason: event.target.value })}
          hint="Obrigatória, com pelo menos 10 caracteres."
          aside={reasonCounter(values.reason)}
          error={errors.reason}
        />

        <Button type="submit" fullWidth disabled={saving} className="mt-5">
          {saving ? "Salvando..." : "Confirmar ajuste"}
        </Button>
        <FormFeedback success={success} error={apiError} />
      </form>
    </Card>
  );
}
