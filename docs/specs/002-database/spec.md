# 002 Database — Spec

Stories: foundation for US05, US01, US02, US03, US04 | Status: approved

## Problem

The API has no data. Every user story needs one relational model, demo data that looks real in pt-BR, and a way to prove the data is consistent. The database must be rebuilt on every start (free-tier ephemeral disk, Business Rules 10 and 17).

This feature also closes the backend minor findings carried over from the `001-restructure` audit.

## Acceptance Criteria

1. On startup the API deletes any previous database file and rebuilds it from `backend/sql/schema.sql` and `backend/sql/seed.sql`. The path comes from `DATABASE_PATH` (default `splitpay.db` inside `backend/`).
2. Every connection runs `PRAGMA foreign_keys = ON` and returns rows addressable by column name.
3. Constraints reject invalid data. Each case below is a pytest that expects `sqlite3.IntegrityError`:
   - amount ≤ 0; type other than `expense`/`income`;
   - a second `split_share` for the same transaction (1-to-1);
   - a friend share larger than the transaction amount, or negative;
   - a split on an `income` transaction;
   - status other than `em_aberto`/`pago`/`acertado`;
   - installment `4/3`, `0/3`, or only one of the two fields set;
   - percentage outside 0–100, or a percentage on a non-percentage split;
   - balance adjustment with delta 0 or a reason shorter than 10 characters;
   - initial balance or monthly budget below 0;
   - a foreign key that does not resolve.
4. `backend/sql/checks.sql` returns zero rows on the seed. Each query targets one invariant from `context.md` and the split rules (Business Rule 7).
5. The seed is pt-BR and internally consistent:
   - one profile (`Usuário`, initial balance R$ 2.500,00, budget R$ 3.000,00);
   - 8 friends, the 8 categories of the reference screen, and default keyword rules including "janta" → Alimentação, "combustível" → Transporte, "uber" → Transporte;
   - expenses with and without splits in all three modes, incomes, installments, every reimbursement status, and at least one balance adjustment;
   - all dates are **relative to the day the API starts**, covering the current week, month and year. Any period older than 12 months is empty.
6. The seed's computed balance (initial + incomes + shares `pago` − expenses + adjustments) is positive.
7. Tests run on a fresh database per test (temporary file).
8. Carried over from the 001 audit: a 500 response carries the CORS header (test added); `HealthResponse.status` is `Literal["ok"]`; `starlette` is pinned; `VITE_API_URL` is optional in `vite-env.d.ts`.

## Data Rules

- Money is `INTEGER` cents. Dates are ISO `YYYY-MM-DD` text, timestamps ISO 8601 text.
- Only the friend's share is stored (`split_share.share_cents`). The user's share is always `amount_cents − share_cents` (Business Rule 7), so the two always sum to the total.
- `UNIQUE (transaction_id)` on `split_share` is what enforces 1-to-1. Group splits later drop that constraint; the table shape stays.
- Balance is never stored: initial balance + incomes + shares `pago` − expenses + Σ adjustment deltas.
- `settled_on` is set when a share leaves `em_aberto`, and empty while it is open.

## API Contract

No new endpoints. `GET /health` is unchanged.

## Out of Scope

- Any user story endpoint (003 onwards).
- Migrations, ORM, persistent volumes.
- Multi-person splits, accounts per visitor.

## Decisions

| Decision | Why | Rejected |
| --- | --- | --- |
| Seed dates relative to startup (`date('now', '-3 days')`) | The demo always has data in "this week/month/year", whatever day it is presented. | Fixed dates: the dashboard would be empty a few weeks later. |
| Store only the friend's share | The user's share is derived, so the sum rule holds by construction. | Two rows per transaction (user + friend): needs a "self" person and a sum check. |
| Table name `transactions` (plural) | `TRANSACTION` is an SQL keyword. | Quoting `"transaction"` in every query. |
| A file database deleted on start | One connection per request works with plain `sqlite3`; deleting it gives the same "always the seed" behavior as memory. | `:memory:`: each connection would see an empty database. |
| Connection per request through a FastAPI dependency | Simple, thread-safe with SQLite, easy to swap for a temp file in tests. | One global connection shared across threads. |
| Enum values stored as text with `CHECK` | Readable in SQL and Swagger, validated by the database itself. | Lookup tables for each enum. |
