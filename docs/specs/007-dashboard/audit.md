# 007 Dashboard — Audit Report

Auditor: `auditor` agent | Date: 2026-10-20 (Brasília) | Branch: `feature/mvp-plan` | Commits audited: `7ab8825..b2911a0` (`5e6950d` feat(api) period bounds, `c26c8f2` feat(api) charts endpoint, `b2911a0` docs). The `frontend/`, `sql/` and pre-existing `tests/` diffs are empty.

Runtime: Python 3.13.16, `.venv` from `backend/`.

## Evidence Gathered

| # | Check | Command / method | Result |
| --- | --- | --- | --- |
| E1 | Test suite | `cd backend && .venv/bin/pytest -q` | **737 passed** (671 at `7ab8825`), 1 unrelated httpx deprecation warning. Each commit is green on its own (`git archive` of each commit, then its own suite): `5e6950d` 691, `c26c8f2` 737. |
| E2 | Old tests against new code | The 671 tests from `7ab8825` run against `HEAD` `app/` + `sql/` | **671 passed**. The only test change is the new `tests/test_dashboard.py`. |
| E3 | `period_bounds` vs an independent implementation | `bounds.py`: weeks from `date.fromisocalendar` (ISO week, Monday 1), months from a precomputed chain of first-of-month dates (end = next start − 1 day), years from `date(y+1,1,1) − 1 day`. Every day from 2016-01-01 to 2030-12-31 (leap years 2016, 2020, 2024, 2028) × every offset 0..−520 × 3 periods | **8,563,677 comparisons, 0 differences.** For offset 0 every period contains today, every week starts on Monday and lasts 7 days. Consecutive offsets tile with no gap or overlap (checked down to −520 from 29 Feb 2024, 20 Oct 2026, 31 Dec 2028). |
| E4 | Brasília today, not the server clock | `brt.py`: `app.services.datetime.now` patched to fixed UTC instants, run under server `TZ=UTC`, `Pacific/Kiritimati` (UTC+14) and `Pacific/Pago_Pago` (UTC−11). 26 instants: month end (01:30 and 02:59:59 UTC on 1 Nov = 31 Oct in Brasília, 03:00:00 = 1 Nov), year end, Monday 00:30–02:59:59 UTC (= Sunday evening in Brasília), 29 Feb 2028, and 22:00–23:59 Brasília every 7 minutes on Sunday 31 May 2026 | **0 failures** under all three TZs: week, month and year bounds follow the Brasília date, `/budget`'s `month` agrees, and month offset 0 equals `/budget` `spent_cents` at every instant. Live server too (E6). |
| E5 | Acceptance probe (TestClient, scratch DB) | `probe.py`: 60 weeks, 15 months and 4 years back, each compared with an independent Python computation from the raw tables; then tie/accent fixtures; then 422 cases and OpenAPI | **1499 assertions, 0 failures.** Details in Section 1. |
| E6 | Live server | `uvicorn` on `127.0.0.1:41513`, PID 14973, `TZ=Pacific/Kiritimati` (server date 2026-10-21, Brasília date 2026-10-20), scratch DB | Week `2026-10-19..2026-10-25` (37113), month `2026-10-01..2026-10-31` (222652, equal to `/budget` `spent_cents`), year 2026 (2684791). Month −9 (`2026-01`) and year −2 (2024) → `total_cents: 0` and empty lists. `offset=1` and a missing `period` → 422 with the standard body. Stopped with `kill 14973` (graceful shutdown in the log, no `Traceback`). |
| E7 | Empty period and money across seed start times | `seedsim.py`: `seed_at()` from `tests/test_db.py` at 1220 instants (every 3rd day of 2026–2027 × 00:00:00, 08:30, 20:59:59, 21:00, 23:59:59 Brasília), service called with that Brasília date | **0 failures.** At every instant: `checks.sql` returns 0 rows, year −2 and month −13 are empty, month **−9 is empty** (the seeded gap inside the 12-month window), week/month/year offset 0 each have spending, month offset 0 equals `get_budget`, and all 14 month totals equal an independent own-share sum. |
| E8 | Mutations (scratch copy, `test_dashboard.py` + `test_budget.py`) | One change at a time in `services/dashboard.py` | **Caught:** Sunday weeks; full amount instead of own share; incomes included; uncategorized-last rule removed; friend total from own share; half-open end; exclusive start; year ending 30 Dec. **Survived (77 pass):** person names sorted without `normalize_text` (**m2**); category names sorted without `normalize_text` (**m2**); `brasilia_today()` → `date.today()` (**m3**); items tie-broken by `id ASC` (n1); person tie-break by `-person_id` (n1). |
| E9 | `checks.sql` | All 13 named checks on the live DB (E6), plus `integrity_check` and `foreign_key_check`; also at 1220 seed instants (E7) | **0 rows** for every check, `integrity_check` ok, `foreign_key_check` empty. (One synthetic row I inserted by hand in E5 with `split_mode='fixed'` and share 0 was flagged by `share_matches_split_mode`: that is the check working on probe data, not product data.) |
| E10 | Static checks | grep and reading of the diff | The only query is the constant `EXPENSES_SQL` with two `?` placeholders (`services/dashboard.py:23-40`, executed at `:81`). There is no f-string, `.format` or `%` SQL. `services/` imports nothing from FastAPI or Starlette, and the router has no SQL. There is no `float` or `round(` in the new code, and every money field is `StrictInt`. `services/dashboard.py` is 123 lines. |

