# 009 Home — Plan

Status: approved

## Files to Create/Modify

- `frontend/src/lib/dates.ts` (new):
  - `formatShortDate("2026-10-20")` → "20 out";
  - `monthName("2026-10")` → "outubro";
  - `periodLabel(period, start, end)`;
  - `brasiliaHour(now)` and `greeting(hour)`.

  All work on strings and integer parts, never on local `Date` fields.
- `frontend/src/lib/charts.ts` (new): `sharePercents(totals)` (integer largest remainder), `categoryColor(categoryId)` (token class per seeded id).
- `frontend/src/lib/useResource.ts` (new): `useResource(fetcher, deps)` returns `{ status: "loading" | "error" | "ready", data, error, retry }`. It aborts on unmount and on deps change.
- `frontend/src/styles/theme.css`: `chart-7` and `chart-other` tokens in both themes.
- `frontend/src/app/components/` (new):
  - `HomeScreen.tsx`;
  - `BalanceHeader.tsx`, `QuickActions.tsx`, `BudgetCard.tsx`, `ReceivableCard.tsx`, `CategorySummaryCard.tsx`, `RecentTransactionsCard.tsx`;
  - `TransactionRow.tsx` (reused by 011);
  - `SpendingScreen.tsx`, `PeriodNavigator.tsx`, `DonutChart.tsx`, `CategoryBreakdown.tsx`, `FriendShares.tsx`;
  - `CardHeader.tsx` (added in T2): the shared card title, note and 44 px text link, so every card header looks and behaves the same.
- `frontend/src/app/components/AppLayout.tsx` (added in T2 and T4): below `md`, `/inicio` drops the main padding so the amber header runs to the screen edges; the Início tab and link stay highlighted on `/gastos-do-mes`, which belongs to Início (`aria-current` still marks only the real route).
- `frontend/src/app/routes.tsx`: `/inicio` → `HomeScreen`, `/gastos-do-mes` → `SpendingScreen`.
- `.claude/skills/splitpay-design-language/SKILL.md`: the category color map and the `chart-7`/`chart-other` tokens.
- `docs/development/repository-structure.md`: the new `lib/` files.

## Architectural & Tech Decisions

- **Screens own their layout; cards own their data.** Each card calls `useResource` with one `services/api.ts` function and renders its skeleton, error or content. `HomeScreen` only arranges cards (a mobile stack, and two columns from `lg`). The budget card and the category card share no state; each request is cheap.
- **Charts data:**
  - Início calls `getCharts({ period: "month" })`;
  - Gastos do mês reads `periodo` and `offset` from `useSearchParams`, maps `semanal|mensal|anual` to `week|month|year`, and clamps `offset` to −520..0;
  - the `Segmented` control and the navigator write back to the URL with `replace` for offset changes and `push` for period changes.
- **Donut:**
  - an SVG of 160 px (120 px in the home card) with one `<circle>` per non-zero category;
  - `stroke-dasharray` uses lengths from the integer cents ratio and a 2 px gap; the stroke color is a token class;
  - `aria-hidden`; the legend is the accessible data.
- **Percent math:** `sharePercents` multiplies integer cents by 100, divides with `Math.floor`, and hands the leftover points to the largest remainders (`(t × 100) % sum`). Every value stays an integer.
- **Chart-7:** validated with the dataviz skill's `validate_palette.js` against the existing six, in both themes, before use. If no hue passes, Compras falls back to `chart-other`, and the audit notes it.
- **Frontend TS Interfaces:** reuse `Balance`, `Budget`, `ReimbursementSummary`, `TransactionSummary`, `Charts` and `Period` from `types/api.ts`. New local types: `Resource<T>`, `PeriodParam = "semanal" | "mensal" | "anual"`.
- **Database Schema:** no change.

## Test Strategy

- `dates.ts` and `charts.ts` self-checks run with `node --experimental-strip-types` during the audit:
  - short dates and month names for all 12 months;
  - week labels inside a month, across a month and across a year;
  - the greeting at 4:59, 5:00, 11:59, 12:00, 17:59 and 18:00 Brasília, from UTC instants;
  - percent sums equal to 100 for random cents lists, plus ties, a single category and "<1%".
- Runtime with the seeded API (Playwright):
  - every AC on both screens, with numbers compared to the API responses;
  - period navigation to the seeded empty month (offset −9) shows "Nenhum dado encontrado";
  - category rows expand to items whose amounts sum to the category total;
  - hide values masks every amount;
  - one endpoint forced to fail shows that card's error while the rest render.
- Layout scan at 360, 390, 768 and 1280 in both themes, with zero issues, plus screenshots compared with the prototype captures.
- Copy scan and `npm run build`.

## Risks & Edge Cases

- **Render cold start:** the first requests can take tens of seconds, so skeletons must not shift the layout when data arrives.
- **Over budget:** `used_percent` > 100 and a negative `remaining_cents`.
- **Long values:** long descriptions and friend names truncate; amounts up to R$ 10.000.000.000,00 must not wrap or overlap at 360 px.
- **A single category, or a category with 100%:** the donut draws a full ring without a gap.
- **Week labels** near the year end, e.g. 29 Dec 2025 to 4 Jan 2026.
