import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { CardHeader } from "./CardHeader.tsx";
import { Swatch, toCategoryRows, type CategoryRow } from "./CategorySummaryCard.tsx";
import { DonutChart, DonutTotal } from "./DonutChart.tsx";
import { Money } from "./Money.tsx";
import { Card, cx, focusRing, Skeleton } from "./ui/index.ts";
import { formatShortDate } from "../../lib/dates.ts";
import type { Charts } from "../../types/api.ts";

/**
 * "Por categoria" (US04): donut of the user's own share plus a legend whose rows
 * expand into the expenses behind each category. Expanded rows reset when the
 * parent remounts it for another period.
 */
export function CategoryBreakdown({ charts }: { charts: Charts }) {
  const rows = toCategoryRows(charts);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  function toggle(key: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }

  return (
    <Card aria-labelledby="por-categoria-titulo">
      <CardHeader
        title="Por categoria"
        titleId="por-categoria-titulo"
        note="Considera só a sua parte de cada despesa."
      />
      <div className="mt-4 grid place-items-center">
        <DonutChart
          size={196}
          strokeWidth={27}
          slices={rows.map((row) => ({ key: row.key, cents: row.category.total_cents, strokeClass: row.color.stroke }))}
        >
          <DonutTotal cents={charts.total_cents} size="lg" />
        </DonutChart>
      </div>
      <ul className="mt-3">
        {rows.map((row) => (
          <CategoryItem key={row.key} row={row} expanded={expanded.has(row.key)} onToggle={() => toggle(row.key)} />
        ))}
      </ul>
    </Card>
  );
}

interface CategoryItemProps {
  row: CategoryRow;
  expanded: boolean;
  onToggle: () => void;
}

function CategoryItem({ row, expanded, onToggle }: CategoryItemProps) {
  const listId = useId();
  const { category } = row;
  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={listId}
        onClick={onToggle}
        className={cx("flex min-h-11 w-full items-center gap-3 rounded-xl py-2 text-left text-sm", focusRing)}
      >
        <Swatch color={row.color} />
        <span className={cx("min-w-0 flex-1 truncate", expanded && "font-semibold")}>{category.category_name}</span>
        <span className="num text-xs text-muted">{row.percent}</span>
        <Money cents={category.total_cents} className="min-w-[92px] text-right font-semibold" />
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={cx("shrink-0 text-muted transition-transform motion-reduce:transition-none", expanded && "rotate-180")}
        />
      </button>
      {/* Kept in the DOM while collapsed, so aria-controls always points at it. */}
      <ul id={listId} hidden={!expanded} className="space-y-1.5 pr-7 pb-3 pl-[22px]">
        {category.items.map((item) => (
          <li key={item.transaction_id} className="flex items-center gap-3 text-[13px] text-muted">
            <span className="min-w-0 flex-1 truncate">
              {item.description}, {formatShortDate(item.occurred_on)}
            </span>
            <Money cents={item.own_share_cents} />
          </li>
        ))}
      </ul>
    </li>
  );
}

/** Same shape as the loaded card: title, note, ring and legend rows. */
export function CategoryBreakdownSkeleton() {
  return (
    <Card aria-busy="true" aria-label="Carregando gastos por categoria">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="mt-1.5 h-3.5 w-60" />
      <div className="mt-4 grid place-items-center">
        <Skeleton className="size-[196px] rounded-full!" />
      </div>
      <div className="mt-3">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div key={index} className="flex min-h-11 items-center gap-3 py-2">
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    </Card>
  );
}