## 1. Spec Compliance

- [x] **AC1: Pass.**
  - `GET /dashboard/charts?period=week|month|year&offset=N` returns exactly `period, start, end, total_cents, by_category, by_person`. `start`/`end` are inclusive ISO dates and equal `period_bounds(period, offset, brasilia_today())` (E3, E4, E5). `offset` defaults to 0.
  - 422 `validation_error` ("Dados inválidos na requisição."), always the exact standard body, for: no params, `offset` only, `Week`, `"week "`, `semana`, `period=`, `period=null`, a bare `period`, `period[]=week`, `offset=1`, `−521`, `2.0`, `1e0`, `true`, ±2⁶³, `--1`, `+1`.
  - `offset=-0`, `offset=%200` and an extra `foo=1` → 200, and a repeated `period` uses the last value (n3).
- [x] **AC2: Pass.** Monday to Sunday weeks, calendar months and years, over 15 years of days and every allowed offset (E3). 31 Jan − 1 month = December and 31 Mar − 1 month = February (plan risk), also pinned in `tests/test_dashboard.py:42-58`.
- [x] **AC3: Pass.** `total_cents` equals an independent Python own-share sum (`amount − share`) for 79 periods (E5) and 14 months at 1220 seed instants (E7). Incomes never count: 13 seeded incomes (3,790,000) plus an income added in a test year never appear in totals or items.
- [x] **AC4: Pass, with m1.** `by_category` totals equal an independent grouping and sum to `total_cents`. Names come from `category`, `null` → `"Sem categoria"`. The order is total descending, then name ignoring case and accents (`Álcool` 401 before `Bebidas` 401). One deviation from the written rule: on a tie, "Sem categoria" goes **after** a category whose name sorts later (`Zeta` 400 before `Sem categoria` 400), from `is_uncategorized` in `services/dashboard.py:63-71`, pinned by `tests/test_dashboard.py:193`. See m1.
- [x] **AC5: Pass.** Each category's `items` equal, field for field, an independent list sorted `occurred_on DESC, id DESC`, and sum to the category total (E5). Only the four contract fields are present.
- [x] **AC6: Pass.** `by_person` equals the independent sum of friend shares for `em_aberto`, `pago` and `acertado` alike. Settling a share as `acertado` leaves it unchanged (`tests/test_dashboard.py:225`). The order is total descending, then accent- and case-insensitive name: `abel`, `Ágata`, `Bruno`, `Zé` at 300 each (E5). The behavior is right, but the accent part is not pinned by a test (m2).
- [x] **AC7: Pass.** Empty periods return `200`, `total_cents: 0`, `[]`, `[]`. In today's seed, weeks −4, −8, −17…, month −9 and years −2, −3 are empty. At all 1220 seed instants month −9 and year −2 are still empty (E7), so the "Nenhum dado encontrado" demo is reachable whenever the API starts.
- [x] **AC8: Pass.** Month offset 0 = `/budget` `spent_cents` (222652 on the live server; also at every simulated instant in E4 and E7, including 22:00–23:59 Brasília on a month end).
- [x] **AC9: Pass.** `/dashboard/charts` documents `422` with `ErrorResponse` and the description "Error codes: validation_error.". `period` is a required enum `week|month|year`, and `offset` has `minimum −520`, `maximum 0`. There is no `HTTPValidationError` anywhere in the OpenAPI document.

**Data Rules: Pass.** The own share is computed in SQL as `amount_cents − coalesce(share_cents, 0)`. The bounds come from `brasilia_today()` in Python and are passed as two `?` parameters to one query. Totals are integer SQL values summed in Python.

## 2. Security & Data Consistency

- [x] **Parameterized SQL** (E10). The single query is a constant string.
- [x] **Money.** Integer cents end to end, `StrictInt` on every amount, and every total cross-checked against an independent computation (E5, E7). A new split expense of 10001 moves the week, its category by 5001 and Ana by 5000 (`tests/test_dashboard.py:254`).
- [x] **Data consistency.** `checks.sql` returns 0 rows on fresh DBs at 1220 start times and on the live DB (E7, E9). The feature is read-only and changes no schema or seed.
- [x] **Errors.** The standard error shape with pt-BR messages. 405 on `POST /dashboard/charts` and 404 on `GET /dashboard` also use it. No stack traces leak.
- [x] **Strict 1-to-1.** `by_person` reads the single `split_share` row per expense. There is no group logic and nothing about what the user owes.

