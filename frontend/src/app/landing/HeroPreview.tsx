import { Clock } from "lucide-react";
import { Money } from "../components/Money.tsx";
import { TransactionRow } from "../components/TransactionRow.tsx";
import { Card } from "../components/ui/index.ts";
import { formatBRL } from "../../lib/money.ts";
import type { TransactionSummary } from "../../types/api.ts";

/** Fixed sample values (integer cents); the landing never calls the API. */
export const SAMPLE_BALANCE_CENTS = 706_397;
const SAMPLE_RECEIVABLE_CENTS = 9_395;

const SAMPLE_SPLIT: TransactionSummary = {
  id: 0,
  type: "expense",
  description: "Janta no japonês",
  amount_cents: 18_790,
  own_share_cents: 9_395,
  category_name: "Alimentação",
  occurred_on: "2026-10-24",
  friend_name: "Ana Lima",
  split_status: "em_aberto",
};

const DESCRIPTION =
  `Exemplo da tela inicial do SplitPay: saldo disponível de ${formatBRL(SAMPLE_BALANCE_CENTS)}, ` +
  `uma janta no japonês com Ana Lima de ${formatBRL(SAMPLE_SPLIT.amount_cents)} aguardando reembolso ` +
  `e ${formatBRL(SAMPLE_RECEIVABLE_CENTS)} a receber de amigos.`;

/**
 * Hero preview of Início, drawn with the real app components and sample values.
 * The drawing is aria-hidden; screen readers get one sentence instead.
 */
export function HeroPreview() {
  return (
    <figure data-motion="hero-preview" className="mx-auto w-full max-w-[440px]">
      <p className="sr-only">{DESCRIPTION}</p>
      <div
        aria-hidden="true"
        className="flex flex-col gap-3 rounded-[28px] border border-hero-text/10 bg-bg p-3 shadow-[0_24px_64px_rgba(0,0,0,.45)] sm:p-4"
      >
        <div className="rounded-[20px] bg-accent p-5 text-on-accent">
          <p className="text-[13px] font-medium text-on-accent/72">Saldo disponível</p>
          {/* The entrance motion counts this up from zero; the markup always holds the final value. */}
          <p data-motion="hero-balance" className="mt-0.5 text-[28px] leading-[1.15] font-extrabold tracking-[-0.01em] sm:text-[32px]">
            <Money cents={SAMPLE_BALANCE_CENTS} />
          </p>
        </div>
        <Card padded={false} as="div" className="px-4 py-1">
          <ul>
            <TransactionRow transaction={SAMPLE_SPLIT} showStatus />
          </ul>
        </Card>
        <Card as="div" className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-soft-text">
            <Clock size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-muted">A receber de amigos</p>
            <p className="text-xl leading-snug font-bold">
              <Money cents={SAMPLE_RECEIVABLE_CENTS} />
            </p>
          </div>
        </Card>
      </div>
      <figcaption className="mt-3 text-center text-xs font-medium text-hero-text/72">Valores de exemplo</figcaption>
    </figure>
  );
}
