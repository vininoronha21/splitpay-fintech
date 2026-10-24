import { ChartPie } from "lucide-react";
import { CardHeader } from "./CardHeader.tsx";
import { DonutChart, DonutTotal } from "./DonutChart.tsx";
import { Money } from "./Money.tsx";
import { Card, cx, EmptyState, ErrorState, Skeleton } from "./ui/index.ts";
import { categoryColor, formatPercent, sharePercents, type CategoryColor } from "../../lib/charts.ts";
import { monthName } from "../../lib/dates.ts";
import { useResource } from "../../lib/useResource.ts";
import { getCharts } from "../../services/api.ts";
import type { CategoryTotal, Charts } from "../../types/api.ts";

/** One non-zero category, ready for a legend row and a donut slice. */
export interface CategoryRow {
  key: string;
  category: CategoryTotal;
  /** "45%" or "<1%". */
  percent: string;
  color: CategoryColor;
}

/** Non-zero categories in API order (largest first), with integer percentages that sum to 100. */
export function toCategoryRows(charts: Charts): CategoryRow[] {
  const categories = charts.by_category.filter((category) => category.total_cents > 0);
  const percents = sharePercents(categories.map((category) => category.total_cents));
  return categories.map((category, index) => ({
    key: category.category_id === null ? "sem-categoria" : String(category.category_id),
    category,
    percent: formatPercent(percents[index] ?? 0, category.total_cents),
    color: categoryColor(category.category_id),
  }));
}

/** Small color square that ties a legend row to its slice or bar segment. */
export function Swatch({ color }: { color: CategoryColor }) {
  return <span aria-hidden="true" className={cx("size-2.5 shrink-0 rounded-[3px]", color.bg)} />;
}

/**
 * "Gastos por categoria" for the current month. Below `md`: a stacked bar and
 * the three largest categories; from `md`: a donut and every category.
 */
export function CategorySummaryCard() {
  const charts = useResource((signal) => getCharts({ period: "month" }, signal), []);

  if (charts.status === "loading") {
    return <CategorySummarySkeleton />;
  }
  if (charts.status === "error") {
    return <ErrorState title="Não foi possível carregar os gastos" message={charts.error.message} onRetry={charts.retry} />;
  }

  const rows = toCategoryRows(charts.data);
  const month = monthName(charts.data.start.slice(0, 7));

  return (
    <Card aria-labelledby="categorias-titulo" className="pt-1 md:px-6 md:pt-2 md:pb-5">
      {/* From md the title names the month and the link reads "Ver detalhes", as in the desktop prototype. */}
      <CardHeader
        titleId="categorias-titulo"
        title={
          <>
            Gastos por categoria<span className="hidden md:inline"> em {month}</span>
          </>
        }
        link={{
          to: "/gastos-do-mes",
          label: (
            <>
              <span className="md:hidden">Ver tudo</span>
              <span className="hidden md:inline">Ver detalhes</span>
            </>
          ),
        }}
      />
      {rows.length === 0 ? (
        <EmptyState icon={ChartPie} title="Nenhum gasto neste mês" className="py-6" />
      ) : (
        <>
          <MobileSummary rows={rows} />
          <DesktopSummary rows={rows} totalCents={charts.data.total_cents} />
        </>
      )}
    </Card>
  );
}

function MobileSummary({ rows }: { rows: CategoryRow[] }) {
  return (
    <div className="md:hidden">
      {/* Flex grow by integer cents: each segment's width follows its share, with 2 px gaps. */}
      <div aria-hidden="true" className="mt-0.5 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
        {rows.map((row) => (
          <span key={row.key} className={row.color.bg} style={{ flex: `${row.category.total_cents} 1 0` }} />
        ))}
      </div>
      <ul className="mt-1.5">
        {rows.slice(0, 3).map((row) => (
          <li key={row.key} className="flex items-center gap-3 border-b border-border py-[9px] text-sm last:border-b-0">
            <Swatch color={row.color} />
            <span className="min-w-0 flex-1 truncate">{row.category.category_name}</span>
            <span className="num text-xs text-muted">{row.percent}</span>
            <Money cents={row.category.total_cents} className="min-w-[92px] text-right font-semibold" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function DesktopSummary({ rows, totalCents }: { rows: CategoryRow[]; totalCents: number }) {
  // Column-major order, as in the prototype: the largest categories fill the first column.
  const perColumn = Math.ceil(rows.length / 2);
  return (
    <div className="mt-1 hidden grid-cols-[168px_minmax(0,1fr)] items-center gap-8 md:grid">
      <DonutChart
        size={168}
        strokeWidth={22}
        slices={rows.map((row) => ({ key: row.key, cents: row.category.total_cents, strokeClass: row.color.stroke }))}
      >
        <DonutTotal cents={totalCents} />
      </DonutChart>
      <ul
        className="grid grid-flow-col grid-cols-2 gap-x-8"
        style={{ gridTemplateRows: `repeat(${perColumn}, auto)` }}
      >
        {rows.map((row, index) => (
          <li
            key={row.key}
            className={cx(
              "flex min-w-0 items-center gap-3 py-[9px] text-sm",
              // A hairline under every row except the last of each column.
              index % perColumn !== perColumn - 1 && index !== rows.length - 1 && "border-b border-border",
            )}
          >
            <Swatch color={row.color} />
            <span className="min-w-0 flex-1 truncate">{row.category.category_name}</span>
            <Money cents={row.category.total_cents} className="font-semibold" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CategorySummarySkeleton() {
  return (
    <Card aria-busy="true" aria-label="Carregando gastos por categoria" className="pt-1 md:px-6 md:pt-2 md:pb-5">
      <div className="flex min-h-11 items-center">
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="md:hidden">
        <Skeleton className="mt-0.5 h-2.5 w-full rounded-full!" />
        <div className="mt-1.5">
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex items-center gap-3 py-[9px]">
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1 hidden grid-cols-[168px_minmax(0,1fr)] items-center gap-8 md:grid">
        <Skeleton className="size-[168px] rounded-full!" />
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <Skeleton key={index} className="h-5" />
          ))}
        </div>
      </div>
    </Card>
  );
}
