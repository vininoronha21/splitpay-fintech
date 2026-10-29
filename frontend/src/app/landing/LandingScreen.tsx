import { ArrowRight, ChevronDown, GraduationCap } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router";
import { BrandMark } from "../components/BrandMark.tsx";
import { HeroBackdrop } from "../components/HeroBackdrop.tsx";
import { cx, focusRing } from "../components/ui/index.ts";
import { readUserName } from "../../lib/userName.ts";
import { API_DOCS_URL } from "../../services/api.ts";
import { FeatureGrid } from "./FeatureGrid.tsx";
import { HeroPreview } from "./HeroPreview.tsx";
import { HowItWorks } from "./HowItWorks.tsx";
import { useLandingMotion } from "./useLandingMotion.ts";

const GITHUB_URL = "https://github.com/vininoronha21/splitpay-fintech";

/** Content column: 1140 px at most, inside a 16 px (mobile) or 24 px gutter. */
const CONTAINER = "mx-auto w-full max-w-[1140px]";
const GUTTER = "px-4 md:px-6";
/** Vertical rhythm of the sections below the hero: 64 px mobile, 120 px from lg. */
const SECTION = cx(GUTTER, "py-16 lg:py-[120px]");
const SECTION_TITLE = "text-[28px] leading-tight font-bold tracking-[-0.02em] md:text-[40px] lg:text-5xl";

/** On the hero, amber (11.8:1 on #0b0b0c) is the ring that shows in both themes. */
const heroFocusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

type CtaTone = "hero" | "surface";

const CTA_CIRCLE: Record<CtaTone, string> = {
  hero: "bg-hero-text text-hero",
  surface: "bg-text text-bg",
};

/** Landing CTA: amber pill with a circular arrow overlapping its end (one link). */
function CtaLink({ to, tone }: { to: string; tone: CtaTone }) {
  return (
    <Link
      to={to}
      className={cx(
        "group inline-flex min-h-[52px] items-center rounded-[44px]",
        tone === "hero" ? heroFocusRing : focusRing,
      )}
    >
      <span className="inline-flex h-[52px] items-center rounded-[44px] bg-accent pr-9 pl-5 text-[15px] font-semibold whitespace-nowrap text-on-accent shadow-[0_3px_13px_rgba(251,191,36,.18)] transition-colors group-hover:bg-accent-strong motion-reduce:transition-none sm:pl-6 sm:text-base">
        Experimentar a demonstração
      </span>
      <span
        aria-hidden="true"
        className={cx("-ml-5 grid size-[52px] shrink-0 place-items-center rounded-full", CTA_CIRCLE[tone])}
      >
        <ArrowRight size={20} className="-rotate-30" />
      </span>
    </Link>
  );
}

/**
 * Public landing page (/), outside AppLayout: what SplitPay does, the five stories
 * and the way into the demo. Static markup shows the final state; motion only adds
 * an entrance, so nothing here is hidden by CSS.
 */
