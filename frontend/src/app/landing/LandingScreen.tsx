import { ArrowRight, ChevronDown } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router";
import { BrandMark } from "../components/BrandMark.tsx";
import { HeroBackdrop } from "../components/HeroBackdrop.tsx";
import { cx, focusRing } from "../components/ui/index.ts";
import { readUserName } from "../../lib/userName.ts";
import { API_DOCS_URL } from "../../services/api.ts";
import { FeatureTour } from "./FeatureTour.tsx";
import { HeroPreview } from "./HeroPreview.tsx";
import { HowItWorks } from "./HowItWorks.tsx";
import { CONTAINER, GUTTER, heroFocusRing, SECTION, SECTION_TITLE } from "./LandingParts.tsx";
import { StartupSection } from "./StartupSection.tsx";
import { useLandingMotion } from "./useLandingMotion.ts";
import { WhyDifferent } from "./WhyDifferent.tsx";

const GITHUB_URL = "https://github.com/vininoronha21/splitpay-fintech";

/** In-page sections linked from the header (from lg; the page is one scroll on phones). */
const NAV_LINKS: readonly { href: string; label: string }[] = [
  { href: "#funcionalidades", label: "Funcionalidades" },
  { href: "#diferenciais", label: "Diferenciais" },
  { href: "#startup", label: "A startup" },
  { href: "#como-funciona", label: "Como funciona" },
];

/** Landing CTA: amber pill with a circular arrow overlapping its end (one link). */
function CtaLink({ to }: { to: string }) {
  return (
    <Link to={to} className={cx("group inline-flex min-h-[52px] items-center rounded-[44px]", heroFocusRing)}>
      <span className="inline-flex h-[52px] items-center rounded-[44px] bg-accent pr-8 pl-4 text-sm font-semibold whitespace-nowrap text-on-accent shadow-[0_3px_13px_rgba(251,191,36,.18)] transition-colors group-hover:bg-accent-strong motion-reduce:transition-none min-[380px]:pr-9 min-[380px]:pl-5 min-[380px]:text-[15px] sm:pl-6 sm:text-base">
        Experimentar a demonstração
      </span>
      <span
        aria-hidden="true"
        className="-ml-5 grid size-[52px] shrink-0 place-items-center rounded-full bg-hero-text text-hero transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
      >
        <ArrowRight size={20} />
      </span>
    </Link>
  );
}

/**
 * Public landing page (/), outside AppLayout: the hero with the way into the demo,
 * then Funcionalidades, Por que é diferente, A startup and Como funciona. Static
 * markup shows the final state; motion only adds entrances, the pinned tour and
 * scroll effects, so nothing here is hidden by CSS.
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
          <nav aria-label="Seções" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className={cx(
                      "inline-flex min-h-11 items-center rounded-[44px] px-4 text-sm font-medium text-hero-text/72 transition-colors hover:text-hero-text motion-reduce:transition-none",
                      heroFocusRing,
                    )}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
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
          className={cx("relative overflow-hidden border-b border-hero-text/10 bg-hero pt-[108px] pb-16 lg:pt-[168px] lg:pb-[120px]", GUTTER)}
        >
          <div data-motion="hero-backdrop" aria-hidden="true" className="absolute inset-0">
            <HeroBackdrop variant="landing" />
          </div>
          <div className={cx(CONTAINER, "relative lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center lg:gap-16")}>
            <div data-motion="hero-copy">
              <h1
                id="landing-title"
                data-motion="hero-title"
                className="text-[34px] leading-[1.1] font-extrabold tracking-[-0.02em] text-balance text-hero-text min-[380px]:text-[36px] md:text-5xl lg:text-[56px] lg:leading-[1.05]"
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
                <CtaLink to={appTarget} />
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
            <div data-motion="hero-float" className="mt-12 lg:mt-0">
              <HeroPreview />
            </div>
          </div>
        </section>

        <FeatureTour />
        <WhyDifferent />
        <StartupSection />

        <section id="como-funciona" aria-labelledby="como-funciona-titulo" className={SECTION}>
          <div className={cx(CONTAINER, "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,640px)] lg:gap-16")}>
            <h2 id="como-funciona-titulo" className={SECTION_TITLE}>
              Como funciona
            </h2>
            <div className="mt-10 lg:mt-0">
              <HowItWorks />
            </div>
          </div>
        </section>

      </main>

      <footer className={cx("border-t border-border py-8", GUTTER)}>
        <div className={cx(CONTAINER, "flex flex-col gap-4 md:flex-row md:items-center md:justify-between")}>
          <div className="flex items-center gap-3">
            <BrandMark size={32} className="shrink-0 rounded-full ring-1 ring-hero-text/12" />
            <div className="min-w-0">
              <p className="text-base leading-none font-extrabold tracking-[-0.03em]">
                Split<span className="text-accent-text">Pay</span>
              </p>
              <p className="mt-1 text-sm text-muted">Gastos divididos, cada centavo no lugar.</p>
            </div>
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