## 3. Structural & Stack Rules

- [x] **Layers.** The router parses `period`/`offset` and returns `Charts`. The service holds the period math and the SQL and imports nothing from FastAPI. `period_bounds` is pure.
- [x] **Files.** The new files are the ones in the plan, annotated in `repository-structure.md` (`b2911a0`). There are no new dependencies or directories.
- [x] **Docs.** Business Rule 9 records Monday weeks, the week-start Open Question is closed, and Current State marks Phase 1 complete (`docs/context.md`).
- [x] **Scope.** There is no combined `/dashboard` endpoint (404), no incomes chart, no chart of the full amount or of what the user owes, no date or range parameter, and no frontend change.
- [x] **TypeScript.** Not applicable: no frontend changes.
- [x] **Process.** The spec and plan were approved (`7ab8825`) before product code. Commits are conventional with scopes and one logical change each. No `.db`, `.env` or `node_modules` is tracked.

## Findings

### Blocker

None.

### Major

None.

### Minor

- **m1. "Sem categoria" ties are ordered by a rule the spec does not state.**
  - AC4 says "largest first, then by name", and the plan says "totals descending, then `normalize_text(name)`, then id". The code adds `is_uncategorized` before the name (`backend/app/services/dashboard.py:63-71`), so among equal totals "Sem categoria" always goes last (`Zeta` 400 is listed before `Sem categoria` 400, E5).
  - The choice is sensible (an "other" bucket usually goes last) and it is tested, but the presentation would be repeating a rule that exists only in code.
  - **Fix (docs only):** add one sentence to AC4 or the Data Rules of `spec.md`, plus the plan's Sorting line: "among equal totals, 'Sem categoria' goes last."
- **m2. Accent-insensitive ordering is not pinned by a test.**
  - Replacing `normalize_text(...)` with the raw name, for people (`services/dashboard.py:121`) or for categories (`:69`), still passes all tests (E8). The seed has no tie between names that differ by accent or case. `test_categories_sorted_by_total_then_name` and `test_by_person_sums_friend_shares_any_status` only check the order that comes out.
  - AC6 names this rule explicitly ("ignoring case and accents"), and 006 pinned the same rule with a test.
  - **Fix:** in `test_dashboard.py`, add friends `Zeca`, `Álvaro` and `beto` with equal shares in one period, and two categories such as `Álcool`/`Bebidas` with equal totals. Assert the order `Álvaro, beto, Zeca` and `Álcool, Bebidas`.
- **m3. "Brasília today, not the server clock" is not pinned by a test.**
  - The plan's first risk. Replacing `brasilia_today()` with `date.today()` (`services/dashboard.py:80`) passes all tests (E8), because the suite only differs from the server date between 21:00 and 23:59 Brasília. The code is correct (E4, E6).
  - **Fix:** a test that monkeypatches `app.services.datetime` (or `app.services.dashboard.brasilia_today`) to a UTC instant such as `2026-11-01 01:30` (31 Oct, 22:30 in Brasília). Assert month offset 0 is October and week offset 0 is still the week of 31 Oct.

### Informational

- **n1. Id tie-breaks are not pinned.** Items on the same day (`ORDER BY ... t.id DESC`, `services/dashboard.py:39`) and friends with the same total and name (`person_id`) can flip without a failing test (E8). The spec only asks for "newest first", so this is not a defect. It is deterministic, as the plan wants.
- **n2. A friend with a 0 share appears with `total_cents: 0`.** A `percentage` split at 0% (allowed by Business Rule 7) puts the friend in `by_person` with 0. This matches AC6 ("each friend with split expenses"), but the frontend should skip zero slices in the pie. No action in the API.
- **n3. Lax query parsing.** `offset=-0` and `offset=%200` are read as 0, and a repeated `period` takes the last value. This is the same Pydantic/FastAPI behavior as the other endpoints (006 n4, n6). No action.
- **n4. The empty-month loop in `test_empty_period_returns_zero_and_empty_lists` is always true.** `range(0, -14, -1)` includes month −13, which is always older than the 12-month seed. The real seeded gap is month −9, empty at all 1220 simulated start times (E7). Year −2 (also asserted) is empty by construction. AC7 holds. If the demo is meant to show an empty month *inside* the seeded year, `range(0, -12, -1)` would pin that.

## Verdict

**PASS**

All nine acceptance criteria, the Data Rules and the Out of Scope list hold under real requests. The evidence is 737 passing tests (each commit green, the old suite unchanged and green), `period_bounds` identical to an independent implementation on 8.5 million day × offset × period cases, Brasília dates under three server timezones and late-evening instants, totals, categories, items and people equal to independent sums for 79 periods and 1220 seed start times, and month offset 0 equal to `/budget`. The empty period stays reachable at every start time, and `checks.sql` returns zero rows. SQL is parameterized, the layers are clean, and money is integer cents. m1 is a one-sentence spec gap, and m2 and m3 are test gaps, not defects. Fix all three before 007 merges into `dev`.
