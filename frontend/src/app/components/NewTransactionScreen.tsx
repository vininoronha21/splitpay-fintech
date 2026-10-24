import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { CategoryPicker, SuggestionLine, useCategorySuggestion } from "./CategoryPicker.tsx";
import type { FriendList } from "./FriendPicker.tsx";
import { DETAIL_FIELDS, MoreDetails } from "./MoreDetails.tsx";
import type { SavedState } from "./SaveConfirmation.tsx";
import { ScreenTitle } from "./ScreenPlaceholder.tsx";
import { SplitSection } from "./SplitSection.tsx";
import { Button, Card, cx, focusRing, MoneyField, Segmented, TextField, type SegmentedOption } from "./ui/index.ts";
import { brasiliaToday } from "../../lib/dates.ts";
import {
  FIELD_ORDER,
  initialValues,
  MIN_DATE,
  parseAmount,
  toPayload,
  validate,
  type DetailValues,
  type FieldName,
  type FormErrors,
  type FormValues,
  type SplitValues,
} from "../../lib/transactionForm.ts";
import { useResource } from "../../lib/useResource.ts";
import { ApiError, createTransaction, listCategories, listFriends } from "../../services/api.ts";
import type { Friend, TransactionType } from "../../types/api.ts";

const TYPE_OPTIONS: SegmentedOption<TransactionType>[] = [
  { value: "expense", label: "Gasto" },
  { value: "income", label: "Receita" },
];

const GENERIC_ERROR_MESSAGE = "Algo deu errado. Tente novamente.";

/** `/novo-gasto?tipo=receita` opens on Receita; any other value on Gasto. */
function typeFromParam(tipo: string | null): TransactionType {
  return tipo === "receita" ? "income" : "expense";
}

/**
 * /novo-gasto. Keyed by the `tipo` it opens with, so following the Receita
 * shortcut (or "Novo gasto" from Receita) starts a fresh form.
 */
export function NewTransactionScreen() {
  const [params] = useSearchParams();
  const type = typeFromParam(params.get("tipo"));
  return <NewTransactionForm key={type} initialType={type} />;
}

/** Friends load the first time the split switch turns on; friends added inline join the list. */
function useFriendList(requested: boolean): [FriendList, (friend: Friend) => void] {
  const friends = useResource<Friend[] | null>(
    (signal) => (requested ? listFriends(signal) : Promise.resolve(null)),
    [requested],
  );
  const [added, setAdded] = useState<Friend[]>([]);
  const addFriend = useCallback((friend: Friend) => setAdded((list) => [...list, friend]), []);

  let list: FriendList;
  if (friends.status === "error") {
    // Friends added inline while the list failed are still drawn, selected and focusable.
    list = { status: "error", message: friends.error.message, retry: friends.retry, friends: added };
  } else if (friends.status === "loading" || friends.data === null) {
    list = { status: "loading" };
  } else {
    // A retry after adding someone returns them from the API too: keep one entry per id.
    const loadedIds = new Set(friends.data.map((friend) => friend.id));
    list = { status: "ready", friends: [...friends.data, ...added.filter((friend) => !loadedIds.has(friend.id))] };
  }
  return [list, addFriend];
}

/** Keeps the height of the fixed save bar, so the end of the form can leave room for it. */
function useElementHeight<T extends HTMLElement>(): [RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setHeight(element.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, height];
}

interface NewTransactionFormProps {
  initialType: TransactionType;
}

/**
 * Novo gasto / Nova receita (US01, US02, US05). One state object; the rules,
 * the split preview and the payload come from lib/transactionForm.ts. Errors
 * show under a field once it was left or after a save attempt.
 */
