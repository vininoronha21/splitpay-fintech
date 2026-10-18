# 007 Dashboard — Spec

Stories: US04 | Status: draft

## Problem

US04 asks for pie and bar charts by category and by person, filtered by week, month or year. Clicking a category expands the items behind its value, and an empty period shows "Nenhum dado encontrado". The API has every transaction and share (004, 006), but nothing groups them by period, category or person. This feature closes Phase 1: after it, the frontend can draw every screen from the API.

It also closes the last Open Question in `context.md` (week start).

## Acceptance Criteria

1. `GET /dashboard/charts?period=week|month|year&offset=0` returns the chart data for one calendar period (Business Rule 9):
   - `offset=0` is the period containing Brasília today, `-1` the one before, and so on; the frontend's previous/next buttons change it by one.
   - The response carries `period`, `start` and `end` (inclusive dates), so the screen can label it ("13 a 19 de out.", "outubro de 2026", "2026").
   - `period` other than the three, a missing `period`, or an `offset` above 0 or below −520 → `422 validation_error`.
2. Weeks run Monday to Sunday (closes the Open Question). Months and years are calendar months and years.
3. `total_cents` is the user's own spending in the period: the user's share of every expense dated in it (Business Rule 16, the same number the budget counts for the current month). Incomes never count.
4. `by_category` lists each category with spending in the period (`category_id`, `category_name`, `total_cents`), largest first, then by name. An expense without a category is grouped as `category_id: null`, `category_name: "Sem categoria"`. The totals sum to `total_cents`.
5. Each category carries its `items` (`transaction_id`, `description`, `occurred_on`, `own_share_cents`), newest first, so clicking a slice needs no second request. The items sum to the category's total.
6. `by_person` lists each friend with split expenses in the period (`person_id`, `person_name`, `total_cents` = sum of that friend's shares, whatever their status), largest first, then by name ignoring case and accents.
7. A period with no expenses returns `total_cents: 0` and empty lists with `200`; the seed contains at least one such period reachable by navigation (e.g. the month with no seeded expenses, or two years back).
8. For `period=month&offset=0`, `total_cents` equals `GET /budget`'s `spent_cents`.
9. Swagger documents every error response with `ErrorResponse`.

## Data Rules

- Own share: `amount` for an unsplit expense, `amount − share` for a split one (004).
- Period bounds are computed from Brasília today in Python (`brasilia_today()`), then passed to one parameterized query as `start`/`end` dates.
- Integer cents only; every total is an SQL integer sum or a Python sum of integers.

## API Contract

| Method | Path | Request | Response | Errors |
| --- | --- | --- | --- | --- |
| GET | `/dashboard/charts` | query `period`, `offset?` (default 0) | `200 {period, start, end, total_cents, by_category: [{category_id, category_name, total_cents, items: [...]}], by_person: [{person_id, person_name, total_cents}]}` | `422 validation_error` |

## Out of Scope

- Charts of incomes, of the full amount paid, or of what the user owes.
- Custom date ranges or rolling windows (Business Rule 9).
- A combined dashboard endpoint: the dashboard cards already have `/balance`, `/budget` and `/reimbursements/summary`.
- Drawing the charts (phase 2, Recharts).

## Decisions

| Decision | Why | Rejected |
| --- | --- | --- |
| Week starts on Monday | Saturday and Sunday land in the same week, which is how people think about weekend spending; it is also ISO 8601. | Sunday: splits each weekend across two weeks. |
| `offset` instead of a date parameter | Previous/next is "minus one / plus one", with no date math in the frontend. | `?date=YYYY-MM-DD`: the frontend has to compute the previous week or month itself. |
| Category items inside the response | One request per period makes the click-to-expand instant, and the seed has under a hundred expenses. | A second endpoint per category: an extra loading state for every click. |
| No combined dashboard endpoint | The three summary endpoints already exist and are tested; joining them would duplicate their rules. | `GET /dashboard` with everything: a second place where balance and budget are computed. |
