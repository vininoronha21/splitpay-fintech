import { useEffect, useId, useRef, useState } from "react";
import { Check, CircleAlert, CircleCheck } from "lucide-react";
import { Money } from "./Money.tsx";
import { Button, cx } from "./ui/index.ts";
import { firstName } from "../../lib/statement.ts";
import { ApiError, updateReimbursementStatus } from "../../services/api.ts";
import type { ClosedStatus, SplitDetail, SplitStatus } from "../../types/api.ts";

const GENERIC_ERROR_MESSAGE = "Algo deu errado. Tente novamente.";

const DONE_MESSAGES: Record<ClosedStatus, string> = {
  pago: "Reembolso marcado como pago.",
  acertado: "Reembolso encerrado.",
};

/**
 * idle: the two buttons. confirming: the inline question (saving while the
 * PATCH runs, with an error message after a failure). done and conflict: a
 * message only; the share is closed and there is no undo.
 */
type Phase =
  | { kind: "idle" }
  | { kind: "confirming"; target: ClosedStatus; saving: boolean; error: string | null }
  | { kind: "done"; target: ClosedStatus }
  | { kind: "conflict" };

/** Element to focus after the next render. */
type FocusTarget = ClosedStatus | "confirm" | "message";

interface SettleActionsProps {
  transactionId: number;
  /** Full name; the copy uses the first name. */
  friendName: string;
  shareCents: number;
  status: SplitStatus;
  /** `row` (Extrato list): indented under the row text, beside it from `md`. `block`: full width (detail). */
  layout: "row" | "block";
  /** The PATCH answered: the caller replaces its copy of the share. */
  onSettled: (split: SplitDetail) => void;
  /** 409: someone else closed the share first; the caller reloads its data. */
  onConflict: () => void;
}

/**
 * "Já acertamos" and "Recebi" for an open share (US01, spec 011). A tap opens
 * an inline confirmation in the same place; Confirmar sends one PATCH. The
 * status region stays mounted, so the success line is announced.
 */
export function SettleActions({
  transactionId,
  friendName,
  shareCents,
  status,
  layout,
  onSettled,
  onConflict,
}: SettleActionsProps) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [pendingFocus, setPendingFocus] = useState<FocusTarget | null>(null);
  const savingRef = useRef(false);
  const questionId = useId();

  const paidButton = useRef<HTMLButtonElement>(null);
  const settledButton = useRef<HTMLButtonElement>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const message = useRef<HTMLParagraphElement>(null);

  // Focus moves after the render that drew its target.
  useEffect(() => {
    if (pendingFocus === null) return;
    const targets = { pago: paidButton, acertado: settledButton, confirm: confirmButton, message };
    targets[pendingFocus].current?.focus();
    setPendingFocus(null);
  }, [pendingFocus]);

  function open(target: ClosedStatus) {
    setPhase({ kind: "confirming", target, saving: false, error: null });
    setPendingFocus("confirm");
  }

  function cancel(target: ClosedStatus) {
    setPhase({ kind: "idle" });
    setPendingFocus(target);
  }

  async function confirm(target: ClosedStatus) {
    if (savingRef.current) return;
    savingRef.current = true;
    setPhase({ kind: "confirming", target, saving: true, error: null });
    try {
      const split = await updateReimbursementStatus(transactionId, target);
      setPhase({ kind: "done", target });
      setPendingFocus("message");
      onSettled(split);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        setPhase({ kind: "conflict" });
        setPendingFocus("message");
        onConflict();
      } else {
        const error = caught instanceof ApiError ? caught.message : GENERIC_ERROR_MESSAGE;
        setPhase({ kind: "confirming", target, saving: false, error });
        setPendingFocus("confirm");
      }
    } finally {
      savingRef.current = false;
    }
  }

  const shareOpen = status === "em_aberto";
  const showControls = shareOpen && (phase.kind === "idle" || phase.kind === "confirming");
  const visible = showControls || phase.kind === "done" || phase.kind === "conflict";
  const first = firstName(friendName);

  return (
    // Nothing to show (a closed share): the wrapper keeps the status region mounted, out of the layout.
    <div
      className={cx(
        !visible && "sr-only",
        visible && "w-full",
        visible && layout === "row" && "pl-13",
        visible && layout === "block" && "mt-1 mb-3",
        visible && layout === "row" && phase.kind === "idle" && "md:w-auto md:pl-0",
      )}
    >
      {showControls && phase.kind === "idle" ? (
        <div className={cx("grid grid-cols-2 gap-2", layout === "row" && "md:flex")}>
          <Button ref={settledButton} variant="ghost" size="sm" className="px-3" onClick={() => open("acertado")}>
            Já acertamos
          </Button>
          <Button ref={paidButton} variant="success" size="sm" icon={Check} className="px-3" onClick={() => open("pago")}>
            Recebi
          </Button>
        </div>
      ) : null}

      {showControls && phase.kind === "confirming" ? (
        <div role="group" aria-labelledby={questionId} className="rounded-2xl border border-border bg-neutral-soft p-3">
          <p id={questionId} className="text-sm">
            {phase.target === "pago" ? (
              <>
                Confirmar que <span className="font-semibold break-words">{first}</span> pagou{" "}
                <Money cents={shareCents} className="font-semibold" />? O valor volta para o seu saldo.
              </>
            ) : (
              "Encerrar sem alterar o saldo?"
            )}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              ref={confirmButton}
              size="sm"
              className="px-3"
              disabled={phase.saving}
              onClick={() => void confirm(phase.target)}
            >
              {phase.saving ? "Salvando..." : "Confirmar"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="px-3"
              disabled={phase.saving}
              onClick={() => cancel(phase.target)}
            >
              Cancelar
            </Button>
          </div>
          {phase.error ? (
            <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm text-danger">
              <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0">{phase.error}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {phase.kind === "conflict" ? (
        <p ref={message} tabIndex={-1} role="alert" className="flex items-start gap-1.5 text-sm text-danger outline-none">
          <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0">Este reembolso já foi encerrado.</span>
        </p>
      ) : null}

      <div role="status">
        {phase.kind === "done" ? (
          <p
            ref={message}
            tabIndex={-1}
            className="flex items-start gap-1.5 text-sm font-medium text-success-soft-text outline-none"
          >
            <CircleCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0">{DONE_MESSAGES[phase.target]}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
