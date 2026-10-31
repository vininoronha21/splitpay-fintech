import { useId, useRef, useState, type FormEvent } from "react";
import { Plus, Users } from "lucide-react";
import { FormFeedback } from "./FormFeedback.tsx";
import { Money } from "./Money.tsx";
import { ScreenTitle } from "./ScreenTitle.tsx";
import { Avatar, Card, cx, EmptyState, ErrorState, focusRing, Skeleton } from "./ui/index.ts";
import { FieldFrame, useFieldIds } from "./ui/TextField.tsx";
import { openByPerson, validateFriendName } from "../../lib/settings.ts";
import { trimInvisible } from "../../lib/text.ts";
import { useResource } from "../../lib/useResource.ts";
import { ApiError, createFriend, getReimbursementSummary, listFriends } from "../../services/api.ts";
import type { Cents, Friend } from "../../types/api.ts";

const GENERIC_ERROR_MESSAGE = "Algo deu errado. Tente novamente.";
const SKELETON_ROWS = 5;

/**
 * Amigos (US01, Business Rule 11): add a friend and see what each one still
 * owes. The list keeps the API order (accent-aware by name) and reloads after
 * an add instead of sorting here (spec Decisions).
 */
export function FriendsScreen() {
  const friends = useResource((signal) => listFriends(signal), []);
  const summary = useResource((signal) => getReimbursementSummary(signal), []);

  function reload() {
    friends.retry();
    summary.retry();
  }

  // The list needs both requests; the error card retries only the failed ones.
  const loadError =
    friends.status === "error" ? friends.error.message : summary.status === "error" ? summary.error.message : null;
  function retryFailed() {
    if (friends.status === "error") friends.retry();
    if (summary.status === "error") summary.retry();
  }

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-3 md:gap-4">
      <div>
        <ScreenTitle>Amigos</ScreenTitle>
        <p className="mt-1 text-sm text-muted">Pessoas com quem você divide despesas</p>
      </div>

      <AddFriendCard onAdded={reload} />

      {friends.status === "ready" && summary.status === "ready" ? (
        <FriendList friends={friends.data} openCents={openByPerson(summary.data)} />
      ) : loadError !== null ? (
        <ErrorState title="Não foi possível carregar os amigos" message={loadError} onRetry={retryFailed} />
      ) : (
        <ListSkeleton />
      )}

      <p className="text-xs leading-relaxed text-muted">Não é possível cadastrar dois amigos com o mesmo nome.</p>
    </div>
  );
}

function AddFriendCard({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  /** The API rejected the name itself (409 friend_exists or a 422): the field points at the message. */
  const [nameRejected, setNameRejected] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const savingRef = useRef(false);
  const feedbackErrorId = useId();
  const input = useRef<HTMLInputElement>(null);

  const error = submitted ? validateFriendName(name) : undefined;
  const { inputId, hintId, errorId, describedBy } = useFieldIds(undefined, undefined, error);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    setSubmitted(true);
    setSuccess(null);
    if (validateFriendName(name) !== undefined) {
      input.current?.focus();
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setApiError(null);
    try {
      const friend = await createFriend({ name: trimInvisible(name) });
      setName("");
      setSubmitted(false);
      setSuccess(`Amigo adicionado: ${friend.name}.`);
      onAdded();
    } catch (caught) {
      setApiError(caught instanceof ApiError ? caught.message : GENERIC_ERROR_MESSAGE);
      setNameRejected(caught instanceof ApiError && (caught.code === "friend_exists" || caught.code === "validation_error"));
      input.current?.focus();
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <Card className="md:p-6">
      <form noValidate onSubmit={(event) => void handleSubmit(event)}>
        <FieldFrame inputId={inputId} label="Nome do amigo" error={error} hintId={hintId} errorId={errorId}>
          <div className="mt-2 flex gap-2">
            <input
              ref={input}
              id={inputId}
              type="text"
              autoComplete="off"
              enterKeyHint="done"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setApiError(null);
                setNameRejected(false);
                setSuccess(null);
              }}
              aria-invalid={error || (apiError && nameRejected) ? true : undefined}
              aria-describedby={
                [describedBy, apiError && nameRejected ? feedbackErrorId : null].filter(Boolean).join(" ") || undefined
              }
              className={cx(
                "h-12 w-full min-w-0 flex-1 rounded-xl border bg-surface px-4 text-base text-text placeholder:text-muted",
                "transition-colors motion-reduce:transition-none",
                error ? "border-danger" : "border-field-border focus:border-accent",
                focusRing,
              )}
            />
            <button
              type="submit"
              aria-label="Adicionar amigo"
              aria-disabled={saving ? true : undefined}
              className={cx(
                "grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-on-accent transition",
                "shadow-[0_3px_13px_rgba(251,191,36,.18)] hover:bg-accent-strong active:scale-[.98]",
                "aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:focus-visible:opacity-100 motion-reduce:transition-none motion-reduce:active:scale-100",
                focusRing,
              )}
            >
              <Plus size={22} aria-hidden="true" />
            </button>
          </div>
        </FieldFrame>
        <FormFeedback success={success} error={apiError} errorId={feedbackErrorId} />
      </form>
    </Card>
  );
}

function ListSkeleton() {
  return (
    <Card aria-busy="true" aria-label="Carregando amigos" className="py-1 md:px-6">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <div key={index} className="flex items-center gap-3 border-b border-border py-3 last:border-b-0">
          <Skeleton className="size-10 rounded-full!" />
          <Skeleton className="h-4 w-36 max-w-full" />
          <Skeleton className="ml-auto h-4 w-20" />
        </div>
      ))}
    </Card>
  );
}

interface FriendListProps {
  friends: Friend[];
  /** Open cents per friend id; absent means nothing to receive. */
  openCents: Map<number, Cents>;
}

function FriendList({ friends, openCents }: FriendListProps) {
  if (friends.length === 0) {
    return (
      <Card className="md:p-6">
        <EmptyState icon={Users} title="Nenhum amigo ainda" />
      </Card>
    );
  }
  return (
    <Card padded={false} className="px-4 py-1 md:px-6">
      <ul aria-label="Amigos">
        {friends.map((friend) => {
          const open = openCents.get(friend.id);
          return (
            <li key={friend.id} className="flex min-h-16 items-center gap-3 border-b border-border py-3 last:border-b-0">
              <Avatar name={friend.name} tone="accent" />
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium" title={friend.name}>
                {friend.name}
              </span>
              {open !== undefined ? (
                <span className="shrink-0 text-right leading-tight">
                  <Money cents={open} className="block text-[15px] font-bold text-accent-text" />
                  <span className="text-xs text-muted">a receber</span>
                </span>
              ) : (
                <span className="shrink-0 text-sm text-muted">Sem pendências</span>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
