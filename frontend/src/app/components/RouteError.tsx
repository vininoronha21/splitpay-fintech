import { House, RotateCw } from "lucide-react";
import { Link } from "react-router";
import { BrandMark } from "./BrandMark.tsx";
import { Button, buttonClasses } from "./ui/index.ts";

/**
 * Router `errorElement`: shown when a screen throws while rendering (e.g. an
 * amount beyond the safe integer range), instead of React Router's English page.
 */
export function RouteError() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12 text-center">
      <BrandMark size={56} className="rounded-full ring-1 ring-hero-text/12" />
      <h1 className="mt-6 text-[22px] leading-tight font-bold md:text-[28px]">Algo deu errado</h1>
      <p className="mt-2 max-w-xs text-balance text-muted">
        Não foi possível mostrar esta tela. Tente de novo ou volte ao início.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {/* A full reload fetches every request again and clears the router's error state. */}
        <Button icon={RotateCw} onClick={() => window.location.reload()}>
          Tentar novamente
        </Button>
        <Link to="/inicio" className={buttonClasses({ variant: "ghost" })}>
          <House size={18} aria-hidden="true" />
          Voltar para o Início
        </Link>
      </div>
    </main>
  );
}
