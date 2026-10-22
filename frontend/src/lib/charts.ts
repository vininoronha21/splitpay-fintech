/**
 * Chart helpers: integer percentages and the fixed category color map.
 * Every value here is an integer; no float ratio of money is ever rounded.
 */

/**
 * Splits 100 points across `totals` (integer cents) by largest remainder:
 * each entry gets floor(total * 100 / sum), and the points left over go to the
 * largest remainders, ties by list order. The result sums to 100 when any
 * total is above 0, and is all zeros when every total is 0.
 *
 * The products and the sum run in BigInt: `total * 100` passes
 * Number.MAX_SAFE_INTEGER at about R$ 900 bilhões, which the shared demo can
 * reach. Every percent is 0..100, so it converts back to a number exactly.
 */
export function sharePercents(totals: readonly number[]): number[] {
  for (const total of totals) {
    if (!Number.isSafeInteger(total) || total < 0) {
      throw new RangeError(`sharePercents expects non-negative integer cents, received ${String(total)}`);
    }
  }
  const scaled = totals.map((total) => BigInt(total) * 100n);
  const sum = totals.reduce((acc, total) => acc + BigInt(total), 0n);
  if (sum === 0n) {
    return totals.map(() => 0);
  }

  const percents = scaled.map((value) => Number(value / sum));
  const remainders = scaled.map((value) => value % sum);
  let leftover = 100 - percents.reduce((acc, percent) => acc + percent, 0);

  // Indices by remainder, largest first; the stable sort keeps list order on ties.
  const order = totals.map((_, index) => index).sort((a, b) => compareBigInt(remainders[b] ?? 0n, remainders[a] ?? 0n));
  for (const index of order) {
    if (leftover === 0) {
      break;
    }
    percents[index] = (percents[index] ?? 0) + 1;
    leftover -= 1;
  }
  return percents;
}

/** Sort comparator for BigInt: subtracting would give a BigInt, which `sort` cannot use. */
function compareBigInt(a: bigint, b: bigint): number {
  return a > b ? 1 : a < b ? -1 : 0;
}

/** "42%", or "<1%" for a non-zero total that rounded down to 0 points. */
export function formatPercent(percent: number, totalCents: number): string {
  if (totalCents > 0 && percent === 0) {
    return "<1%";
  }
  return `${percent}%`;
}

/** Tailwind classes for one category: `bg` for swatches and bars, `stroke` for donut slices. */
export interface CategoryColor {
  bg: string;
  stroke: string;
}

// Full literal class names, so Tailwind finds and generates every one of them.
const CHART_1: CategoryColor = { bg: "bg-chart-1", stroke: "stroke-chart-1" };
const CHART_2: CategoryColor = { bg: "bg-chart-2", stroke: "stroke-chart-2" };
const CHART_3: CategoryColor = { bg: "bg-chart-3", stroke: "stroke-chart-3" };
const CHART_4: CategoryColor = { bg: "bg-chart-4", stroke: "stroke-chart-4" };
const CHART_5: CategoryColor = { bg: "bg-chart-5", stroke: "stroke-chart-5" };
const CHART_6: CategoryColor = { bg: "bg-chart-6", stroke: "stroke-chart-6" };
const CHART_7: CategoryColor = { bg: "bg-chart-7", stroke: "stroke-chart-7" };
const CHART_OTHER: CategoryColor = { bg: "bg-chart-other", stroke: "stroke-chart-other" };

/** Seeded category ids (`backend/sql/seed.sql`) to colors; fixed per category, never by rank. */
const CATEGORY_COLORS: Readonly<Record<number, CategoryColor>> = {
  1: CHART_3, // Alimentação
  2: CHART_4, // Transporte
  3: CHART_5, // Lazer
  4: CHART_7, // Compras
  5: CHART_1, // Moradia
  6: CHART_6, // Saúde
  7: CHART_2, // Educação
  8: CHART_OTHER, // Outros
};

/** Color of a category; "Sem categoria" (null) and unknown ids share the neutral. */
export function categoryColor(categoryId: number | null): CategoryColor {
  if (categoryId === null) {
    return CHART_OTHER;
  }
  return CATEGORY_COLORS[categoryId] ?? CHART_OTHER;
}
