# 003 Balance — Spec

Stories: US05 | Status: draft

## Problem

US05 asks for a trustworthy balance: the user sets an initial balance, the app shows initial + inflows − outflows, and manual adjustments need a reason kept in history. The database already stores every movement (002); the API exposes none of it yet. This feature also settles two questions carried from the 002 audit: which timezone "today" uses, and how timestamps are written.

## Acceptance Criteria

1. `GET /profile` returns the profile: display name, initial balance and monthly budget, in cents.
2. `PATCH /profile` sets the initial balance (Business Rule 4). It accepts an integer ≥ 0, including 0. It rejects a negative value, a decimal, a string (even `"1000"`) and a missing field with `422 validation_error`.
3. `GET /balance` returns the balance and its parts: initial balance, incomes, reimbursements received (shares `pago`), expenses, adjustments. `balance = initial + incomes + reimbursements received − expenses + adjustments` (Business Rules 3 and 5), recomputed from rows on every request.
4. `POST /balance/adjustments` takes the desired new balance and a reason (Business Rule 12). The API stores `delta = new_balance − current_balance`.
   - The reason is trimmed and must have 10 to 200 characters, else `422 validation_error`.
   - If the new balance equals the current one, the response is `422` with code `no_change`.
   - The response is the created history entry (see AC5).
5. `GET /balance/adjustments` lists adjustments newest first. Each entry has date and time, delta, reason, previous balance and new balance. Previous and new balances are computed, never stored.
6. After `PATCH /profile` or `POST /balance/adjustments`, `GET /balance` reflects the change. Setting the initial balance does not create an adjustment.
7. All "today" and timestamp values use Brasília time (UTC−3), in the seed, the column defaults and the API.
8. Every endpoint appears in Swagger with request and response schemas.

## Data Rules

- Money in and out of the API is integer cents (`StrictInt`): JSON numbers only, no strings, no decimals.
- The new balance in an adjustment may be negative (a real account can be overdrawn); the initial balance may not.
- History balances: an adjustment's *new balance* is the balance counting every movement dated on or before the adjustment's date, plus all adjustments up to and including it (ordered by `created_at`, then `id`). *Previous balance* = new balance − delta. For the newest adjustment, the new balance equals `GET /balance` at the moment it was created.
- Movement dates: income and expense use `occurred_on`; a reimbursement uses `settled_on`; an adjustment uses the date of `created_at`.
- `created_at` is always written by the column default; the API never sends it.

## API Contract

| Method | Path | Request | Response | Errors |
| --- | --- | --- | --- | --- |
| GET | `/profile` | none | `200 {display_name, initial_balance_cents, monthly_budget_cents}` | none |
| PATCH | `/profile` | `{initial_balance_cents: int ≥ 0}` | `200` profile | `422 validation_error` |
| GET | `/balance` | none | `200 {initial_balance_cents, incomes_cents, reimbursements_received_cents, expenses_cents, adjustments_cents, balance_cents}` | none |
| GET | `/balance/adjustments` | none | `200 [{id, created_at, delta_cents, reason, previous_balance_cents, new_balance_cents}]` | none |
| POST | `/balance/adjustments` | `{new_balance_cents: int, reason: str}` | `201` history entry | `422 validation_error`, `422 no_change` |

## Out of Scope

- Changing the display name through the API: the fake login keeps it in `localStorage` only, because every visitor shares the same data (Business Rule 17).
- Editing or deleting adjustments: history is append-only.
- Monthly budget editing (Business Rule 13), transactions and splits (004), any frontend screen (phase 2).

## Decisions

| Decision | Why | Rejected |
| --- | --- | --- |
| Brasília time as a fixed UTC−3 offset (`'now', '-3 hours'`) | Brazil has had no daylight saving time since 2019, so one offset is exact and works the same in SQL and Python. | `'localtime'`: Render servers run in UTC. A timezone library: a dependency for a fixed offset. |
| `StrictInt` for money fields | Rejects `"1000"` and `10.5` instead of silently converting them, which is what US05's "non-numeric" criterion means. | Plain `int`: Pydantic would accept the string `"1000"`. |
| Profile logic lives in `services/balance.py` | The profile's only rule is the initial balance, which is part of the balance domain; a separate module would hold one query. | `services/profile.py`. |
| `no_change` instead of storing a zero delta | The schema forbids `delta = 0`, and a no-op adjustment adds noise to the history. | Silently returning the current balance. |
