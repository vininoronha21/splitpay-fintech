import { House } from "lucide-react";
import { Link } from "react-router";
import { BrandMark } from "./BrandMark.tsx";
import { cx, focusRing } from "./ui/index.ts";

/** Unknown paths; outside the guard, so it also works before entering. */
export function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12 text-center">
      <BrandMark size={56} className="rounded-full ring-1 ring-hero-text/12" />
      <p className="num mt-6 text-sm font-semibold text-accent-text">Erro 404</p>
      <h1 className="mt-1 text-[22px] leading-tight font-bold md:text-[28px]">Página não encontrada</h1>
      <p className="mt-2 max-w-xs text-balance text-muted">O endereço pode ter mudado ou não existe.</p>
      <Link
        to="/inicio"
        className={cx(
          "mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-5 font-semibold text-on-accent",
          "shadow-[0_3px_13px_rgba(251,191,36,.18)] transition hover:bg-accent-strong",
          "active:scale-[.98] motion-reduce:transition-none motion-reduce:active:scale-100",
          focusRing,
        )}
      >
        <House size={18} aria-hidden="true" />
        Voltar para o Início
      </Link>
    </main>
  );
}
