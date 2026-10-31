import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { DonutChart } from "../components/DonutChart.tsx";
import { Avatar, cx, StatusPill } from "../components/ui/index.ts";
import { categoryColor, formatPercent, sharePercents } from "../../lib/charts.ts";
import { formatBRL } from "../../lib/money.ts";
import { Amount, ScreenCard, ScreenFrame, ScreenLabel } from "./LandingParts.tsx";

/*
 * App screens drawn in markup for the feature tour. Every number is a fixed
 * sample in integer cents that follows the app's rules (Business Rules 5, 7
 * and 16), so the screens never contradict the product.
 *
 * Motion hooks: `data-anim` (rise, pop, grow-x, grow-y, spin, type, flash) and
 * `data-at` (seconds into the screen's timeline), read by screenMotion.ts. The
 * markup is always the final state.
 */

type AnimKind = "rise" | "pop" | "grow-x" | "grow-y" | "spin" | "type" | "flash";

interface AnimAttributes {
  "data-anim": AnimKind;
  "data-at": string;
}

function anim(kind: AnimKind, at: number): AnimAttributes {
  return { "data-anim": kind, "data-at": String(at) };
}

/* 1. Split 1:1 (US01, Business Rule 7) ------------------------------------------------ */

const SPLIT_TOTAL_CENTS = 18_790;

export interface SplitMode {
  label: string;
  /** Line under the segmented control, describing the mode. */
  line: string;
  friendCents: number;
}

/** Friend share per mode, with the backend formulas: floor(total / 2), floor(total x 30 / 100), fixed R$ 50,00. */
export const SPLIT_MODES: readonly SplitMode[] = [
  { label: "Igual", line: "Metade para cada um", friendCents: Math.floor(SPLIT_TOTAL_CENTS / 2) },
  { label: "Porcentagem", line: "Ana paga 30% do total", friendCents: Math.floor((SPLIT_TOTAL_CENTS * 30) / 100) },
  { label: "Valor fixo", line: `Ana paga ${formatBRL(5_000)}`, friendCents: 5_000 },
];

/** The user's share is always the total minus the friend's (Business Rule 7). */
export function userShare(friendCents: number): number {
  return SPLIT_TOTAL_CENTS - friendCents;
}

const SPLIT_FRIENDS = ["Ana Lima", "Carlos Mendes", "Fernanda Costa", "Juliana Ramos"];

