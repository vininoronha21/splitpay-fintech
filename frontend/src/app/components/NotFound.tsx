import { House } from "lucide-react";
import { Link } from "react-router";
import { BrandMark } from "./BrandMark.tsx";
import { buttonClasses, cx } from "./ui/index.ts";

/** Unknown paths; outside the guard, so it also works before entering. */
export function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12 text-center">
      <BrandMark size={56} className="rounded-full ring-1 ring-hero-text/12" />
      <p className="num mt-6 text-sm font-semibold text-accent-text">Erro 404</p>
      <h1 className="mt-1 text-[22px] leading-tight font-bold md:text-[28px]">Página não encontrada</h1>
      <p className="mt-2 max-w-xs text-balance text-muted">O endereço pode ter mudado ou não existe.</p>
      {/* A link styled like Button primary: it navigates, it does not submit. */}
      <Link to="/inicio" className={cx(buttonClasses(), "mt-6")}>
        <House size={18} aria-hidden="true" />
        Voltar para o Início
      </Link>
    </main>
  );
}
