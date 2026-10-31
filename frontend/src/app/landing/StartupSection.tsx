import { CreditCard, Landmark, Users, type LucideIcon } from "lucide-react";
import { BrandMark } from "../components/BrandMark.tsx";
import { HeroBackdrop } from "../components/HeroBackdrop.tsx";
import { cx } from "../components/ui/index.ts";
import { CONTAINER, Eyebrow, SECTION } from "./LandingParts.tsx";

interface Pillar {
  title: string;
  text: string;
  /** Marks content that is a proposal, not something the product does today. */
  proposal?: boolean;
}

const PILLARS: readonly Pillar[] = [
  {
    title: "Missão",
    text: "Tornar a divisão de gastos exata e sem constrangimento, para que ninguém precise guardar de cabeça quem deve quanto a quem.",
  },
  {
    title: "Para quem é",
    text: "Para quem divide a rotina com outra pessoa: quem mora junto, casais, amigos que viajam juntos e quem costuma pagar a conta para acertar depois.",
  },
  {
    title: "Modelo de negócio",
    text: "O essencial seria gratuito: dividir, categorizar, acompanhar reembolsos e entender o saldo. A receita viria de recursos opcionais pagos, como relatórios para exportar e metas por categoria.",
    proposal: true,
  },
];

interface Milestone {
  icon: LucideIcon;
  title: string;
  text: string;
}

const ROADMAP: readonly Milestone[] = [
  {
    icon: Users,
    title: "Divisão em grupo",
    text: "Um gasto dividido entre várias pessoas. O modelo de dados já guarda uma parte por pessoa, então o caminho está preparado.",
  },
  {
    icon: CreditCard,
    title: "Pix",
    text: "Cobrar a parte do amigo com um Pix e marcar o reembolso como pago quando o valor chegar.",
  },
  {
    icon: Landmark,
    title: "Open Finance",
    text: "Trazer os lançamentos do banco, com o consentimento do usuário, para a categoria automática trabalhar sozinha.",
  },
];

/** Small "Proposta" tag on content that is a plan, not a shipped feature. */
function ProposalTag() {
  return (
    <span className="rounded-full border border-accent/40 px-2 py-0.5 text-xs font-semibold tracking-[0.06em] text-accent uppercase">
      Proposta
    </span>
  );
}

/**
 * "A startup": SplitPay pitched as a company. Dark band in both themes, like the
 * hero. Business model and roadmap are labeled as proposals; there are no
 * metrics, users, partners or testimonials, because none exist.
 */
export function StartupSection() {
  return (
    <section
      id="startup"
      aria-labelledby="startup-titulo"
      className={cx(SECTION, "relative overflow-hidden border-y border-hero-text/10 bg-hero text-hero-text")}
    >
      <div data-motion="parallax" data-speed="-0.12" aria-hidden="true" className="absolute inset-0">
        <HeroBackdrop variant="landing" />
      </div>
      <div
        data-motion="parallax"
        data-speed="0.22"
        aria-hidden="true"
        className="absolute -right-24 top-24 hidden opacity-[0.07] md:block lg:-right-10"
      >
        <BrandMark size={420} />
      </div>

      <div className={cx(CONTAINER, "relative")}>
        <div data-motion="reveal" className="max-w-[760px]">
          <Eyebrow tone="hero">A startup</Eyebrow>
          <h2
            id="startup-titulo"
            className="mt-5 text-[28px] leading-tight font-bold tracking-[-0.02em] text-balance md:text-[40px] lg:text-5xl"
          >
            Uma fintech para o dinheiro que <span className="text-accent">a gente divide</span>
          </h2>
          <p className="mt-4 max-w-[620px] text-base text-pretty text-hero-text/72 md:text-lg">
            O SplitPay é um app de finanças pessoais com um foco claro: as despesas que você paga e divide com outra
            pessoa, do registro até o reembolso.
          </p>
        </div>

        <ul className="mt-12 grid gap-4 md:grid-cols-3 md:gap-6">
          {PILLARS.map((pillar) => (
            <li
              key={pillar.title}
              data-motion="startup-card"
              data-tilt
              className="rounded-[20px] border border-hero-text/10 bg-hero-text/[0.04] p-6 md:p-7"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl leading-tight font-bold">{pillar.title}</h3>
                {pillar.proposal ? <ProposalTag /> : null}
              </div>
              <p className="mt-3 text-base text-pretty text-hero-text/72">{pillar.text}</p>
            </li>
          ))}
        </ul>

        <div className="mt-16 lg:mt-24">
          <div data-motion="reveal" className="flex flex-wrap items-center gap-3">
            <h3 className="text-2xl leading-tight font-bold md:text-[28px]">Próximos passos</h3>
            <ProposalTag />
          </div>
          <p data-motion="reveal" className="mt-3 max-w-[620px] text-base text-hero-text/72">
            O roteiro depois da versão atual, que hoje divide cada gasto com um amigo.
          </p>

          <ol data-motion="roadmap" className="relative mt-10 grid gap-8 md:grid-cols-3 md:gap-6">
            {/* The line behind the markers: down the list on phones, across it from md. */}
            <span
              aria-hidden="true"
              className="absolute top-2 bottom-2 left-[21px] w-px bg-hero-text/15 md:top-[22px] md:right-0 md:bottom-auto md:left-0 md:h-px md:w-auto"
            >
              <span
                data-motion="roadmap-line"
                className="block size-full origin-top bg-accent md:origin-left"
              />
            </span>
            {ROADMAP.map(({ icon: Icon, title, text }, index) => (
              <li key={title} data-motion="milestone" className="relative flex gap-5 md:block">
                <span
                  aria-hidden="true"
                  className="relative grid size-11 shrink-0 place-items-center rounded-full bg-accent text-on-accent ring-8 ring-hero"
                >
                  <Icon size={20} />
                </span>
                <div className="min-w-0 md:mt-6 md:pr-6">
                  <p className="num text-sm font-semibold text-accent">Etapa {index + 1}</p>
                  <h4 className="mt-1 text-xl leading-tight font-bold">{title}</h4>
                  <p className="mt-2 text-base text-pretty text-hero-text/72">{text}</p>
                </div>
              </li>
            ))}
          </ol>

          <p data-motion="reveal" className="mt-12 max-w-[620px] text-sm text-hero-text/72">
            Modelo de negócio e roteiro são propostas para as próximas etapas, não recursos disponíveis hoje.
          </p>
        </div>
      </div>
    </section>
  );
}