export function SplitScreen() {
  const equal = SPLIT_MODES[0];
  const friendCents = equal?.friendCents ?? 0;
  return (
    <ScreenFrame
      kind="split"
      title="Novo gasto"
      description={`Exemplo da tela Novo gasto: janta de ${formatBRL(SPLIT_TOTAL_CENTS)} dividida em partes iguais com Ana Lima, ${formatBRL(friendCents)} para cada um.`}
    >
      <ScreenCard>
        <ScreenLabel>Valor</ScreenLabel>
        <p className="mt-1.5 flex items-baseline gap-2 rounded-xl border border-accent-edge bg-surface px-4 py-2">
          <span className="text-base font-semibold text-muted">R$</span>
          <Amount cents={SPLIT_TOTAL_CENTS} className="text-2xl leading-tight font-bold" from={0} />
        </p>
        <p className="mt-2 truncate text-[13px] text-muted">Janta no japonês, Alimentação</p>
      </ScreenCard>

      <ScreenCard className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[15px] leading-snug font-semibold">Dividir com um amigo</p>
            <p className="mt-0.5 text-xs text-muted">A parte dele fica registrada como a receber.</p>
          </div>
          {/* Switch replica (on): spans only, so nothing here can take focus. */}
          <span className="flex h-7 w-12 shrink-0 items-center rounded-full bg-accent p-[3px] ring-1 ring-accent-edge ring-inset">
            <span className="size-[22px] translate-x-5 rounded-full bg-switch-thumb shadow-sm ring-1 ring-switch-thumb-edge" />
          </span>
        </div>

        <div className="-mx-1 flex gap-3 overflow-hidden px-1 py-1">
          {SPLIT_FRIENDS.map((name, index) => (
            <span key={name} className="flex w-14 shrink-0 flex-col items-center gap-1" {...anim("rise", 0.1 + index * 0.06)}>
              <Avatar
                name={name}
                tone="accent"
                className={cx(index === 0 && "ring-2 ring-accent-edge ring-offset-2 ring-offset-surface")}
              />
              <span className={cx("max-w-full truncate text-xs", index === 0 ? "font-semibold" : "text-muted")}>
                {name.split(" ")[0]}
              </span>
            </span>
          ))}
        </div>

        <div>
          <ScreenLabel>Como dividir</ScreenLabel>
          <div className="mt-2 grid grid-cols-[4fr_5fr_4fr] gap-1 rounded-xl bg-neutral-soft p-1">
            {SPLIT_MODES.map((mode, index) => (
              <span key={mode.label} data-split-option className="relative grid min-h-10 place-items-center px-1">
                <span
                  data-split-thumb
                  className={cx(
                    "absolute inset-0 rounded-[9px] bg-segment-selected shadow-sm",
                    index !== 0 && "opacity-0",
                  )}
                />
                <span
                  data-split-label
                  className={cx(
                    "relative truncate text-[13px]",
                    index === 0 ? "font-semibold text-segment-selected-text" : "font-medium text-muted",
                  )}
                >
                  {mode.label}
                </span>
              </span>
            ))}
          </div>
          <p data-split-line className="mt-2 truncate text-xs text-muted">
            {equal?.line}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="min-w-0 rounded-2xl bg-accent-soft p-3 text-accent-soft-text">
            <p className="truncate text-xs">Parte da Ana</p>
            <p className="mt-1 text-lg leading-snug font-bold">
              <span data-split-friend className="num">
                {formatBRL(friendCents)}
              </span>
            </p>
          </div>
          <div className="min-w-0 rounded-2xl bg-neutral-soft p-3">
            <p className="truncate text-xs text-muted">Sua parte</p>
            <p className="mt-1 text-lg leading-snug font-bold">
              <span data-split-user className="num">
                {formatBRL(userShare(friendCents))}
              </span>
            </p>
          </div>
        </div>
      </ScreenCard>
    </ScreenFrame>
  );
}

/* 2. Automatic categories (US02, Business Rule 8) ------------------------------------ */

const CATEGORY_CHIPS = ["Alimentação", "Transporte", "Lazer", "Moradia", "Saúde", "Compras"];

/** Number of default rules in backend/sql/seed.sql. */
const DEFAULT_RULE_COUNT = 31;

const USER_RULES: readonly { keyword: string; category: string }[] = [
  { keyword: "sushi", category: "Alimentação" },
  { keyword: "pilates", category: "Saúde" },
];

export function RulesScreen() {
  return (
    <ScreenFrame
      kind="rules"
      title="Novo gasto"
      description="Exemplo: ao digitar Rodízio de sushi, o app sugere a categoria Alimentação por causa da regra sushi criada pelo usuário."
    >
      <ScreenCard>
        <ScreenLabel>Descrição</ScreenLabel>
        <p className="mt-2 flex h-12 items-center rounded-xl border border-accent bg-surface px-4 text-base">
          <span data-anim="type" data-at="0.15" className="truncate whitespace-pre">
            Rodízio de sushi
          </span>
          <span className="ml-0.5 h-5 w-0.5 shrink-0 rounded-full bg-accent-text" />
        </p>
        <p className="mt-2 flex min-w-0 items-center gap-1.5 text-[13px] text-muted" {...anim("rise", 1.25)}>
          <Sparkles size={14} className="shrink-0 text-accent-text" />
          <span className="truncate">Categoria sugerida: Alimentação</span>
        </p>
        <ScreenLabel className="mt-4">Categoria</ScreenLabel>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CATEGORY_CHIPS.map((name, index) => (
            <span
              key={name}
              className="relative inline-flex h-9 items-center rounded-full border border-border bg-surface px-3 text-[13px] font-medium"
            >
              {index === 0 ? (
                // The selected look as a layer, so the motion can pop it in when the suggestion arrives.
                <span
                  className="absolute -inset-px rounded-full border border-accent-edge bg-accent-soft"
                  {...anim("pop", 1.45)}
                />
              ) : null}
              <span className={cx("relative", index === 0 && "font-semibold text-accent-soft-text")}>{name}</span>
            </span>
          ))}
        </div>
      </ScreenCard>

      <ScreenCard>
        <p className="text-[15px] leading-snug font-semibold">Regras de categoria</p>
        <p className="mt-0.5 text-xs text-muted">Existem {DEFAULT_RULE_COUNT} regras padrão. As suas vêm antes.</p>
        <ul className="mt-2">
          {USER_RULES.map((rule, index) => (
            <li key={rule.keyword} className="relative flex items-center gap-2 border-b border-border py-2.5 last:border-b-0">
              {index === 0 ? (
                <span className="absolute -inset-x-2 inset-y-0.5 rounded-xl bg-accent-soft opacity-0" {...anim("flash", 1.1)} />
              ) : null}
              <span className="relative text-sm font-medium">{rule.keyword}</span>
              <span className="relative rounded-full bg-accent-soft px-2 py-[3px] text-xs leading-tight font-semibold text-accent-soft-text">
                Sua regra
              </span>
              <span className="relative ml-auto truncate text-sm text-muted">{rule.category}</span>
            </li>
          ))}
        </ul>
      </ScreenCard>
    </ScreenFrame>
  );
}

