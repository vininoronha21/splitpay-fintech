import { ChevronDown, RotateCw } from "lucide-react";
import { useUserName } from "./AppLayout.tsx";
import { HideValuesButton } from "./HideValuesButton.tsx";
import { Money } from "./Money.tsx";
import { UserMenu } from "./UserMenu.tsx";
import { cx, focusRingOnAccent, initials } from "./ui/index.ts";
import { brasiliaHour, greeting } from "../../lib/dates.ts";
import { formatBRL } from "../../lib/money.ts";
import { useResource } from "../../lib/useResource.ts";
import { getBalance } from "../../services/api.ts";

/** Steps the balance down for very long amounts, so it never wraps beside the eye at 360 px. */
function balanceSizeClass(cents: number): string {
  const length = formatBRL(cents).length;
  if (length > 17) return "text-xl md:text-2xl";
  if (length > 13) return "text-2xl md:text-[28px]";
  return "text-[32px] md:text-4xl";
}

/**
 * Amber block with the greeting and "Saldo disponível". Below `md` it runs to
 * the screen edges and the top (AppLayout leaves Início without a gutter there);
 * from `md` it is a rounded card, as in the desktop prototype.
 */
export function BalanceHeader() {
  const userName = useUserName();
  const balance = useResource((signal) => getBalance(signal), []);
  const hello = greeting(brasiliaHour(new Date()));

  return (
    <section
      aria-labelledby="saldo-titulo"
      className={cx(
        "rounded-b-[24px] bg-accent px-4 pt-[calc(16px+env(safe-area-inset-top))] pb-5 text-on-accent",
        "md:rounded-[20px] md:p-6",
      )}
    >
      {/* Below md the initials and greeting open the user menu; from md the top nav avatar does. */}
      <UserMenu
        label={`${hello}, ${userName}, menu do usuário`}
        tone="accent"
        align="start"
        className="-mx-1.5 flex md:hidden"
      >
        <span className="flex min-w-0 items-center gap-3 px-1.5">
          {/* on-accent is the same near-black in both themes, so a tint of it is theme-safe. */}
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-on-accent/12 text-[13px] font-bold"
          >
            {initials(userName)}
          </span>
          <span className="min-w-0 truncate text-[17px] font-semibold">
            {hello}, {userName}
          </span>
          <ChevronDown size={18} aria-hidden="true" className="-ml-1.5 shrink-0" />
        </span>
      </UserMenu>
      <p className="hidden min-w-0 truncate text-lg font-semibold md:block">
        {hello}, {userName}
      </p>
      <h2 id="saldo-titulo" className="mt-5 text-[13px] font-medium text-on-accent/72 md:mt-4">
        Saldo disponível
      </h2>
      <div className="mt-0.5 flex min-h-11 items-center gap-2 md:gap-2.5">
        {balance.status === "ready" ? (
          <p
            className={cx(
              "min-w-0 leading-[1.15] font-extrabold tracking-[-0.01em]",
              balanceSizeClass(balance.data.balance_cents),
            )}
          >
            <Money cents={balance.data.balance_cents} />
          </p>
        ) : null}
        {balance.status === "loading" ? (
          <span
            aria-hidden="true"
            className="block h-9 w-48 animate-pulse rounded-xl bg-on-accent/10 motion-reduce:animate-none"
          />
        ) : null}
        {balance.status === "error" ? (
          <div role="alert" className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-sm font-medium">Não foi possível carregar o saldo.</p>
            <button
              type="button"
              onClick={balance.retry}
              className={cx(
                "inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-on-accent/10 px-3 text-sm font-semibold hover:bg-on-accent/15",
                focusRingOnAccent,
              )}
            >
              <RotateCw size={16} aria-hidden="true" />
              Tentar novamente
            </button>
          </div>
        ) : (
          <HideValuesButton tone="accent" />
        )}
      </div>
    </section>
  );
}
