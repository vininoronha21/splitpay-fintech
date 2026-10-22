# 009 Home — Spec

Stories: US05 (balance and budget on screen), US04 (charts) | Status: approved

## Problem

After 008 the user logs in and lands on an empty "Início". The API already returns the balance, the monthly budget, what friends owe, the latest transactions and the chart data. This spec turns those into the two screens Vinicius approved in the prototype:

- **Início** (`docs/assets/prototype-home.png`, `prototype-home-desktop.png`, dark: `prototype-home-dark.png`): the key numbers above the fold, in the Nubank/PicPay pattern.
- **Gastos do mês** (`prototype-monthly-spending.png`): the US04 charts, with period filters and the items behind each category.

## Acceptance Criteria

1. **Header (Início, mobile):**
   - an amber block with the user's initials, a greeting and the balance;
   - the greeting follows the Brasília hour ("Bom dia" 5:00 to 11:59, "Boa tarde" 12:00 to 17:59, "Boa noite" otherwise) plus the saved name;
   - "Saldo disponível" shows `balance_cents` from `GET /balance`, with the eye button beside it.
2. **Quick actions** (below `md` only; from `md` the top nav already has "Novo gasto"):
   - Novo gasto → `/novo-gasto`;
   - Receita → `/novo-gasto?tipo=receita`;
   - Reembolsos → `/extrato?status=em_aberto`;
   - Amigos → `/amigos`.

   010 and 011 read those query parameters; until they land, the links open the placeholder screens.
3. **Budget card** from `GET /budget`:
   - title "Orçamento de {mês}" (month name in pt-BR, lowercase, from `month`);
   - `spent_cents` "de" `budget_cents`, a progress bar and "{used_percent}% usado";
   - "Restam {remaining}", or "Passou {abs(remaining)}" in danger when `remaining_cents < 0`;
   - the bar is capped at 100% wide and turns danger when over budget;
   - the card links to `/gastos-do-mes`.
4. **"A receber de amigos" card** from `GET /reimbursements/summary`:
   - `open_cents` plus a count line: "1 reembolso em aberto", "N reembolsos em aberto" or "Nenhum reembolso em aberto";
   - it links to `/extrato?status=em_aberto`.
5. **"Gastos por categoria" card** from `GET /dashboard/charts?period=month`:
   - mobile: a stacked bar of every category plus the three largest as rows (swatch, name, percent, amount), with "Ver tudo" → `/gastos-do-mes`;
   - from `md`: a donut with the total in the center and every category in a two-column legend, with "Ver detalhes" → `/gastos-do-mes`;
   - an empty month shows "Nenhum gasto neste mês".
6. **"Últimos lançamentos" card** from `GET /transactions`:
   - the newest three (four from `md`), each row with:
     - an icon (wallet for expenses, arrow-down for incomes) or the friend's avatar when the expense is split;
     - the description (truncated);
     - a meta line: the category, or "Com {friend}", then the short date, e.g. "Transporte, 20 out" or "Com Ana Lima, 20 out";
     - the signed amount: expenses `−R$` in `text`, incomes `+R$` in `success`;
   - from `md`, split rows also show their status pill;
   - "Ver extrato" → `/extrato`;
   - empty: "Nenhum lançamento ainda" with a "Novo gasto" action.
7. **Desktop layout** (from `lg`), matching `prototype-home-desktop.png`:
   - a left column with the balance block, budget and "A receber";
   - a right column with categories (donut) and latest transactions;
   - key information fits a 1280 × 800 screen without scrolling.
8. **Gastos do mês screen** (`/gastos-do-mes`):
   - a back button to Início and a "Semanal / Mensal / Anual" segmented control;
   - a period navigator with previous and next buttons and a label;
     - labels: "Outubro de 2026", "19 a 25 de out" (or "29 de set a 5 de out" across months, with the year added when the week crosses a year) and "2026";
     - next is disabled at the current period, previous at offset −520;
   - period and offset live in the URL (`?periodo=semanal|mensal|anual&offset=-1`), so reload and back keep them; an invalid period falls back to Mensal and an invalid offset to the current period of the chosen type.
