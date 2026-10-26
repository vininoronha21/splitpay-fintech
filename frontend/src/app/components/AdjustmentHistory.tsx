import { forwardRef, useEffect, useId, useRef, useState } from "react";
import { CardHeader } from "./CardHeader.tsx";
import { Money } from "./Money.tsx";
import { Button, Card, cx, ErrorState, Skeleton } from "./ui/index.ts";
import { formatDateTime } from "../../lib/dates.ts";
import { useResource } from "../../lib/useResource.ts";
import { listAdjustments } from "../../services/api.ts";
import type { Adjustment } from "../../types/api.ts";

/** Items shown before "Ver todos". */
const VISIBLE_ITEMS = 5;

interface AdjustmentHistoryProps {
  /** Bumped by SettingsScreen after each adjustment; reloads the list. */
  version: number;
}

/** "Histórico de ajustes" (US05): newest first, as a vertical timeline. */
export function AdjustmentHistory({ version }: AdjustmentHistoryProps) {
  const adjustments = useResource((signal) => listAdjustments(signal), [version]);
  const titleId = useId();

  if (adjustments.status === "error") {
    return (
      <ErrorState
        title="Não foi possível carregar o histórico"
        message={adjustments.error.message}
        onRetry={adjustments.retry}
      />
    );
  }

  return (
    <Card
      aria-labelledby={titleId}
      aria-busy={adjustments.status === "loading" ? true : undefined}
      className="md:p-6"
    >
      <CardHeader title="Histórico de ajustes" titleId={titleId} />
      {adjustments.status === "loading" ? (
        <HistorySkeleton />
      ) : adjustments.data.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Nenhum ajuste ainda.</p>
      ) : (
        <Timeline adjustments={adjustments.data} />
      )}
    </Card>
  );
}

function HistorySkeleton() {
  return (
    <div className="mt-3 flex flex-col gap-5 pl-6">
      {[0, 1].map((index) => (
        <div key={index}>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-1.5 h-6 w-28" />
          <Skeleton className="mt-1.5 h-4 w-52 max-w-full" />
          <Skeleton className="mt-1.5 h-4 w-60 max-w-full" />
        </div>
      ))}
    </div>
  );
}

function Timeline({ adjustments }: { adjustments: Adjustment[] }) {
  const [expanded, setExpanded] = useState(false);
  const [focusFirstHidden, setFocusFirstHidden] = useState(false);
  const firstHidden = useRef<HTMLLIElement>(null);
  const shown = expanded ? adjustments : adjustments.slice(0, VISIBLE_ITEMS);

  // "Ver todos" disappears when pressed, so focus moves to the first item it revealed.
  useEffect(() => {
    if (!focusFirstHidden) return;
    firstHidden.current?.focus();
    setFocusFirstHidden(false);
  }, [focusFirstHidden]);

  return (
    <>
      <ol aria-label="Ajustes" className="mt-3">
        {shown.map((adjustment, index) => (
          <TimelineItem
            key={adjustment.id}
            ref={index === VISIBLE_ITEMS ? firstHidden : undefined}
            adjustment={adjustment}
            latest={index === 0}
            focusTarget={index === VISIBLE_ITEMS}
            last={index === shown.length - 1}
          />
        ))}
      </ol>
      {!expanded && adjustments.length > VISIBLE_ITEMS ? (
        <Button
          variant="ghost"
          size="sm"
          fullWidth
          className="mt-3"
          onClick={() => {
            setExpanded(true);
            setFocusFirstHidden(true);
          }}
        >
          Ver todos ({adjustments.length})
        </Button>
      ) : null}
    </>
  );
}

interface TimelineItemProps {
  adjustment: Adjustment;
  /** The newest adjustment: amber dot and "Mais recente". */
  latest: boolean;
  /** No line below the last dot. */
  last: boolean;
  /** The first item "Ver todos" revealed: focusable from script only. */
  focusTarget: boolean;
}

const TimelineItem = forwardRef<HTMLLIElement, TimelineItemProps>(function TimelineItem(
  { adjustment, latest, last, focusTarget },
  ref,
) {
  const positive = adjustment.delta_cents > 0;
  return (
    <li ref={ref} tabIndex={focusTarget ? -1 : undefined} className={cx("relative pl-6 outline-none", !last && "pb-5")}>
      {/* The timeline: a dot per item and a line down to the next one. Decorative; the list carries the order. */}
      <span
        aria-hidden="true"
        className={cx("absolute top-1 left-0 size-[11px] rounded-full", latest ? "bg-accent" : "bg-muted/40")}
      />
      {!last ? <span aria-hidden="true" className="absolute top-4 bottom-0 left-[5px] w-px bg-border" /> : null}

      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <p className="text-xs text-muted">{formatDateTime(adjustment.created_at)}</p>
        {latest ? (
          <span className="rounded-full bg-accent-soft px-2 py-[3px] text-xs leading-tight font-semibold text-accent-soft-text">
            Mais recente
          </span>
        ) : null}
      </div>
      <p className="mt-1">
        <Money
          cents={adjustment.delta_cents}
          signed
          className={cx("text-lg leading-snug font-bold", positive ? "text-success" : "text-danger")}
        />
      </p>
      <p className="mt-0.5 text-xs text-muted">
        De <Money cents={adjustment.previous_balance_cents} /> para <Money cents={adjustment.new_balance_cents} />
      </p>
      <p className="mt-1 text-sm break-words">{adjustment.reason}</p>
    </li>
  );
});
