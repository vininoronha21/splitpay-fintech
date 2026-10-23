import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { CircleAlert, Plus, RotateCw } from "lucide-react";
import { Button, cx, focusRing, initials, Skeleton, TextField } from "./ui/index.ts";
import { trimInvisible } from "../../lib/text.ts";
import { ApiError, createFriend } from "../../services/api.ts";
import type { Friend } from "../../types/api.ts";

/** Same limit as the API's FriendCreate.name, counted in code points like Python `len`. */
const FRIEND_NAME_MAX = 60;

/** The friends shown in the picker: loading, failed, or the list (API order plus friends added here). */
export type FriendList =
  | { status: "loading" }
  | { status: "error"; message: string; retry: () => void }
  | { status: "ready"; friends: Friend[] };

/** "Ana Lima" -> "Ana". */
export function firstName(name: string): string {
  return trimInvisible(name).split(/\s+/u)[0] ?? "";
}

function friendNameError(name: string): string | undefined {
  const trimmed = trimInvisible(name);
  if (trimmed === "") return "Informe o nome do amigo.";
  if (Array.from(trimmed).length > FRIEND_NAME_MAX) return `Use até ${FRIEND_NAME_MAX} caracteres.`;
  return undefined;
}

interface FriendPickerProps {
  list: FriendList;
  selectedId: number | null;
  onSelect: (friendId: number) => void;
  /** A friend saved through "Novo": the parent adds it to the list and selects it. */
  onCreated: (friend: Friend) => void;
  /** Id of the visible label that names the group. */
  labelledBy: string;
  /** "Escolha um amigo." when the split has no friend. */
  error?: string;
  /** Receives the element to focus when the split has no friend. */
  focusRef: (element: HTMLElement | null) => void;
}

const NEXT_KEYS = new Set(["ArrowRight", "ArrowDown"]);
const PREVIOUS_KEYS = new Set(["ArrowLeft", "ArrowUp"]);

/**
 * Horizontal friend picker (US01): a radio group of avatars with first names,
 * one tab stop and arrow keys, then a "Novo" button that opens an inline name
 * field (Business Rule 11). Scrolls sideways inside itself, never the page.
 */
