import { ChevronRight, CircleAlert } from "lucide-react";
import { Chip, cx, focusRing, TextField } from "./ui/index.ts";
import { FieldFrame, useFieldIds } from "./ui/TextField.tsx";
import type { DetailValues, FieldName, FormErrors } from "../../lib/transactionForm.ts";
import type { PaymentMethod } from "../../types/api.ts";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "pix", label: "Pix" },
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
  { value: "dinheiro", label: "Dinheiro" },
];

/** Detail fields this section can focus when they hold the first error. */
type DetailField = Extract<FieldName, "place" | "installments" | "notes">;

/** Fields inside "Mais detalhes": an error in any of them opens the section. */
export const DETAIL_FIELDS: ReadonlySet<FieldName> = new Set<FieldName>(["place", "installments", "notes"]);

interface MoreDetailsProps {
  open: boolean;
  onToggle: () => void;
  details: DetailValues;
  onChange: (patch: Partial<DetailValues>) => void;
  /** Incomes have no installments (Business Rule 14). */
  showInstallments: boolean;
  /** Errors to show now (already filtered by touched or submitted). */
  errors: FormErrors;
  registerField: (field: DetailField, element: HTMLElement | null) => void;
  onFieldBlur: (field: DetailField) => void;
}

/** Shared look of the plain inputs and the textarea (same as TextField). */
function controlClasses(invalid: boolean): string {
  return cx(
    "w-full min-w-0 rounded-xl border bg-surface px-4 text-base text-text placeholder:text-muted",
    "transition-colors motion-reduce:transition-none",
    invalid ? "border-danger" : "border-border focus:border-accent",
    focusRing,
  );
}

function digitsOnly(text: string): string {
  return text.replace(/\D/g, "");
}

/**
 * "Mais detalhes": an inline section that expands under its button (spec
 * decision), with Local, Forma de pagamento, Parcelas and Observações.
 */
export function MoreDetails({
  open,
  onToggle,
  details,
  onChange,
  showInstallments,
  errors,
  registerField,
  onFieldBlur,
}: MoreDetailsProps) {
  const summary = showInstallments
    ? "Local, forma de pagamento, parcelas e observações"
    : "Local, forma de pagamento e observações";

  return (
    <section className="rounded-[20px] border border-border bg-surface shadow-xs">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="mais-detalhes"
          onClick={onToggle}
          className={cx("flex min-h-11 w-full items-center gap-3 rounded-[20px] p-4 text-left text-text", focusRing)}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">Mais detalhes</span>
            <span className="mt-0.5 block text-xs text-muted">{summary}</span>
          </span>
          <ChevronRight
            size={18}
            aria-hidden="true"
            className={cx("shrink-0 text-muted transition-transform motion-reduce:transition-none", open && "rotate-90")}
          />
        </button>
      </h2>
      {open ? (
        <div id="mais-detalhes" className="flex flex-col gap-5 px-4 pt-1 pb-4">
          <TextField
            ref={(element) => registerField("place", element)}
            label="Local"
            autoComplete="off"
            value={details.place}
            onChange={(event) => onChange({ place: event.target.value })}
            onBlur={() => onFieldBlur("place")}
            error={errors.place}
          />
          <PaymentMethodPicker value={details.paymentMethod} onChange={(paymentMethod) => onChange({ paymentMethod })} />
          {showInstallments ? (
            <InstallmentsField
              numberText={details.installmentNumberText}
              totalText={details.installmentTotalText}
              onChange={onChange}
              error={errors.installments}
              registerField={(element) => registerField("installments", element)}
              onBlur={() => onFieldBlur("installments")}
            />
          ) : null}
          <NotesField
            value={details.notes}
            onChange={(notes) => onChange({ notes })}
            error={errors.notes}
            registerField={(element) => registerField("notes", element)}
            onBlur={() => onFieldBlur("notes")}
          />
        </div>
      ) : (
        <div id="mais-detalhes" hidden />
      )}
    </section>
  );
}

interface PaymentMethodPickerProps {
  value: PaymentMethod | null;
  onChange: (value: PaymentMethod | null) => void;
}

/** Optional single-select chips; tapping the selected one clears it. */
function PaymentMethodPicker({ value, onChange }: PaymentMethodPickerProps) {
  return (
    <div>
      <span id="pagamento-rotulo" className="block text-xs font-semibold tracking-[0.06em] text-muted uppercase">
        Forma de pagamento
      </span>
      <div role="group" aria-labelledby="pagamento-rotulo" className="mt-2 flex flex-wrap gap-2">
        {PAYMENT_METHODS.map((method) => {
          const selected = method.value === value;
          return (
            <Chip key={method.value} selected={selected} onClick={() => onChange(selected ? null : method.value)}>
              {method.label}
            </Chip>
          );
        })}
      </div>
    </div>
  );
}

interface InstallmentsFieldProps {
  numberText: string;
  totalText: string;
  onChange: (patch: Partial<DetailValues>) => void;
  /** One message for the pair ("Informe a parcela e o total..."). */
  error?: string;
  registerField: (element: HTMLElement | null) => void;
  onBlur: () => void;
}

/** Parcelas: number and total side by side, sharing one error under the pair. */
function InstallmentsField({ numberText, totalText, onChange, error, registerField, onBlur }: InstallmentsFieldProps) {
  const errorId = "parcelas-erro";
  const describedBy = error ? errorId : undefined;
  const invalid = Boolean(error);
  return (
    <fieldset aria-describedby={describedBy}>
      <legend className="block text-xs font-semibold tracking-[0.06em] text-muted uppercase">Parcelas</legend>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <label htmlFor="parcela-numero" className="block text-xs text-muted">
            Parcela
          </label>
          <input
            ref={registerField}
            id="parcela-numero"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={3}
            value={numberText}
            onChange={(event) => onChange({ installmentNumberText: digitsOnly(event.target.value) })}
            onBlur={onBlur}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={cx("mt-1 h-12", controlClasses(invalid))}
          />
        </div>
        <div className="min-w-0">
          <label htmlFor="parcela-total" className="block text-xs text-muted">
            Total de parcelas
          </label>
          <input
            id="parcela-total"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={3}
            value={totalText}
            onChange={(event) => onChange({ installmentTotalText: digitsOnly(event.target.value) })}
            onBlur={onBlur}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={cx("mt-1 h-12", controlClasses(invalid))}
          />
        </div>
      </div>
      {error ? (
        <p id={errorId} className="mt-2 flex items-start gap-1.5 text-sm text-danger">
          <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </fieldset>
  );
}

interface NotesFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  registerField: (element: HTMLElement | null) => void;
  onBlur: () => void;
}

/** Observações: a textarea with the TextField frame (label, error, ARIA links). */
function NotesField({ value, onChange, error, registerField, onBlur }: NotesFieldProps) {
  const { inputId, hintId, errorId, describedBy } = useFieldIds("observacoes", undefined, error);
  return (
    <FieldFrame inputId={inputId} label="Observações" error={error} hintId={hintId} errorId={errorId}>
      <textarea
        ref={registerField}
        id={inputId}
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx("mt-2 block min-h-24 resize-y py-3", controlClasses(Boolean(error)))}
      />
    </FieldFrame>
  );
}