export function LandingScreen() {
  // Same check as /entrar: with a saved name the demo opens straight on Início.
  const appTarget = readUserName() ? "/inicio" : "/entrar";
  const headerLabel = appTarget === "/inicio" ? "Abrir o app" : "Entrar";
  // Scope for the motion hook: its selectors only see this page's data-motion elements.
  const scopeRef = useRef<HTMLDivElement>(null);
  useLandingMotion(scopeRef);

  return (
    <div ref={scopeRef} className="relative">
      <header className={cx("absolute inset-x-0 top-0 z-10", GUTTER)}>
        <div className={cx(CONTAINER, "flex items-center justify-between gap-4 py-4 lg:py-6")}>
          <div className="flex items-center gap-2.5">
            <BrandMark size={36} className="rounded-full ring-1 ring-hero-text/12" />
            <span className="text-lg leading-none font-extrabold tracking-[-0.03em] text-hero-text">
              Split<span className="text-accent">Pay</span>
            </span>
          </div>
          <Link
            to={appTarget}
            className={cx(
              "inline-flex min-h-11 items-center rounded-[44px] border border-hero-text/24 px-5 text-sm font-semibold whitespace-nowrap text-hero-text transition-colors hover:bg-hero-text/10 motion-reduce:transition-none",
              heroFocusRing,
            )}
          >
            {headerLabel}
          </Link>
        </div>
      </header>

      <main>
        <section
          aria-labelledby="landing-title"
          className={cx("relative overflow-hidden bg-hero pt-[108px] pb-16 lg:pt-[168px] lg:pb-[120px]", GUTTER)}
        >
          <HeroBackdrop />
          <div className={cx(CONTAINER, "relative lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center lg:gap-16")}>
            <div>
              <p
                data-motion="hero-pill"
                className="inline-flex items-center gap-1.5 rounded-full border border-hero-text/15 bg-hero-text/5 py-1.5 pr-4 pl-3 text-xs font-medium tracking-wide text-hero-text uppercase"
              >
                <GraduationCap size={14} className="text-accent" aria-hidden="true" />
                Projeto acadêmico FIAP
              </p>
              <h1
                id="landing-title"
                data-motion="hero-title"
                className="mt-5 text-[34px] leading-[1.1] font-extrabold tracking-[-0.02em] text-balance text-hero-text min-[380px]:text-[36px] md:text-5xl lg:text-[56px] lg:leading-[1.05]"
              >
                Divida um gasto com um amigo e saiba quanto <span className="text-accent">volta para você</span>
              </h1>
              <p
                data-motion="hero-lead"
                className="mt-5 max-w-[560px] text-base text-hero-text/72 md:text-lg"
              >
                Registre a despesa, escolha como dividir e acompanhe o reembolso até ele cair no seu saldo.
              </p>
              <div data-motion="hero-ctas" className="mt-8 flex flex-wrap items-center gap-3">
                <CtaLink to={appTarget} tone="hero" />
                <a
                  href="#como-funciona"
                  className={cx(
                    "inline-flex min-h-[52px] items-center gap-1.5 rounded-[44px] px-5 text-base font-semibold text-hero-text transition-colors hover:bg-hero-text/10 motion-reduce:transition-none",
                    heroFocusRing,
                  )}
                >
                  Como funciona
                  <ChevronDown size={18} aria-hidden="true" />
                </a>
              </div>
            </div>
            <div className="mt-12 lg:mt-0">
              <HeroPreview />
            </div>
          </div>
        </section>

        <section aria-labelledby="recursos-titulo" className={SECTION}>
          <div className={CONTAINER}>
            <h2 id="recursos-titulo" className={SECTION_TITLE}>
              O que dá para fazer
            </h2>
            <div className="mt-10 lg:mt-14">
              <FeatureGrid />
            </div>
          </div>
        </section>

        <section id="como-funciona" aria-labelledby="como-funciona-titulo" className={cx(SECTION, "pt-0 lg:pt-0")}>
          <div className={cx(CONTAINER, "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,640px)] lg:gap-16")}>
            <h2 id="como-funciona-titulo" className={SECTION_TITLE}>
              Como funciona
            </h2>
            <div className="mt-10 lg:mt-0">
              <HowItWorks />
            </div>
          </div>
        </section>

        <section aria-labelledby="cta-titulo" className={cx(SECTION, "pt-0 lg:pt-0")}>
          <div
            className={cx(
              CONTAINER,
              "relative overflow-hidden rounded-[20px] border border-border bg-surface px-6 py-12 text-center shadow-xs md:px-12 lg:py-16",
            )}
          >
            <div
              aria-hidden="true"
              className="absolute -top-24 left-1/2 size-[320px] -translate-x-1/2 rounded-full bg-accent/15 blur-3xl"
            />
            <div className="relative flex flex-col items-center">
              <h2 id="cta-titulo" className={SECTION_TITLE}>
                Pronto para testar?
              </h2>
              <div className="mt-8">
                <CtaLink to={appTarget} tone="surface" />
              </div>
              <p className="mt-6 max-w-[440px] text-sm text-muted">
                Os dados são de demonstração e voltam ao estado inicial quando o servidor reinicia.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className={cx("border-t border-border py-8", GUTTER)}>
        <div className={cx(CONTAINER, "flex flex-col gap-4 md:flex-row md:items-center md:justify-between")}>
          <div className="flex items-center gap-2.5">
            <BrandMark size={28} className="rounded-full ring-1 ring-hero-text/12" />
            <p className="text-sm text-muted">SplitPay, projeto acadêmico da FIAP.</p>
          </div>
          <ul className="-mx-2 flex flex-wrap gap-x-2">
            <li>
              <FooterLink href={GITHUB_URL}>Código no GitHub</FooterLink>
            </li>
            <li>
              <FooterLink href={API_DOCS_URL}>Documentação da API</FooterLink>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cx(
        "inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-muted underline-offset-4 hover:text-text hover:underline",
        focusRing,
      )}
    >
      {children}
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  );
}
