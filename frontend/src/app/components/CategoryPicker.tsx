import { useEffect, useState } from "react";
import { CircleAlert, RotateCw, Sparkles } from "lucide-react";
import { Button, Chip, Skeleton } from "./ui/index.ts";
import { trimInvisible } from "../../lib/text.ts";
import type { Resource } from "../../lib/useResource.ts";
import { suggestCategory } from "../../services/api.ts";
import type { Category } from "../../types/api.ts";

/** Pause after the last keystroke before asking the API for a category (US02). */
export const SUGGESTION_DELAY_MS = 400;

export interface SuggestedCategory {
  id: number;
  name: string;
}

/**
 * The category the API suggests for a description, or null. Waits 400 ms after
 * the last change and aborts the previous request, so only the latest text is
 * asked. Keeps the last answer while the user types; a blank description or
 * `enabled` false clears it at once. A failed request is silent (null).
 */
export function useCategorySuggestion(description: string, enabled: boolean): SuggestedCategory | null {
  const [suggestion, setSuggestion] = useState<SuggestedCategory | null>(null);
  const text = trimInvisible(description);

  useEffect(() => {
    if (!enabled || text === "") {
      setSuggestion(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      suggestCategory(text, controller.signal).then(
        (result) => {
          if (controller.signal.aborted) return;
          setSuggestion(
            result.category_id !== null && result.category_name !== null
              ? { id: result.category_id, name: result.category_name }
              : null,
          );
        },
        () => {
          // The category is optional, so a failed suggestion just shows nothing.
          if (!controller.signal.aborted) setSuggestion(null);
        },
      );
    }, SUGGESTION_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [text, enabled]);

  return suggestion;
}

interface SuggestionLineProps {
  suggestion: SuggestedCategory | null;
  id: string;
}

/** "Categoria sugerida: Alimentação" under Descrição; the region stays mounted so updates are announced. */
export function SuggestionLine({ suggestion, id }: SuggestionLineProps) {
  return (
    <div id={id} aria-live="polite">
      {suggestion ? (
        <p className="mt-2 flex min-w-0 items-center gap-1.5 text-[13px] text-muted">
          <Sparkles size={14} className="shrink-0 text-accent-text" aria-hidden="true" />
          <span className="truncate">Categoria sugerida: {suggestion.name}</span>
        </p>
      ) : null}
    </div>
  );
}

interface CategoryPickerProps {
  categories: Resource<Category[]>;
  value: number | null;
  /** A tap on a chip; tapping the selected chip clears the category. */
  onChange: (categoryId: number | null) => void;
}

const SKELETON_WIDTHS = ["w-28", "w-24", "w-16", "w-22", "w-20", "w-18"];

/** "Categoria": optional single-select chips from `GET /categories`. */
export function CategoryPicker({ categories, value, onChange }: CategoryPickerProps) {
  const labelId = "categoria-rotulo";
  return (
    <div>
      <span id={labelId} className="block text-xs font-semibold tracking-[0.06em] text-muted uppercase">
        Categoria
      </span>
      {categories.status === "loading" ? (
        <div aria-busy="true" aria-labelledby={labelId} className="mt-2 flex flex-wrap gap-2">
          {SKELETON_WIDTHS.map((width) => (
            <Skeleton key={width} className={`h-11 rounded-full! ${width}`} />
          ))}
        </div>
      ) : categories.status === "error" ? (
        <div role="alert" className="mt-2 flex flex-col items-start gap-2">
          <p className="flex items-start gap-1.5 text-sm text-danger">
            <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{categories.error.message}</span>
          </p>
          <Button variant="ghost" size="sm" icon={RotateCw} onClick={categories.retry}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <div role="group" aria-labelledby={labelId} className="mt-2 flex flex-wrap gap-2">
          {categories.data.map((category) => {
            const selected = category.id === value;
            return (
              <Chip
                key={category.id}
                selected={selected}
                onClick={() => onChange(selected ? null : category.id)}
                className="max-w-full"
              >
                <span className="truncate">{category.name}</span>
              </Chip>
            );
          })}
        </div>
      )}
    </div>
  );
}
