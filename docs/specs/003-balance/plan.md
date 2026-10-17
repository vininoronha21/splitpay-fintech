# 003 Balance — Plan

Status: draft

## Files to Create/Modify

- `backend/sql/schema.sql`: `created_at` defaults use `datetime('now', '-3 hours')`.
- `backend/sql/seed.sql`: every `'now'` becomes `'now', '-3 hours'` (same relative layout).
- `backend/app/schemas.py` (new): `Profile`, `ProfileUpdate`, `Balance`, `AdjustmentCreate`, `Adjustment`.
- `backend/app/services/__init__.py`, `backend/app/services/balance.py` (new): `get_profile`, `set_initial_balance`, `get_balance`, `list_adjustments`, `create_adjustment`. One raised domain error `NoChangeError`.
- `backend/app/routers/profile.py`, `backend/app/routers/balance.py` (new): HTTP only.
- `backend/app/main.py`: register both routers; map `NoChangeError` to `422 no_change` through a small `DomainError` handler (code + pt-BR message), reused by later features.
- `backend/tests/test_profile.py`, `backend/tests/test_balance.py` (new).
- `docs/context.md`: close the timezone and timestamp open questions.
- `docs/development/repository-structure.md`: note that profile rules live in `services/balance.py`.

## Architectural & Tech Decisions

- **Balance query:** one `SELECT` with scalar subqueries for each part, so the formula reads like Business Rule 3.
- **History query:** a window function (`SUM(...) OVER (ORDER BY created_at, id)`) over adjustments, plus the movement totals dated on or before each adjustment's date. SQLite 3.25+ supports window functions.
- **Write safety:** `create_adjustment` reads the current balance and inserts the delta inside one transaction (`BEGIN IMMEDIATE`), so two visitors adjusting at once cannot both compute from the same old balance.
- **Errors:** `DomainError(code, message, status=422)` in `services/` keeps services free of FastAPI imports (layer rule); `main.py` turns it into the standard error shape.
- **Frontend TS Interfaces:** none in this feature (phase 2 mirrors `schemas.py`).

## Test Strategy

- Balance formula against an independent sum over the seed rows.
- `PATCH /profile`: 0 accepted; −1, 10.5, `"1000"`, missing field rejected; balance changes by the same amount.
- Adjustments: delta = target − current; reason trimmed, 9 and 201 characters rejected; `no_change`; negative target accepted; history newest first; previous/new consistent (`new − previous = delta`) and the newest entry's new balance equals `GET /balance`.
- Seed dates: the newest seeded row is not after Brasília "today".

## Risks & Edge Cases

- A movement dated today but entered after an adjustment counts in that adjustment's "new balance" because history works by date, not by time. Accepted and documented: transactions only have a date.
- Changing the initial balance after adjustments shifts every historical previous/new balance by the same amount. That is consistent with "computed, never stored" (Business Rule 3).
