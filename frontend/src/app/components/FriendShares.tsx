import { CardHeader } from "./CardHeader.tsx";
import { Money } from "./Money.tsx";
import { Card, Skeleton } from "./ui/index.ts";
import { monthName, periodLabel } from "../../lib/dates.ts";
import type { Charts } from "../../types/api.ts";

/** "em outubro", "em setembro de 2025", "na semana de 19 a 25 de out" or "em 2026". */
function periodPhrase(charts: Charts, offset: number): string {
  switch (charts.period) {
    case "month": {
      const month = monthName(charts.start.slice(0, 7));
      return offset === 0 ? `em ${month}` : `em ${month} de ${charts.start.slice(0, 4)}`;
    }
    case "week":
      return `na semana de ${periodLabel("week", charts.start, charts.end)}`;
    case "year":
      return `em ${charts.start.slice(0, 4)}`;
  }
}

interface FriendSharesProps {
  charts: Charts;
  offset: number;
}

/** "Parte dos amigos" (US04 by person): each friend's share, with bars scaled to the largest. */
export function FriendShares({ charts, offset }: FriendSharesProps) {
  const friends = charts.by_person.filter((person) => person.total_cents > 0);
  const largest = friends.reduce((max, person) => Math.max(max, person.total_cents), 0);

  return (
    <Card aria-labelledby="amigos-titulo" className="md:p-6">
      <CardHeader
        title="Parte dos amigos"
        titleId="amigos-titulo"
        note={`Quanto cada amigo assumiu nas despesas divididas ${periodPhrase(charts, offset)}.`}
      />
      {friends.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Nenhuma despesa dividida neste período.</p>
      ) : (
        <ul className="mt-4 space-y-3.5">
          {friends.map((person) => (
            <li key={person.person_id}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">{person.person_name}</span>
                <Money cents={person.total_cents} className="font-semibold" />
              </div>
              <div aria-hidden="true" className="mt-1.5 h-2 overflow-hidden rounded-full bg-track">
                {/* Bar length only; the amount beside it is the number. */}
                <div
                  className="h-full min-w-1 rounded-full bg-accent"
                  style={{ width: `${(person.total_cents * 100) / largest}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function FriendSharesSkeleton() {
  return (
    <Card aria-busy="true" aria-label="Carregando parte dos amigos" className="md:p-6">
      <Skeleton className="h-5 w-36" />
      <Skeleton className="mt-1.5 h-3.5 w-64" />
      <div className="mt-4 space-y-3.5">
        {[0, 1, 2, 3].map((index) => (
          <div key={index}>
            <div className="flex justify-between gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="mt-1.5 h-2 w-full rounded-full!" />
          </div>
        ))}
      </div>
    </Card>
  );
}
