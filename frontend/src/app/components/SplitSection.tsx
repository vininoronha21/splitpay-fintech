import { Money } from "./Money.tsx";
import { FriendPicker, firstName, type FriendList } from "./FriendPicker.tsx";
import { Card, cx, Segmented, Switch, TextField, type SegmentedOption } from "./ui/index.ts";
import { splitPreview, type FieldName, type FormErrors, type SplitValues } from "../../lib/transactionForm.ts";
import type { Cents, Friend, SplitMode } from "../../types/api.ts";

const MODE_OPTIONS: SegmentedOption<SplitMode>[] = [
  { value: "equal", label: "Igual" },
  { value: "percentage", label: "Porcentagem" },
  { value: "fixed", label: "Valor fixo" },
];

/** From R$ 100.000,00 the preview amounts are too wide for two cards side by side on a phone. */
const LONG_AMOUNT_CENTS = 10_000_000;

/** Split fields this section can focus when they hold the first error. */
type SplitField = Extract<FieldName, "splitPerson" | "splitPercent" | "splitShare">;

interface SplitSectionProps {
  split: SplitValues;
  onChange: (patch: Partial<SplitValues>) => void;
  /** The valid total in cents, or null while Valor is empty or invalid. */
  totalCents: Cents | null;
  /** Errors to show now (already filtered by touched or submitted). */
  errors: FormErrors;
  friendList: FriendList;
  onFriendCreated: (friend: Friend) => void;
  registerField: (field: SplitField, element: HTMLElement | null) => void;
  onFieldBlur: (field: SplitField) => void;
}

/** Keeps only the digits of a whole percent ("30%" -> "30"). */
function digitsOnly(text: string): string {
  return text.replace(/\D/g, "");
}

/** Keeps what a pt-BR amount can contain, as MoneyField does. */
function moneyChars(text: string): string {
  return text.replace(/[^\d.,]/g, "");
}

/**
 * "Dividir com um amigo" (US01): the switch, the friend picker, the mode, its
 * input and the two preview cards. The preview uses the backend formulas
 * (Business Rule 7), so what the user sees is what gets saved.
 */
export function SplitSection({
  split,
  onChange,
  totalCents,
  errors,
  friendList,
  onFriendCreated,
  registerField,
  onFieldBlur,
}: SplitSectionProps) {
  const preview = split.enabled ? splitPreview(totalCents, split.mode, split) : null;
  const friend =
    friendList.status === "ready" ? friendList.friends.find((item) => item.id === split.personId) : undefined;
  const friendLabel = friend ? `Parte de ${firstName(friend.name)}` : "Parte do amigo";

  return (
    <Card aria-labelledby="dividir-titulo" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="dividir-titulo" className="text-base leading-snug font-semibold">
            Dividir com um amigo
          </h2>
          <p id="dividir-nota" className="mt-0.5 text-xs text-muted">
            A parte dele fica registrada como a receber.
          </p>
        </div>
        <Switch
          checked={split.enabled}
          onChange={(enabled) => onChange({ enabled })}
          aria-labelledby="dividir-titulo"
          aria-describedby="dividir-nota"
          className="-mr-0.5"
        />
      </div>

      {split.enabled ? (
        <>
          <span id="amigo-rotulo" className="sr-only">
            Amigo
          </span>
          <FriendPicker
            list={friendList}
            selectedId={split.personId}
            onSelect={(personId) => onChange({ personId })}
            onCreated={onFriendCreated}
            labelledBy="amigo-rotulo"
            error={errors.splitPerson}
            focusRef={(element) => registerField("splitPerson", element)}
          />

          <div>
            <span id="como-dividir" className="block text-xs font-semibold tracking-[0.06em] text-muted uppercase">
              Como dividir
            </span>
            <Segmented
              label="Como dividir"
              labelledBy="como-dividir"
              options={MODE_OPTIONS}
              value={split.mode}
              onChange={(mode) => onChange({ mode })}
              // "Porcentagem" needs 105 px; equal thirds give 93 px at 360, so the middle column is wider.
              className="mt-2 grid-cols-[minmax(0,4fr)_minmax(0,5fr)_minmax(0,4fr)]"
            />
          </div>

          {split.mode === "percentage" ? (
            <TextField
              ref={(element) => registerField("splitPercent", element)}
              label="Porcentagem do amigo"
              inputMode="numeric"
              autoComplete="off"
              placeholder="0 a 100"
              maxLength={3}
              value={split.percentText}
              onChange={(event) => onChange({ percentText: digitsOnly(event.target.value) })}
              onBlur={() => onFieldBlur("splitPercent")}
              error={errors.splitPercent}
            />
          ) : null}
          {split.mode === "fixed" ? (
            <TextField
              ref={(element) => registerField("splitShare", element)}
              label="Valor do amigo"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0,00"
              value={split.shareText}
              onChange={(event) => onChange({ shareText: moneyChars(event.target.value) })}
              onBlur={() => onFieldBlur("splitShare")}
              error={errors.splitShare}
            />
          ) : null}

          {/* Side by side up to R$ 99.999,99; bigger amounts stack so they never truncate at 360 px. */}
          <div className={cx("grid gap-2", (totalCents ?? 0) < LONG_AMOUNT_CENTS ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2")}>
            <ShareCard label={friendLabel} cents={preview?.friendCents ?? null} tone="friend" />
            <ShareCard label="Sua parte" cents={preview?.userCents ?? null} tone="user" />
          </div>
          <p className="text-xs leading-normal text-muted">
            O valor total sai do seu saldo agora. No orçamento do mês entra apenas a sua parte.
          </p>
        </>
      ) : null}
    </Card>
  );
}

interface ShareCardProps {
  label: string;
  /** null while the total or the mode's input is not valid yet. */
  cents: Cents | null;
  tone: "friend" | "user";
}

function ShareCard({ label, cents, tone }: ShareCardProps) {
  const friend = tone === "friend";
  return (
    <div className={cx("min-w-0 rounded-[14px] p-3", friend ? "bg-accent-soft text-accent-soft-text" : "bg-neutral-soft")}>
      <p className={cx("truncate text-xs", friend ? "text-accent-soft-text" : "text-muted")}>{label}</p>
      {/* Until the inputs are valid the card shows R$ 0,00 in muted, so its height never jumps. */}
      <p className="mt-1 overflow-hidden text-lg leading-snug font-bold text-ellipsis">
        <Money cents={cents ?? 0} className={cents === null ? "text-muted" : undefined} />
      </p>
    </div>
  );
}