9. **Por categoria** (US04):
   - a donut of the user's own share by category, with the total in the center;
   - the note "Considera só a sua parte de cada despesa.";
   - a legend row per category (swatch, name, percent, amount); each row is a button (`aria-expanded`) that expands that category's items: description, short date and own share, newest first;
   - slices with a zero total are hidden.
10. **Parte dos amigos** (US04 by person):
    - the note "Quanto cada amigo assumiu nas despesas divididas em {período}.";
    - one row per friend: name, amount and a bar scaled to the largest total;
    - friends with a zero total are hidden.
11. **Empty period:** when `total_cents` is 0, both cards are replaced by one card that says "Nenhum dado encontrado" (US04 wording), with an icon and the same height range so the layout does not jump.
12. **States:**
    - every card loads its own data, with a skeleton while loading and an error card with "Tentar novamente" on failure, so one failing request never blanks the screen;
    - data is fetched again every time the screen opens.
13. **Hide values:** every amount on both screens goes through `Money`. Percentages, bars and slices stay visible.
14. **Layout safety, accessibility and copy:**
    - the 008 rules apply: no overlaps and no horizontal scroll at 360, 390, 768 and 1280 px in both themes;
    - 44 px targets, visible focus, `prefers-reduced-motion`;
    - pt-BR copy with no em or en dash, "·" or arrow characters;
    - the donut and bars are `aria-hidden` because the legend rows carry the same numbers as text.
15. `npm run build` passes with strict TypeScript.

## Data Rules

- **Money:** amounts are integer cents from the API, rendered with `formatBRL` through `Money`. The frontend never sums floats.
- **Percent per category:** integer percentages that sum to 100, by largest remainder on integer cents:
  - `floor(total × 100 / sum)` per category;
  - the leftover points go to the largest remainders, ties by list order;
  - a non-zero category that rounds to 0 shows "<1%".
- **Category colors** are fixed by category, never by rank:

  | Category | Token |
  | --- | --- |
  | Moradia | `chart-1` |
  | Educação | `chart-2` |
  | Alimentação | `chart-3` |
  | Transporte | `chart-4` |
  | Lazer | `chart-5` |
  | Saúde | `chart-6` |
  | Compras | `chart-7` (new) |
  | Outros, Sem categoria | `chart-other` (neutral) |

  The mapping uses the seeded category ids (`backend/sql/seed.sql`).
- **Dates:**
  - `occurred_on` is a Brasília calendar day; it is formatted from the string ("2026-10-20" → "20 out") and never through a `Date` in the browser's time zone;
  - the greeting hour is the device clock converted to UTC−3 (Business Rule 18).
- **Amount on rows:** expenses show the full amount paid (the balance view, Business Rule 5); charts and budget use the user's own share (Business Rule 16).

## API Contract

No backend change. Uses `GET /balance`, `/budget`, `/reimbursements/summary`, `/transactions`, `/dashboard/charts?period&offset`.

## Out of Scope

- Novo gasto, Receita and the reimbursement filter (010, 011).
- Transaction detail and tapping a row (011).
- Editing the budget (Business Rule 13), balance adjustments and friends (012).
- Animations beyond simple CSS transitions (GSAP is for the 013 landing page).

## Decisions

| Decision | Why | Rejected |
| --- | --- | --- |
| Hand-drawn SVG donut and CSS bars | Two simple charts. An SVG circle with `stroke-dasharray` is about 40 lines and uses the theme tokens directly. | A chart library (Recharts, Chart.js): a large dependency for two shapes, and its own theming. |
| One small `useResource` hook (load, error, retry) per card | Each card fails or loads on its own, and a screen refetches on open, so data is fresh after a new expense. | React Query or SWR: caching we do not need for a demo with shared data. One loader for the whole screen: one failed request would blank everything. |
| Period and offset in the URL | Reload, back and shared links keep the chosen period. | React state only: lost on reload and on back from a detail. |
| `chart-7` for Compras plus a neutral for Outros and Sem categoria | The seed has 8 categories plus "Sem categoria". Only 6 hues were validated; a seventh is validated with the same tool, and the two catch-all buckets share a gray because they mean "unclassified". | Generating extra hues: may break colorblind safety. Coloring by rank: a category would change color between periods. |
| Integer largest-remainder percentages | Rows always add up to 100% with no float math on money. | `Math.round` of a float ratio: rows can add up to 99% or 101%. |