/* 3. A receber and reimbursement status (US03, Business Rule 1) ---------------------- */

interface SampleReimbursement {
  description: string;
  friend: string;
  date: string;
  amountCents: number;
  shareCents: number;
  status: "em_aberto" | "pago" | "acertado";
  label: string;
}

const REIMBURSEMENTS: readonly SampleReimbursement[] = [
  {
    description: "Janta no japonês",
    friend: "Ana Lima",
    date: "24 out",
    amountCents: 18_790,
    shareCents: 9_395,
    status: "em_aberto",
    label: "Aguardando reembolso",
  },
  {
    description: "Uber para o show",
    friend: "Carlos Mendes",
    date: "22 out",
    amountCents: 6_400,
    shareCents: 3_200,
    status: "pago",
    label: "Pago em 23 out",
  },
  {
    description: "Cinema",
    friend: "Juliana Ramos",
    date: "19 out",
    amountCents: 5_600,
    shareCents: 2_800,
    status: "acertado",
    label: "Acertado em 20 out",
  },
];

/** Open shares (a receber) and paid ones (já recebido); settled shares count in neither. */
const OPEN_CENTS = REIMBURSEMENTS.filter((item) => item.status === "em_aberto").reduce((sum, item) => sum + item.shareCents, 0);
const PAID_CENTS = REIMBURSEMENTS.filter((item) => item.status === "pago").reduce((sum, item) => sum + item.shareCents, 0);

export function ReceivablesScreen() {
  return (
    <ScreenFrame
      kind="receivables"
      title="Extrato"
      description={`Exemplo do Extrato: ${formatBRL(OPEN_CENTS)} a receber e ${formatBRL(PAID_CENTS)} já recebidos. A janta com Ana Lima aguarda reembolso, o Uber com Carlos Mendes foi pago e o cinema com Juliana Ramos foi acertado sem mexer no saldo.`}
    >
      <ScreenCard className="grid grid-cols-2 divide-x divide-border p-0">
        <div className="min-w-0 p-4">
          <p className="text-[13px] text-muted">A receber</p>
          {/* Before Carlos pays, his share is still open: the count runs down to the final value. */}
          <p className="mt-0.5 text-xl leading-snug font-bold text-accent-text">
            <Amount cents={OPEN_CENTS} from={OPEN_CENTS + PAID_CENTS} />
          </p>
          <p className="truncate text-xs text-muted">1 em aberto</p>
        </div>
        <div className="min-w-0 p-4">
          <p className="text-[13px] text-muted">Já recebido</p>
          <p className="mt-0.5 text-xl leading-snug font-bold text-success">
            <Amount cents={PAID_CENTS} from={0} />
          </p>
          <p className="truncate text-xs text-muted">Somado ao saldo</p>
        </div>
      </ScreenCard>

      <ScreenCard className="px-4 py-1">
        <ul>
          {REIMBURSEMENTS.map((item, index) => (
            <li key={item.description} className="border-b border-border py-3 last:border-b-0" {...anim("rise", 0.15 + index * 0.1)}>
              <div className="flex items-center gap-3">
                <Avatar name={item.friend} tone="accent" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.description}</p>
                  <p className="truncate text-xs text-muted">
                    Com {item.friend}, {item.date}
                  </p>
                </div>
                <Amount cents={-item.amountCents} className="shrink-0 text-sm font-semibold" />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 pl-13">
                <span className="inline-flex" {...(item.status === "pago" ? anim("pop", 1.15) : {})}>
                  <StatusPill status={item.status} label={item.label} />
                </span>
                <span className="text-xs text-muted">
                  Parte de {item.friend.split(" ")[0]}: <Amount cents={item.shareCents} />
                </span>
              </div>
            </li>
          ))}
        </ul>
      </ScreenCard>
    </ScreenFrame>
  );
}

