import { useCallback, useEffect, useRef, useState } from "react";
import { getHealth } from "../../services/api.ts";

type HealthState = "loading" | "online" | "offline";

const STATUS_COPY: Record<HealthState, { label: string; detail: string }> = {
  loading: { label: "Verificando API…", detail: "Conectando ao servidor do SplitPay." },
  online: { label: "API online", detail: "Tudo pronto para dividir suas despesas." },
  offline: { label: "API indisponível", detail: "Não conseguimos falar com o servidor agora." },
};

const DOT_CLASS: Record<HealthState, string> = {
  loading: "bg-accent animate-pulse",
  online: "bg-success",
  offline: "bg-danger",
};

export default function HealthStatus() {
  const [state, setState] = useState<HealthState>("loading");
  const controllerRef = useRef<AbortController | null>(null);

  const check = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState("loading");
    try {
      await getHealth(controller.signal);
      if (!controller.signal.aborted) setState("online");
    } catch {
      if (!controller.signal.aborted) setState("offline");
    }
  }, []);

  useEffect(() => {
    void check();
    return () => controllerRef.current?.abort();
  }, [check]);

  const copy = STATUS_COPY[state];

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <section className="w-full max-w-sm rounded-3xl border border-border bg-surface p-6 shadow-2xl shadow-black/40">
        <header className="mb-8">
          <p className="text-2xl font-bold tracking-tight text-accent">SplitPay</p>
          <p className="mt-1 text-sm text-muted">Divida despesas sem complicação.</p>
        </header>

        <div
          className="flex items-center gap-3 rounded-2xl bg-bg p-4"
          role="status"
          aria-live="polite"
        >
          <span className={`size-3 shrink-0 rounded-full ${DOT_CLASS[state]}`} aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-semibold">{copy.label}</p>
            <p className="text-sm text-muted">{copy.detail}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void check()}
          disabled={state === "loading"}
          className="mt-6 min-h-12 w-full rounded-2xl bg-accent px-4 font-semibold text-on-accent transition-colors hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state === "loading" ? "Verificando…" : "Tentar novamente"}
        </button>
      </section>
    </main>
  );
}
