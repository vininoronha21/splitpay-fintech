import { CircleCheck, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Amount, CONTAINER, Eyebrow, SECTION } from "./LandingParts.tsx";
import { cx } from "../components/ui/index.ts";
import { formatBRL } from "../../lib/money.ts";

/** Statement scrubbed word by word on wide screens; it reads the same as one plain sentence. */
const STATEMENT =
  "Cada centavo no lugar certo, categorias que seguem as suas palavras e um saldo que só muda quando o dinheiro volta de verdade.";

/** Business Rule 7 in one example: R$ 100,01 split equally, the remainder cent stays with the payer. */
const EXAMPLE_TOTAL = 10_001;
const EXAMPLE_FRIEND = Math.floor(EXAMPLE_TOTAL / 2);
const EXAMPLE_USER = EXAMPLE_TOTAL - EXAMPLE_FRIEND;

interface Reason {
  title: string;
  text: string;
  visual: ReactNode;
}

const REASONS: readonly Reason[] = [
  {
    title: "Centavo por centavo",
    text: `Todo valor é guardado em centavos inteiros, do banco de dados até a tela. Uma conta de ${formatBRL(EXAMPLE_TOTAL)} dividida ao meio vira ${formatBRL(EXAMPLE_FRIEND)} para o amigo e ${formatBRL(EXAMPLE_USER)} para você, e a soma sempre fecha.`,
    visual: <CentsVisual />,
  },
  {
    title: "Categorias com as suas palavras",
    text: "As regras padrão já reconhecem Janta, Uber e Combustível. As regras que você cria passam na frente, e a comparação é por palavra inteira, então o app segue o seu vocabulário sem adivinhar.",
    visual: <RulesVisual />,
  },
  {
    title: "Saldo que só muda com dinheiro de verdade",
    text: "Dividir uma conta não infla o seu saldo. A parte do amigo só entra quando você marca Recebi, e Já acertamos encerra a dívida sem criar dinheiro que não existe.",
    visual: <BalanceVisual />,
  },
];

/**
 * "Por que é diferente": a statement (pinned and scrubbed word by word from md)
 * and three reasons, each with a small decorative example whose numbers are
 * also in the text.
 */
export function WhyDifferent() {
  const words = STATEMENT.split(" ");
  return (
    <section id="diferenciais" aria-labelledby="diferenciais-titulo" className={SECTION}>
      <div className={CONTAINER}>
        <div data-motion="why-pin" className="max-w-[960px]">
          <Eyebrow>Por que é diferente</Eyebrow>
          <h2
            id="diferenciais-titulo"
            className="mt-5 text-[28px] leading-[1.15] font-bold tracking-[-0.02em] text-balance md:text-[40px] lg:text-[52px]"
          >
            {words.map((word, index) => (
              <span key={`${word}-${index}`} data-motion="word">
                {word}
                {index < words.length - 1 ? " " : ""}
              </span>
            ))}
          </h2>
        </div>

        {/* One row per card on tablets (example beside the text), three columns from lg. */}
        <ul className="mt-12 grid gap-4 md:mt-16 md:gap-6 lg:grid-cols-3">
          {REASONS.map((reason) => (
            <li
              key={reason.title}
              data-motion="why-card"
              data-tilt
              className="flex flex-col gap-6 rounded-[20px] border border-border bg-surface p-6 shadow-xs md:grid md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] md:items-center md:gap-8 md:p-7 lg:flex lg:items-stretch lg:gap-6"
            >
              {reason.visual}
              <div>
                <h3 className="text-xl leading-tight font-bold">{reason.title}</h3>
                <p className="mt-2 text-base text-pretty text-muted">{reason.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function VisualBox({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div aria-hidden="true" data-motion="count-group" className={cx("rounded-2xl bg-neutral-soft p-4 text-sm", className)}>
      {children}
    </div>
  );
}

function CentsVisual() {
  return (
    <VisualBox className="space-y-2">
      <p className="flex items-center justify-between gap-3">
        <span className="text-muted">Total</span>
        <Amount cents={EXAMPLE_TOTAL} className="font-semibold" />
      </p>
      <p className="flex items-center justify-between gap-3">
        <span className="text-muted">Parte da Ana</span>
        <Amount cents={EXAMPLE_FRIEND} className="font-semibold" />
      </p>
      <p className="flex items-center justify-between gap-3">
        <span className="text-muted">Sua parte</span>
        <Amount cents={EXAMPLE_USER} className="font-semibold text-accent-text" />
      </p>
      <p className="flex items-center justify-between gap-3 border-t border-border pt-2">
        <span className="flex items-center gap-1.5 font-semibold text-success">
          <CircleCheck size={16} />
          Soma
        </span>
        <Amount cents={EXAMPLE_TOTAL} className="font-semibold text-success" />
      </p>
    </VisualBox>
  );
}

function RulesVisual() {
  return (
    <VisualBox className="space-y-3">
      <p className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate">Bar com a turma</span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2 py-[3px] text-xs font-semibold text-accent-soft-text">
          <Sparkles size={12} />
          Lazer
        </span>
      </p>
      <p className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate">Barbearia</span>
        <span className="shrink-0 rounded-full bg-surface px-2 py-[3px] text-xs font-semibold text-muted">Sem sugestão</span>
      </p>
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0">
          <span className="block truncate">Rodízio de sushi</span>
          <span className="block truncate text-xs text-muted">pela sua regra sushi</span>
        </p>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2 py-[3px] text-xs font-semibold text-accent-soft-text">
          <Sparkles size={12} />
          Alimentação
        </span>
      </div>
    </VisualBox>
  );
}

function BalanceVisual() {
  return (
    <VisualBox className="space-y-2">
      <p className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-muted">Você pagou a janta</span>
        <Amount cents={-18_790} className="font-semibold" />
      </p>
      <p className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-muted">Recebi de Ana</span>
        <Amount cents={9_395} signed from={0} className="font-semibold text-success" />
      </p>
      <p className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-muted">Uber com Carlos, acertado</span>
        <Amount cents={0} className="font-semibold" />
      </p>
      <p className="border-t border-border pt-2 text-xs text-muted">Só o que voltou de fato entra no saldo.</p>
    </VisualBox>
  );
}
