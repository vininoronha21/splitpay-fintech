import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router";
import { formatBRL, parseBRL } from "../../lib/money.ts";
import { ApiError, getProfile, updateProfile } from "../../services/api.ts";
import { BrandMark } from "./BrandMark.tsx";
import { HeroBackdrop } from "./HeroBackdrop.tsx";
import { Button, MoneyField, Skeleton, TextField } from "./ui/index.ts";
import { saveUserName, validateUserName } from "../../lib/userName.ts";

// Hero logo ring, built from the fixed hero and accent tokens.
const LOGO_RING: CSSProperties = {
  boxShadow:
    "0 0 0 1px color-mix(in srgb, var(--color-hero-text) 12%, transparent), 0 0 48px color-mix(in srgb, var(--color-accent) 28%, transparent)",
};

/** "R$ 2.500,00" -> "2.500,00": the field draws its own "R$" prefix. */
function amountText(cents: number): string {
  return formatBRL(cents).replace(/^R\$\s/, "");
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "Algo deu errado. Tente novamente.";
}

/**
 * Entry page (/entrar), the fake login of Business Rule 4: the name stays in
 * localStorage, and the initial balance is saved only when it changed.
 */
export function LoginScreen() {
  const navigate = useNavigate();
  const nameRef = useRef<HTMLInputElement>(null);
  const balanceRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [balanceText, setBalanceText] = useState("");
  const [balanceError, setBalanceError] = useState<string>();
  /** Initial balance as the API last returned it; null when loading failed. */
  const [loadedCents, setLoadedCents] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getProfile(controller.signal)
      .then((profile) => {
        setLoadedCents(profile.initial_balance_cents);
        setBalanceText(amountText(profile.initial_balance_cents));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        // The field stays empty; submitting retries by saving what the user types.
        setBalanceError(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || submitting) return;

    const nextNameError = validateUserName(name) ?? undefined;
    const cents = parseBRL(balanceText);
    const nextBalanceError = cents === null ? "Informe um valor válido." : undefined;
    setNameError(nextNameError);
    setBalanceError(nextBalanceError);
    if (nextNameError) {
      nameRef.current?.focus();
      return;
    }
    if (cents === null) {
      balanceRef.current?.focus();
      return;
    }

    if (cents !== loadedCents) {
      setSubmitting(true);
      try {
        const profile = await updateProfile({ initial_balance_cents: cents });
        setLoadedCents(profile.initial_balance_cents);
      } catch (error) {
        setBalanceError(errorMessage(error));
        setSubmitting(false);
        balanceRef.current?.focus();
        return;
      }
    }

    saveUserName(name);
    navigate("/inicio", { replace: true });
  }

  const balanceHint = "Depois, o saldo só muda por ajuste com justificativa.";

  return (
    <div className="flex min-h-dvh flex-col bg-hero lg:flex-row">
      <section className="relative flex h-[clamp(192px,39.4dvh,332px)] flex-none flex-col items-center justify-center gap-3.5 overflow-hidden lg:h-auto lg:flex-1 lg:gap-5">
        <HeroBackdrop />
        <div className="relative rounded-full" style={LOGO_RING}>
          <BrandMark size={88} className="block lg:size-28" />
        </div>
        <p className="relative text-[26px] leading-tight font-extrabold tracking-[-0.03em] text-hero-text lg:text-[34px]">
          Split<span className="text-accent">Pay</span>
        </p>
      </section>

      {/* The wrapper is bg-hero, so the dark shows behind the sheet's rounded corners. */}
      <section className="relative flex flex-1 flex-col rounded-t-[28px] bg-surface px-5 pt-7 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,.08)] lg:w-[520px] lg:flex-none lg:rounded-t-none lg:rounded-l-[28px] lg:px-12 lg:pt-12">
        <form noValidate onSubmit={handleSubmit} className="mx-auto flex w-full max-w-[420px] flex-col gap-4 lg:my-auto">
          <div>
            <h1 className="text-2xl leading-[1.2] font-bold tracking-[-0.02em] min-[380px]:text-[26px]">
              Divida a conta.
              <br />
              Receba sua parte de volta.
            </h1>
            <p className="mt-2 text-[15px] text-muted">Informe seu nome para começar.</p>
          </div>

          <TextField
            ref={nameRef}
            label="Seu nome"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setNameError(undefined);
            }}
            error={nameError}
            required
            autoComplete="given-name"
            autoCapitalize="words"
            enterKeyHint="next"
          />

          {loading ? (
            <div aria-busy="true">
              <p className="text-xs font-semibold tracking-[0.06em] text-muted uppercase">Saldo inicial</p>
              <Skeleton className="mt-2 h-15 w-full" />
              <p className="mt-2 text-xs text-muted">{balanceHint}</p>
              <span role="status" className="sr-only">
                Carregando saldo inicial
              </span>
            </div>
          ) : (
            <MoneyField
              ref={balanceRef}
              label="Saldo inicial"
              value={balanceText}
              onChange={(text) => {
                setBalanceText(text);
                setBalanceError(undefined);
              }}
              hint={balanceHint}
              error={balanceError}
              required
              enterKeyHint="go"
            />
          )}

          <Button type="submit" fullWidth disabled={submitting} className="mt-1">
            {submitting ? (
              "Entrando..."
            ) : (
              <>
                Entrar
                <ChevronRight size={18} aria-hidden="true" />
              </>
            )}
          </Button>
        </form>

        <p className="mx-auto mt-auto max-w-[420px] pt-6 text-center text-xs text-muted lg:mt-0">
          Dados de demonstração compartilhados.
        </p>
      </section>
    </div>
  );
}
