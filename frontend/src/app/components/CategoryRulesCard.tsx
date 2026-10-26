import { useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { CardHeader } from "./CardHeader.tsx";
import { FormFeedback } from "./FormFeedback.tsx";
import { Button, Card, cx, ErrorState, focusRing, Skeleton, TextField } from "./ui/index.ts";
import { FieldFrame, useFieldIds } from "./ui/TextField.tsx";
import {
  RULE_FIELD_ORDER,
  splitRules,
  toRulePayload,
  validateRule,
  type RuleField,
  type RuleValues,
} from "../../lib/settings.ts";
import { useResource } from "../../lib/useResource.ts";
import { ApiError, createCategoryRule, deleteCategoryRule, listCategories, listCategoryRules } from "../../services/api.ts";
import type { Category, CategoryRule } from "../../types/api.ts";

const GENERIC_ERROR_MESSAGE = "Algo deu errado. Tente novamente.";
const EMPTY_VALUES: RuleValues = { keyword: "", categoryId: null };

interface RulesData {
  rules: CategoryRule[];
  categories: Category[];
}

/** The rules and the categories for the select, as one load: the card needs both. */
async function loadRules(signal: AbortSignal): Promise<RulesData> {
  const [rules, categories] = await Promise.all([listCategoryRules(signal), listCategories(signal)]);
  return { rules, categories };
}

/**
 * "Regras de categoria" (US02, Business Rule 8): the user's rules with a
 * delete button, the default rules behind a toggle and a form to add one.
 */
export function CategoryRulesCard() {
  const data = useResource((signal) => loadRules(signal), []);

  if (data.status === "error") {
    return <ErrorState title="Não foi possível carregar as regras" message={data.error.message} onRetry={data.retry} />;
  }
  if (data.status === "loading") {
    return <RulesSkeleton />;
  }
  return <RulesContent rules={data.data.rules} categories={data.data.categories} />;
}

function RulesSkeleton() {
  return (
    <Card aria-busy="true" aria-label="Carregando regras de categoria" className="md:p-6">
      <Skeleton className="h-5 w-44" />
      <Skeleton className="mt-1.5 h-4 w-full max-w-80" />
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-b-0">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
      <Skeleton className="mt-3 h-12 w-full" />
      <Skeleton className="mt-3 h-12 w-full" />
    </Card>
  );
}

interface RulesContentProps {
  rules: CategoryRule[];
  categories: Category[];
}

function RulesContent({ rules, categories }: RulesContentProps) {
  const titleId = useId();
  const defaultsId = useId();
  const split = useMemo(() => splitRules(rules), [rules]);
  // Added rules go on top and deleted ones leave after the API answers; the defaults never change.
  const [userRules, setUserRules] = useState<CategoryRule[]>(split.userRules);
  const [showDefaults, setShowDefaults] = useState(false);

  const [values, setValues] = useState<RuleValues>(EMPTY_VALUES);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const busyRef = useRef(false);

  const fields = useRef<Partial<Record<RuleField, HTMLElement | null>>>({});
  const deleteButtons = useRef<Map<number, HTMLButtonElement>>(new Map());

  const errors = submitted ? validateRule(values) : {};

  function update(patch: Partial<RuleValues>) {
    setValues((current) => ({ ...current, ...patch }));
    setApiError(null);
    setSuccess(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current) return;
    setSubmitted(true);
    setSuccess(null);
    const found = validateRule(values);
    const firstInvalid = RULE_FIELD_ORDER.find((field) => found[field] !== undefined);
    if (firstInvalid !== undefined) {
      fields.current[firstInvalid]?.focus();
      return;
    }

    busyRef.current = true;
    setSaving(true);
    setApiError(null);
    try {
      const rule = await createCategoryRule(toRulePayload(values));
      setUserRules((current) => [rule, ...current.filter((item) => item.id !== rule.id)]);
      setValues(EMPTY_VALUES);
      setSubmitted(false);
      setSuccess("Regra criada.");
    } catch (caught) {
      setApiError(caught instanceof ApiError ? caught.message : GENERIC_ERROR_MESSAGE);
    } finally {
      busyRef.current = false;
      setSaving(false);
    }
  }

  async function handleDelete(rule: CategoryRule) {
    if (busyRef.current) return;
    busyRef.current = true;
    setDeletingId(rule.id);
    setApiError(null);
    setSuccess(null);
    try {
      await deleteCategoryRule(rule.id);
      // The removed button had focus: move it to the next rule's button, the previous one, or the keyword field.
      const index = userRules.findIndex((item) => item.id === rule.id);
      const neighbor = userRules[index + 1] ?? userRules[index - 1];
      setUserRules((current) => current.filter((item) => item.id !== rule.id));
      setSuccess("Regra excluída.");
      const target = neighbor ? deleteButtons.current.get(neighbor.id) : fields.current.keyword;
      target?.focus();
    } catch (caught) {
      setApiError(caught instanceof ApiError ? caught.message : GENERIC_ERROR_MESSAGE);
    } finally {
      busyRef.current = false;
      setDeletingId(null);
    }
  }

  return (
    <Card aria-labelledby={titleId} className="md:p-6">
      <CardHeader
        title="Regras de categoria"
        titleId={titleId}
        note={`Palavras da descrição que definem a categoria sugerida. Existem ${split.defaultRules.length} regras padrão.`}
      />

      {userRules.length > 0 ? (
        <ul aria-label="Suas regras" className="mt-2">
          {userRules.map((rule) => (
            <li key={rule.id} className="flex min-w-0 items-center gap-2 border-b border-border py-0.5">
              <span className="min-w-0 flex-1 truncate text-sm font-medium" title={rule.keyword}>
                {rule.keyword}
              </span>
              <span className="shrink-0 rounded-full bg-accent-soft px-2 py-[3px] text-xs leading-tight font-semibold text-accent-soft-text">
                Sua regra
              </span>
              <span className="max-w-[35%] shrink-0 truncate text-sm text-muted">{rule.category_name}</span>
              <button
                ref={(element) => {
                  if (element) deleteButtons.current.set(rule.id, element);
                  else deleteButtons.current.delete(rule.id);
                }}
                type="button"
                aria-label={`Excluir regra ${rule.keyword}`}
                aria-disabled={deletingId === rule.id ? true : undefined}
                onClick={() => void handleDelete(rule)}
                className={cx(
                  "-mr-2 grid size-11 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:text-danger",
                  // aria-disabled, not disabled: a disabled button would drop focus while the request runs.
                  "aria-disabled:cursor-not-allowed aria-disabled:opacity-50 motion-reduce:transition-none",
                  focusRing,
                )}
              >
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        aria-expanded={showDefaults}
        aria-controls={defaultsId}
        onClick={() => setShowDefaults((open) => !open)}
        className={cx(
          "mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-xl text-sm font-semibold text-accent-text hover:underline",
          focusRing,
        )}
      >
        {showDefaults ? "Ocultar regras padrão" : `Ver regras padrão (${split.defaultRules.length})`}
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={cx("transition-transform motion-reduce:transition-none", showDefaults && "rotate-180")}
        />
      </button>
      <ul id={defaultsId} aria-label="Regras padrão" hidden={!showDefaults}>
        {split.defaultRules.map((rule) => (
          <li key={rule.id} className="flex min-w-0 items-center gap-3 border-b border-border py-2.5 last:border-b-0">
            <span className="min-w-0 flex-1 truncate text-sm" title={rule.keyword}>
              {rule.keyword}
            </span>
            <span className="max-w-[45%] shrink-0 truncate text-sm text-muted">{rule.category_name}</span>
          </li>
        ))}
      </ul>

      <form noValidate onSubmit={(event) => void handleSubmit(event)} className="mt-3 border-t border-border pt-4">
        <TextField
          ref={(element) => {
            fields.current.keyword = element;
          }}
          label="Palavra-chave"
          autoComplete="off"
          value={values.keyword}
          onChange={(event) => update({ keyword: event.target.value })}
          error={errors.keyword}
        />
        <CategorySelect
          selectRef={(element) => {
            fields.current.category = element;
          }}
          className="mt-4"
          categories={categories}
          value={values.categoryId}
          onChange={(categoryId) => update({ categoryId })}
          error={errors.category}
          action={
            <Button type="submit" variant="ghost" disabled={saving} className="shrink-0 px-4">
              {saving ? "Adicionando..." : "Adicionar"}
            </Button>
          }
        />
        <FormFeedback success={success} error={apiError} />
      </form>
    </Card>
  );
}

interface CategorySelectProps {
  /** Receives the select, so a failed submit can focus it. */
  selectRef: (element: HTMLSelectElement | null) => void;
  categories: Category[];
  value: number | null;
  onChange: (categoryId: number | null) => void;
  error?: string;
  /** The submit button, beside the select in one row; the error line then spans both. */
  action?: ReactNode;
  className?: string;
}

/** Native select (spec Decisions): eight options, accessible on every phone without custom keyboard code. */
function CategorySelect({ selectRef, categories, value, onChange, error, action, className }: CategorySelectProps) {
  const { inputId, hintId, errorId, describedBy } = useFieldIds(undefined, undefined, error);
  return (
    <FieldFrame inputId={inputId} label="Categoria" error={error} hintId={hintId} errorId={errorId} className={className}>
      <div className="mt-2 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <select
            ref={selectRef}
            id={inputId}
            value={value === null ? "" : String(value)}
            onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cx(
              "h-12 w-full min-w-0 appearance-none truncate rounded-xl border bg-surface pr-10 pl-4 text-base text-text",
              "transition-colors motion-reduce:transition-none",
              error ? "border-danger" : "border-border focus:border-accent",
              focusRing,
            )}
          >
            <option value="">Selecione</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
          />
        </div>
        {action}
      </div>
    </FieldFrame>
  );
}