function NewTransactionForm({ initialType }: NewTransactionFormProps) {
  const navigate = useNavigate();
  // Read on every render, so the date limit and the future-date check follow the clock.
  const today = brasiliaToday(new Date());
  const [values, setValues] = useState<FormValues>(() => initialValues(initialType, today));
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [pendingFocus, setPendingFocus] = useState<FieldName | null>(null);
  const [friendsRequested, setFriendsRequested] = useState(false);

  const savingRef = useRef(false);
  const categoryPickedByUser = useRef(false);
  const fields = useRef<Partial<Record<FieldName, HTMLElement | null>>>({});
  const [saveBar, saveBarHeight] = useElementHeight<HTMLDivElement>();

  // The theme.css scroll-padding rule reads this, so focus clears the bar even when the error banner grows it.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--save-bar-height", `${saveBarHeight}px`);
    return () => {
      root.style.removeProperty("--save-bar-height");
    };
  }, [saveBarHeight]);

  const isExpense = values.type === "expense";
  const categories = useResource((signal) => listCategories(signal), []);
  const suggestion = useCategorySuggestion(values.description, isExpense);
  const [friendList, addFriend] = useFriendList(friendsRequested);

  // A suggestion selects its chip until the user picks a category by hand (US02).
  useEffect(() => {
    if (categoryPickedByUser.current) return;
    setValues((current) => ({ ...current, categoryId: suggestion?.id ?? null }));
  }, [suggestion]);

  // Focus moves after the render that opened "Mais detalhes", so its fields exist.
  useEffect(() => {
    if (pendingFocus === null) return;
    const element = fields.current[pendingFocus];
    if (element) {
      element.focus({ preventScroll: true });
      // Centered, so the fixed save bar never covers the field.
      element.scrollIntoView({ block: "center" });
    }
    setPendingFocus(null);
  }, [pendingFocus]);

  const allErrors = validate(values, today);
  const shownErrors: FormErrors = {};
  for (const field of FIELD_ORDER) {
    const message = allErrors[field];
    if (message && (submitted || touched[field])) shownErrors[field] = message;
  }

  const registerField = useCallback((field: FieldName, element: HTMLElement | null) => {
    fields.current[field] = element;
  }, []);
  const touch = useCallback((field: FieldName) => setTouched((current) => ({ ...current, [field]: true })), []);

  function update(patch: Partial<FormValues>) {
    setValues((current) => ({ ...current, ...patch }));
    setApiError(null);
  }
  function updateSplit(patch: Partial<SplitValues>) {
    if (patch.enabled) setFriendsRequested(true);
    setValues((current) => ({ ...current, split: { ...current.split, ...patch } }));
    setApiError(null);
  }
  function updateDetails(patch: Partial<DetailValues>) {
    setValues((current) => ({ ...current, details: { ...current.details, ...patch } }));
    setApiError(null);
  }
  function handleFriendCreated(friend: Friend) {
    addFriend(friend);
    updateSplit({ personId: friend.id });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    setSubmitted(true);
    const errors = validate(values, brasiliaToday(new Date()));
    const firstInvalid = FIELD_ORDER.find((field) => errors[field] !== undefined);
    if (firstInvalid !== undefined) {
      if (FIELD_ORDER.some((field) => DETAIL_FIELDS.has(field) && errors[field] !== undefined)) {
        setDetailsOpen(true);
      }
      setPendingFocus(firstInvalid);
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setApiError(null);
    try {
      await createTransaction(toPayload(values));
      const state: SavedState = { saved: values.type };
      navigate("/inicio", { replace: true, state });
    } catch (caught) {
      savingRef.current = false;
      setSaving(false);
      setApiError(caught instanceof ApiError ? caught.message : GENERIC_ERROR_MESSAGE);
    }
  }

  const title = isExpense ? "Novo gasto" : "Nova receita";
  const saveLabel = isExpense ? "Salvar gasto" : "Salvar receita";

  return (
    <div className="mx-auto w-full max-w-[560px]">
      <div className="flex items-center gap-3">
        <Link
          to="/inicio"
          aria-label="Voltar para o Início"
          className={cx(
            "grid size-11 shrink-0 place-items-center rounded-full border border-border bg-surface text-text hover:bg-neutral-soft",
            focusRing,
          )}
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>
        <ScreenTitle>{title}</ScreenTitle>
      </div>

      <form noValidate onSubmit={(event) => void handleSubmit(event)} className="mt-4 flex flex-col gap-3 md:gap-4">
        <Segmented
          label="Tipo de lançamento"
          options={TYPE_OPTIONS}
          value={values.type}
          onChange={(type) => update({ type })}
        />

        <Card className="flex flex-col gap-5">
          <MoneyField
            ref={(element) => registerField("amount", element)}
            label="Valor"
            value={values.amountText}
            onChange={(amountText) => update({ amountText })}
            onBlur={() => touch("amount")}
            error={shownErrors.amount}
          />
          <div>
            <TextField
              ref={(element) => registerField("description", element)}
              label="Descrição"
              autoComplete="off"
              value={values.description}
              onChange={(event) => update({ description: event.target.value })}
              onBlur={() => touch("description")}
              error={shownErrors.description}
              aria-describedby={
                [shownErrors.description ? "descricao-error" : null, isExpense ? "sugestao" : null]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
              id="descricao"
            />
            {isExpense ? <SuggestionLine id="sugestao" suggestion={suggestion} /> : null}
          </div>
          {isExpense ? (
            <CategoryPicker
              categories={categories}
              value={values.categoryId}
              onChange={(categoryId) => {
                categoryPickedByUser.current = true;
                update({ categoryId });
              }}
            />
          ) : null}
          <TextField
            ref={(element) => registerField("occurredOn", element)}
            label="Data"
            type="date"
            min={MIN_DATE}
            max={today}
            value={values.occurredOn}
            onChange={(event) => {
              update({ occurredOn: event.target.value });
              touch("occurredOn");
            }}
            onBlur={() => touch("occurredOn")}
            error={shownErrors.occurredOn}
          />
        </Card>

        {isExpense ? (
          <SplitSection
            split={values.split}
            onChange={updateSplit}
            totalCents={parseAmount(values.amountText)}
            errors={shownErrors}
            friendList={friendList}
            onFriendCreated={handleFriendCreated}
            registerField={registerField}
            onFieldBlur={touch}
          />
        ) : null}

        <MoreDetails
          open={detailsOpen}
          onToggle={() => setDetailsOpen((open) => !open)}
          details={values.details}
          onChange={updateDetails}
          showInstallments={isExpense}
          errors={shownErrors}
          registerField={registerField}
          onFieldBlur={touch}
        />

        {/* Room for the fixed save bar below md, so the last field is never under it. */}
        <div aria-hidden="true" className="md:hidden" style={{ height: saveBarHeight }} />

        <div
          ref={saveBar}
          data-save-bar=""
          className={cx(
            "fixed inset-x-0 bottom-[calc(61px+env(safe-area-inset-bottom))] z-30 border-t border-border bg-nav px-4 py-3",
            "md:static md:z-auto md:mt-2 md:border-0 md:bg-transparent md:p-0",
          )}
        >
          {apiError ? (
            <p
              role="alert"
              className="mb-3 flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-sm font-medium text-danger"
            >
              <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0">{apiError}</span>
            </p>
          ) : null}
          <Button type="submit" fullWidth disabled={saving}>
            {saving ? "Salvando..." : saveLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
