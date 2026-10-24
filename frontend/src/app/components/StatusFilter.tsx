import { useEffect, useRef } from "react";
import { Chip } from "./ui/index.ts";
import type { SplitStatus } from "../../types/api.ts";

interface FilterOption {
  /** null is "Todos". */
  value: SplitStatus | null;
  label: string;
}

const OPTIONS: FilterOption[] = [
  { value: null, label: "Todos" },
  { value: "em_aberto", label: "Em aberto" },
  { value: "pago", label: "Pagos" },
  { value: "acertado", label: "Acertados" },
];

interface StatusFilterProps {
  value: SplitStatus | null;
  onChange: (value: SplitStatus | null) => void;
}

/**
 * Extrato chips (US03): toggle buttons with `aria-pressed`, single select.
 * When they do not fit, the row scrolls sideways (never the page), and the
 * selected chip is scrolled into view, e.g. after opening `?status=acertado`.
 */
export function StatusFilter({ value, onChange }: StatusFilterProps) {
  const row = useRef<HTMLDivElement>(null);
  const chips = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    const container = row.current;
    const chip = chips.current.get(value ?? "todos");
    if (!container || !chip) return;
    // Adjusts the row's own scroll only; scrollIntoView could also move the page.
    // The row is `relative`, so offsetLeft is measured from its padding edge.
    const start = chip.offsetLeft;
    const end = start + chip.offsetWidth;
    if (start < container.scrollLeft) {
      container.scrollLeft = start - 16;
    } else if (end > container.scrollLeft + container.clientWidth) {
      container.scrollLeft = end - container.clientWidth + 16;
    }
  }, [value]);

  return (
    // Edge to edge below md (the page gutter becomes the row's padding), so a chip cut at the edge shows there is more.
    // The 4 px padding around the chips keeps their focus ring inside the scroll box.
    <div
      ref={row}
      role="group"
      aria-label="Filtrar por status"
      className="relative -mx-4 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] md:-mx-1 md:px-1"
    >
      {OPTIONS.map((option) => {
        const key = option.value ?? "todos";
        return (
          <Chip
            key={key}
            ref={(element) => {
              if (element) chips.current.set(key, element);
              else chips.current.delete(key);
            }}
            selected={option.value === value}
            onClick={() => onChange(option.value)}
            className="shrink-0"
          >
            {option.label}
          </Chip>
        );
      })}
    </div>
  );
}