export function FriendPicker({ list, selectedId, onSelect, onCreated, labelledBy, error, focusRef }: FriendPickerProps) {
  const radios = useRef<Map<number, HTMLButtonElement>>(new Map());
  const newButton = useRef<HTMLButtonElement | null>(null);
  const [adding, setAdding] = useState(false);
  /** Set after a friend is created, so its avatar gets focus once it renders. */
  const [focusFriendId, setFocusFriendId] = useState<number | null>(null);
  const errorId = `${labelledBy}-erro`;

  const friends = list.status === "ready" ? list.friends : [];
  const tabStopId = friends.some((friend) => friend.id === selectedId) ? selectedId : (friends[0]?.id ?? null);

  useEffect(() => {
    if (focusFriendId === null) return;
    const radio = radios.current.get(focusFriendId);
    if (radio) {
      radio.focus({ preventScroll: true });
      radio.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
    setFocusFriendId(null);
  }, [focusFriendId, friends]);

  // The element focused when "Escolha um amigo." is the first error: the tab stop, or "Novo" with no friends.
  useEffect(() => {
    focusRef(tabStopId !== null ? (radios.current.get(tabStopId) ?? null) : newButton.current);
  });

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = friends.length - 1;
    let target: number | null = null;
    if (NEXT_KEYS.has(event.key)) target = index === last ? 0 : index + 1;
    else if (PREVIOUS_KEYS.has(event.key)) target = index === 0 ? last : index - 1;
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = last;
    const friend = target === null ? undefined : friends[target];
    if (!friend) return;
    event.preventDefault();
    onSelect(friend.id);
    radios.current.get(friend.id)?.focus();
  }

  function handleCreated(friend: Friend) {
    setAdding(false);
    onCreated(friend);
    setFocusFriendId(friend.id);
  }

  return (
    <div>
      {/* 4 px padding keeps the selection ring and focus outline inside the scroll box. */}
      <div className="-mx-1 flex min-w-0 gap-3 overflow-x-auto px-1 py-1">
        {list.status === "loading" ? (
          <div aria-busy="true" aria-labelledby={labelledBy} className="flex gap-3">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="flex w-15 flex-col items-center gap-1.5">
                <Skeleton className="size-13 rounded-full!" />
                <Skeleton className="h-3.5 w-11" />
              </div>
            ))}
          </div>
        ) : friends.length > 0 ? (
          <div
            role="radiogroup"
            aria-labelledby={labelledBy}
            aria-describedby={error ? errorId : undefined}
            aria-invalid={error ? true : undefined}
            className="flex gap-3"
          >
            {friends.map((friend, index) => {
              const checked = friend.id === selectedId;
              return (
                <button
                  key={friend.id}
                  ref={(element) => {
                    if (element) radios.current.set(friend.id, element);
                    else radios.current.delete(friend.id);
                  }}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  aria-label={friend.name}
                  tabIndex={friend.id === tabStopId ? 0 : -1}
                  onClick={() => onSelect(friend.id)}
                  onKeyDown={(event) => handleKeyDown(event, index)}
                  className={cx(
                    "flex w-15 shrink-0 flex-col items-center gap-1.5 rounded-xl pb-0.5 text-xs",
                    checked ? "font-semibold text-text" : "font-medium text-muted hover:text-text",
                    focusRing,
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cx(
                      "grid size-13 place-items-center rounded-full bg-accent-soft text-sm font-bold text-accent-soft-text select-none",
                      checked && "ring-2 ring-accent ring-offset-2 ring-offset-surface",
                    )}
                  >
                    {initials(friend.name)}
                  </span>
                  <span aria-hidden="true" className="max-w-full truncate">
                    {firstName(friend.name)}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
        <button
          ref={newButton}
          type="button"
          aria-expanded={adding}
          onClick={() => setAdding((open) => !open)}
          className={cx(
            "flex w-15 shrink-0 flex-col items-center gap-1.5 rounded-xl pb-0.5 text-xs font-medium text-muted hover:text-text",
            focusRing,
          )}
        >
          <span className="grid size-13 place-items-center rounded-full border border-dashed border-muted" aria-hidden="true">
            <Plus size={20} />
          </span>
          Novo
        </button>
      </div>

      {list.status === "error" ? (
        <div role="alert" className="mt-2 flex flex-col items-start gap-2">
          <p className="flex items-start gap-1.5 text-sm text-danger">
            <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{list.message}</span>
          </p>
          <Button variant="ghost" size="sm" icon={RotateCw} onClick={list.retry}>
            Tentar novamente
          </Button>
        </div>
      ) : list.status === "ready" && friends.length === 0 && !adding ? (
        <p className="mt-1 text-xs text-muted">Nenhum amigo ainda. Toque em Novo para adicionar.</p>
      ) : null}

      {error ? (
        <p id={errorId} className="mt-2 flex items-start gap-1.5 text-sm text-danger">
          <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}

      {adding ? (
        <NewFriendForm
          onCancel={() => {
            setAdding(false);
            newButton.current?.focus();
          }}
          onCreated={handleCreated}
        />
      ) : null}
    </div>
  );
}

interface NewFriendFormProps {
  onCancel: () => void;
  onCreated: (friend: Friend) => void;
}

/**
 * Inline "Novo amigo" field. Not a nested <form> (invalid HTML inside the
 * transaction form): Enter saves and Escape cancels by hand.
 */
function NewFriendForm({ onCancel, onCreated }: NewFriendFormProps) {
  const [name, setName] = useState("");
  const [showError, setShowError] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const input = useRef<HTMLInputElement | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    input.current?.focus();
    return () => {
      mounted.current = false;
    };
  }, []);

  const validationError = friendNameError(name);
  const error = (showError ? validationError : undefined) ?? apiError ?? undefined;

  async function save() {
    if (savingRef.current) return;
    setShowError(true);
    setApiError(null);
    if (validationError) {
      input.current?.focus();
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const friend = await createFriend({ name: trimInvisible(name) });
      if (mounted.current) onCreated(friend);
    } catch (caught) {
      if (!mounted.current) return;
      setApiError(caught instanceof ApiError ? caught.message : "Algo deu errado. Tente novamente.");
      input.current?.focus();
    } finally {
      savingRef.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      // Keeps Enter from submitting the transaction form around this field.
      event.preventDefault();
      void save();
    } else if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-border p-3">
      <TextField
        ref={input}
        label="Nome do amigo"
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          setApiError(null);
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        enterKeyHint="done"
        error={error}
      />
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={() => void save()} disabled={saving} className="flex-1">
          {saving ? "Adicionando..." : "Adicionar"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving} className="flex-1">
          Cancelar
        </Button>
      </div>
    </div>
  );
}
