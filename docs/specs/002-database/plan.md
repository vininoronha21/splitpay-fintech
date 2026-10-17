# 002 Database — Plan

Status: draft

## Files to Create/Modify

- `backend/sql/schema.sql` (new): tables below.
- `backend/sql/seed.sql` (new): pt-BR demo data with relative dates.
- `backend/sql/checks.sql` (new): one `SELECT` per invariant, each returning the offending rows.
- `backend/app/db.py` (new): `init_db(path)` (delete file, run schema + seed), `connect(path)` (foreign keys on, `sqlite3.Row`), `get_db()` dependency (one connection per request, closed after).
- `backend/app/config.py`: add `DATABASE_PATH`.
- `backend/app/main.py`: lifespan calls `init_db`; `create_app(database_path=None)` for tests; CORS header on 500 (audit minor 1).
- `backend/app/routers/health.py`: `Literal["ok"]` (audit minor 4).
- `backend/requirements.txt`: pin `starlette==1.8.0` (audit minor 5).
- `backend/.env.example`: add `DATABASE_PATH=splitpay.db`.
- `backend/tests/conftest.py`: fresh temp database per test, `db` and `client` fixtures.
- `backend/tests/test_db.py` (new): constraints, checks.sql, seed coverage, balance.
- `backend/tests/test_errors.py`: CORS header on 500.
- `frontend/src/vite-env.d.ts`: optional `VITE_API_URL` (audit minor 2).

All paths are already in `repository-structure.md`. No new dependency (stdlib `sqlite3`).

## Architectural & Tech Decisions

- **Database Schema:**

| Table | Columns (constraints) |
| --- | --- |
| `user_profile` | `id` PK `CHECK (id = 1)`, `display_name`, `initial_balance_cents ≥ 0`, `monthly_budget_cents ≥ 0` |
| `person` | `id` PK, `name` NOT NULL UNIQUE, 1–60 chars |
| `category` | `id` PK, `name` NOT NULL UNIQUE |
| `category_rule` | `id` PK, `keyword` NOT NULL UNIQUE (stored lowercase, without accents), `category_id` FK, `is_default` 0/1 |
| `transactions` | `id` PK, `type` (`expense`/`income`), `description` 1–120 chars, `amount_cents > 0`, `category_id` FK nullable, `occurred_on` date, `place`, `payment_method` (`pix`/`debito`/`credito`/`dinheiro`) nullable, `installment_number` + `installment_total` (both null or `1 ≤ n ≤ total`), `notes` ≤ 500 chars, `split_mode` (`equal`/`percentage`/`fixed`) nullable and null for income, `split_percent` 0–100 only when `percentage`, `created_at` |
| `split_share` | `id` PK, `transaction_id` FK UNIQUE `ON DELETE CASCADE`, `person_id` FK, `share_cents` 0–amount, `status` (`em_aberto`/`pago`/`acertado`), `settled_on` nullable |
| `balance_adjustment` | `id` PK, `delta_cents ≠ 0`, `reason` 10–200 chars, `created_at` |

  Rules that span two tables (share ≤ amount, no split on income) are enforced by `BEFORE INSERT/UPDATE` triggers on `split_share`, and also listed in `checks.sql`.
- **checks.sql invariants:** a split transaction has exactly one share and a non-split one has none; share ≤ amount; the share matches the mode (equal = floor(amount / 2), percentage = floor(amount × pct / 100)); `settled_on` is set if and only if status ≠ `em_aberto`; no income transaction has a split share; dates parse; the profile row exists.
- **Accent-insensitive keywords:** stored normalized (lowercase, no accents) so matching in 005 is a plain comparison; the seed writes them that way.
- **Frontend TS Interfaces:** none beyond the `vite-env.d.ts` fix.

## Test Strategy

- `test_db.py`: one test per constraint in AC3; `checks.sql` returns zero rows; the seed covers current week/month/year and nothing older than 12 months; every status and split mode appears; the computed balance is positive.
- `test_errors.py`: the 500 response has `access-control-allow-origin`.
- `npm run build` for the frontend type fix.

## Risks & Edge Cases

- Relative dates near a month boundary: on the 1st of a month, "current month" seed rows must still exist. The seed places rows at `-0`, `-1`, `-2` days and at `start of month`, so each calendar period has data on any day.
- Deleting the file while a worker is running: only done at startup, before requests.
- SQLite version: `sqlite3.sqlite_version` is 3.45 here; triggers, `CHECK` and `date()` modifiers used are available since 3.x long ago.
