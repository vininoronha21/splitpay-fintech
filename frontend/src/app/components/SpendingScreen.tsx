import { useEffect } from "react";
import { ArrowLeft, ChartPie } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { CategoryBreakdown, CategoryBreakdownSkeleton } from "./CategoryBreakdown.tsx";
import { FriendShares, FriendSharesSkeleton } from "./FriendShares.tsx";
import { MIN_OFFSET, PeriodNavigator } from "./PeriodNavigator.tsx";
import { ScreenTitle } from "./ScreenTitle.tsx";
import { Card, cx, EmptyState, ErrorState, focusRing, Segmented, type SegmentedOption } from "./ui/index.ts";
import { periodLabel } from "../../lib/dates.ts";
import { useResource, type Resource } from "../../lib/useResource.ts";
import { getCharts } from "../../services/api.ts";
import type { Charts, Period } from "../../types/api.ts";

/** `periodo` values in the URL (pt-BR, as the user sees them). */
type PeriodParam = "semanal" | "mensal" | "anual";

const PERIOD_OPTIONS: SegmentedOption<PeriodParam>[] = [
  { value: "semanal", label: "Semanal" },
  { value: "mensal", label: "Mensal" },
  { value: "anual", label: "Anual" },
];

const API_PERIOD: Record<PeriodParam, Period> = { semanal: "week", mensal: "month", anual: "year" };

function isPeriodParam(value: string | null): value is PeriodParam {
  return value === "semanal" || value === "mensal" || value === "anual";
}

interface PeriodState {
  periodo: PeriodParam;
  offset: number;
}

/**
 * Reads `?periodo=&offset=`. An unknown `periodo` falls back to the current
 * month; a non-integer offset to 0; an integer offset is clamped to -520..0.
 */
function parsePeriod(params: URLSearchParams): PeriodState {
  const periodo = params.get("periodo");
  if (periodo !== null && !isPeriodParam(periodo)) {
    return { periodo: "mensal", offset: 0 };
  }
  const rawOffset = params.get("offset") ?? "0";
  const offset = /^-?\d+$/.test(rawOffset) ? Math.min(0, Math.max(MIN_OFFSET, Number(rawOffset))) : 0;
  // `|| 0` turns "-0" into 0.
  return { periodo: periodo ?? "mensal", offset: offset || 0 };
}

/** Gastos do mês (US04): charts by category and by friend for a chosen period. */
export function SpendingScreen() {
  const [params, setParams] = useSearchParams();
  const { periodo, offset } = parsePeriod(params);
  const period = API_PERIOD[periodo];
  const charts = useResource((signal) => getCharts({ period, offset }, signal), [period, offset]);

  // Rewrites an invalid URL to the values in use, without a new history entry.
  const hasParams = params.has("periodo") || params.has("offset");
  const canonical = params.get("periodo") === periodo && params.get("offset") === String(offset);
  useEffect(() => {
    if (hasParams && !canonical) {
      setParams({ periodo, offset: String(offset) }, { replace: true, preventScrollReset: true });
    }
  }, [hasParams, canonical, periodo, offset, setParams]);

  // A new period is a new view (back returns to it); stepping through offsets is not.
  // Both stay on this screen, so the page keeps its scroll position.
  const changePeriod = (next: PeriodParam) => setParams({ periodo: next, offset: "0" }, { preventScrollReset: true });
  const changeOffset = (next: number) =>
    setParams({ periodo, offset: String(next) }, { replace: true, preventScrollReset: true });

  const label =
    charts.status === "ready"
      ? periodLabel(charts.data.period, charts.data.start, charts.data.end)
      : charts.status === "error"
        ? ""
        : null;

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <div className="flex items-center gap-3">
        <Link
          to="/inicio"
          aria-label="Voltar para o Início"
          className={cx(
            "grid size-11 shrink-0 place-items-center rounded-full border border-border bg-surface text-text hover:bg-neutral-soft",
            focusRing,
          )}
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>
        <ScreenTitle>Gastos do mês</ScreenTitle>
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
        <Segmented label="Período" options={PERIOD_OPTIONS} value={periodo} onChange={changePeriod} className="md:w-90" />
        <div className="md:w-80">
          <PeriodNavigator period={period} offset={offset} label={label} onOffsetChange={changeOffset} />
        </div>
      </div>
      <SpendingCards charts={charts} offset={offset} keyPrefix={`${periodo}:${offset}`} />
    </div>
  );
}

interface SpendingCardsProps {
  charts: Resource<Charts>;
  offset: number;
  keyPrefix: string;
}

/** Both cards share one request: skeletons, one error card, the empty card or the charts. */
function SpendingCards({ charts, offset, keyPrefix }: SpendingCardsProps) {
  if (charts.status === "loading") {
    return (
      <div className="grid grid-cols-1 items-start gap-3 md:gap-4 lg:grid-cols-2">
        <CategoryBreakdownSkeleton />
        <FriendSharesSkeleton />
      </div>
    );
  }
  if (charts.status === "error") {
    return <ErrorState title="Não foi possível carregar os gastos" message={charts.error.message} onRetry={charts.retry} />;
  }
  if (charts.data.total_cents === 0) {
    return (
      <Card className="grid min-h-[340px] place-items-center">
        <EmptyState
          icon={ChartPie}
          title="Nenhum dado encontrado"
          description="Não há despesas suas neste período."
        />
      </Card>
    );
  }
  // `grid-cols-1` is minmax(0, 1fr): a long open item truncates instead of widening the card past the screen.
  return (
    <div className="grid grid-cols-1 items-start gap-3 md:gap-4 lg:grid-cols-2">
      <CategoryBreakdown key={keyPrefix} charts={charts.data} />
      <FriendShares charts={charts.data} offset={offset} />
    </div>
  );
}