/* 4. Balance and adjustment history (US05, Business Rules 3 and 12) ------------------ */

interface SampleAdjustment {
  when: string;
  deltaCents: number;
  previousCents: number;
  reason: string;
}

/** Newest first; each new balance is the previous one plus the delta. */
const ADJUSTMENTS: readonly SampleAdjustment[] = [
  { when: "28 out 2026, 14:32", deltaCents: 15_000, previousCents: 691_397, reason: "Rendimento da poupança" },
  { when: "12 out 2026, 09:15", deltaCents: -4_250, previousCents: 695_647, reason: "Tarifa do banco cobrada no mês" },
];

const LATEST = ADJUSTMENTS[0];
const BALANCE_CENTS = LATEST ? LATEST.previousCents + LATEST.deltaCents : 0;

export function BalanceScreen() {
  return (
    <ScreenFrame
      kind="balance"
      title="Saldo"
      description={`Exemplo: saldo disponível de ${formatBRL(BALANCE_CENTS)} e histórico com dois ajustes. O mais recente soma ${formatBRL(15_000)}, de ${formatBRL(691_397)} para ${formatBRL(BALANCE_CENTS)}, com o motivo registrado.`}
    >
      <div className="rounded-[20px] bg-accent p-5 text-on-accent">
        <p className="text-[13px] font-medium text-on-accent/72">Saldo disponível</p>
        <p className="mt-0.5 text-[28px] leading-[1.15] font-extrabold tracking-[-0.01em]">
          <Amount cents={BALANCE_CENTS} from={LATEST?.previousCents ?? 0} />
        </p>
      </div>

      <ScreenCard>
        <p className="text-[15px] leading-snug font-semibold">Histórico de ajustes</p>
        <ol className="mt-3">
          {ADJUSTMENTS.map((item, index) => {
            const latest = index === 0;
            const last = index === ADJUSTMENTS.length - 1;
            return (
              <li key={item.when} className={cx("relative pl-6", !last && "pb-4")} {...anim("rise", 0.2 + index * 0.15)}>
                <span
                  className={cx("absolute top-1 left-0 size-[11px] rounded-full", latest ? "bg-accent" : "bg-muted/40")}
                  {...(latest ? anim("pop", 0.3) : {})}
                />
                {!last ? (
                  <span className="absolute top-4 bottom-0 left-[5px] w-px origin-top bg-border" {...anim("grow-y", 0.35)} />
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <p className="text-xs text-muted">{item.when}</p>
                  {latest ? (
                    <span className="rounded-full bg-accent-soft px-2 py-[3px] text-xs leading-tight font-semibold text-accent-soft-text">
                      Mais recente
                    </span>
                  ) : null}
                </div>
                <p className="mt-1">
                  <Amount
                    cents={item.deltaCents}
                    signed
                    className={cx("text-lg leading-snug font-bold", item.deltaCents > 0 ? "text-success" : "text-danger")}
                  />
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  De <Amount cents={item.previousCents} /> para <Amount cents={item.previousCents + item.deltaCents} />
                </p>
                <p className="mt-1 truncate text-sm">{item.reason}</p>
              </li>
            );
          })}
        </ol>
      </ScreenCard>
    </ScreenFrame>
  );
}

/* 5. Charts by period (US04, Business Rule 16) --------------------------------------- */

/** Seeded category ids, so each slice takes the app's fixed color. Own share only. */
const CATEGORY_TOTALS: readonly { id: number; name: string; cents: number }[] = [
  { id: 5, name: "Moradia", cents: 120_000 },
  { id: 1, name: "Alimentação", cents: 41_230 },
  { id: 2, name: "Transporte", cents: 18_640 },
  { id: 3, name: "Lazer", cents: 12_990 },
];
const CATEGORY_SUM = CATEGORY_TOTALS.reduce((sum, item) => sum + item.cents, 0);
const CATEGORY_PERCENTS = sharePercents(CATEGORY_TOTALS.map((item) => item.cents));

const FRIEND_TOTALS: readonly { name: string; cents: number }[] = [
  { name: "Ana Lima", cents: 15_230 },
  { name: "Carlos Mendes", cents: 8_750 },
  { name: "Juliana Ramos", cents: 4_000 },
];
const FRIEND_MAX = Math.max(...FRIEND_TOTALS.map((item) => item.cents));

const PERIODS = ["Semanal", "Mensal", "Anual"];

export function ChartsScreen() {
  const categoryText = CATEGORY_TOTALS.map((item) => `${item.name} ${formatBRL(item.cents)}`).join(", ");
  const friendText = FRIEND_TOTALS.map((item) => `${item.name} ${formatBRL(item.cents)}`).join(", ");
  return (
    <ScreenFrame
      kind="charts"
      title="Gastos do mês"
      description={`Exemplo de Gastos do mês em outubro: total de ${formatBRL(CATEGORY_SUM)} da sua parte, com ${categoryText}. Parte dos amigos: ${friendText}.`}
    >
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-neutral-soft p-1">
        {PERIODS.map((period) => (
          <span
            key={period}
            className={cx(
              "grid min-h-10 place-items-center rounded-[9px] text-[13px]",
              period === "Mensal" ? "bg-segment-selected font-semibold text-segment-selected-text shadow-sm" : "font-medium text-muted",
            )}
          >
            {period}
          </span>
        ))}
      </div>
      <p className="-my-0.5 flex items-center justify-between px-1 text-[13px] font-medium">
        <ChevronLeft size={16} className="text-muted" />
        outubro de 2026
        <ChevronRight size={16} className="text-muted" />
      </p>

      <ScreenCard>
        <p className="text-[15px] leading-snug font-semibold">Por categoria</p>
        <div className="mt-3 flex flex-col items-center gap-4 @min-[340px]:flex-row">
          <div {...anim("spin", 0)}>
            <DonutChart
              size={124}
              strokeWidth={18}
              slices={CATEGORY_TOTALS.map((item) => ({
                key: String(item.id),
                cents: item.cents,
                strokeClass: categoryColor(item.id).stroke,
              }))}
            >
              <span className="flex flex-col items-center leading-tight">
                <span className="text-xs text-muted">Total</span>
                <Amount cents={CATEGORY_SUM} from={0} className="text-sm font-bold" />
              </span>
            </DonutChart>
          </div>
          <ul className="w-full min-w-0 flex-1">
            {CATEGORY_TOTALS.map((item, index) => (
              <li
                key={item.id}
                className="flex items-center gap-2 border-b border-border py-1 text-[13px] last:border-b-0"
                {...anim("rise", 0.25 + index * 0.08)}
              >
                <span className={cx("size-2.5 shrink-0 rounded-[3px]", categoryColor(item.id).bg)} />
                {/* Percent under the name, so the name keeps its width beside the ring. */}
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate">{item.name}</span>
                  <span className="num block text-xs text-muted">
                    {formatPercent(CATEGORY_PERCENTS[index] ?? 0, item.cents)}
                  </span>
                </span>
                <Amount cents={item.cents} className="text-right font-semibold" />
              </li>
            ))}
          </ul>
        </div>
      </ScreenCard>

      <ScreenCard>
        <p className="text-[15px] leading-snug font-semibold">Parte dos amigos</p>
        <ul className="mt-3 space-y-2.5">
          {FRIEND_TOTALS.map((item, index) => (
            <li key={item.name}>
              <div className="flex items-center justify-between gap-3 text-[13px]">
                <span className="min-w-0 truncate">{item.name}</span>
                <Amount cents={item.cents} className="font-semibold" />
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-track">
                <div
                  className="h-full min-w-1 origin-left rounded-full bg-accent"
                  style={{ width: `${(item.cents * 100) / FRIEND_MAX}%` }}
                  {...anim("grow-x", 0.4 + index * 0.1)}
                />
              </div>
            </li>
          ))}
        </ul>
      </ScreenCard>
    </ScreenFrame>
  );
}
