import { useId } from "react";
import { Money } from "./Money.tsx";
import { Card, ErrorState, Skeleton } from "./ui/index.ts";
import { useResource } from "../../lib/useResource.ts";
import { getProfile } from "../../services/api.ts";

/** "Orçamento mensal": read only, set by the seed (Business Rule 13). */
export function BudgetInfoCard() {
  const profile = useResource((signal) => getProfile(signal), []);
  const titleId = useId();

  if (profile.status === "error") {
    return (
      <ErrorState title="Não foi possível carregar o orçamento" message={profile.error.message} onRetry={profile.retry} />
    );
  }

  return (
    <Card
      aria-labelledby={titleId}
      aria-busy={profile.status === "loading" ? true : undefined}
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
    >
      {/* A 10rem basis keeps the amount beside the text (the note wraps first); a huge amount drops below it. */}
      <div className="min-w-0 flex-[1_1_10rem]">
        <h2 id={titleId} className="text-base leading-snug font-semibold">
          Orçamento mensal
        </h2>
        <p className="mt-0.5 text-xs text-muted">Definido nos dados de demonstração</p>
      </div>
      {profile.status === "loading" ? (
        <Skeleton className="h-6 w-28" />
      ) : (
        <Money cents={profile.data.monthly_budget_cents} className="text-lg leading-tight font-bold" />
      )}
    </Card>
  );
}
