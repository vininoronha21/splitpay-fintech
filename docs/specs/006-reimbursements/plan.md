# 006 Reimbursements — Plan

Status: draft

## Files to Create/Modify

- `backend/sql/schema.sql`: `split_share.settled_on` → `settled_at` with `datetime(settled_at) IS settled_at` and the `(status = 'em_aberto') = (settled_at IS NULL)` check; a trigger rejecting `settled_at` before the transaction's `created_at`.
- `backend/sql/seed.sql`: seeded settlements get a daytime time on their day, capped at now and never before the expense's `created_at` (same approach as the seeded `created_at`).
- `backend/sql/checks.sql`: settlement not in the future and not before the expense.
- `backend/app/services/balance.py`: history counts `pago` shares by `settled_at <= r.created_at`; current balance unchanged.
- `backend/app/services/transactions.py`: read `date(settled_at) AS settled_on`; optional status filter in `list_transactions`.
- `backend/app/services/reimbursements.py` (new): `settle_share`, `list_reimbursements`, `reimbursement_summary`.
- `backend/app/routers/reimbursements.py` (new); `backend/app/routers/transactions.py`: `status` query; `backend/app/main.py`: register the router.
- `backend/app/schemas/reimbursements.py` (new): `SettleRequest`, `Reimbursement`, `ReimbursementSummary`, `PersonOpen`.
- `backend/tests/test_reimbursements.py` (new); `test_db.py`, `test_balance.py`, `test_transactions.py` updated for the column rename and the filter.
- `docs/context.md`: Business Rule 20 (settlement is now and final); close the 006 Open Questions. `docs/development/repository-structure.md`: annotate the new modules.

## Architectural & Tech Decisions

- **Atomic transition:** `UPDATE split_share SET status = ?, settled_at = datetime('now', '-3 hours') WHERE transaction_id = ? AND status = 'em_aberto'` inside `BEGIN IMMEDIATE`. When no row changed, a lookup tells `404` (no share) from `409` (already closed). The condition in the `UPDATE` itself is what makes AC6 hold.
- **Status filter:** a `Literal["em_aberto", "pago", "acertado"]` query parameter; SQL uses `? IS NULL OR s.status = ?` so one parameterized query serves both cases.
- **Summary:** one `GROUP BY person` query over `em_aberto` shares; totals in SQL with integer sums.
- **Frontend TS Interfaces:** none yet (phase 2 mirrors `schemas/reimbursements.py`).
- **Database Schema:** the `settled_at` change above; DB is rebuilt on start, so no migration.

## Test Strategy

- `test_reimbursements.py`: each AC through the API; `pago` moves `/balance` by the share and `/budget` not at all; `acertado` moves neither; 404/409/422 codes; list and summary match an independent sum over the seed; AC5 with an adjustment created before the settlement on the same day; AC6 with `parallel_requests`.
- `test_db.py`: schema rejects a future or pre-expense `settled_at`, and `settled_at` without a closed status; `checks.sql` returns zero rows.
- Existing balance history tests stay green after the rename.

## Risks & Edge Cases

- Renaming the column touches 004 queries and tests; the full suite must stay green before the new endpoints land (T1 is a no-behavior-change step).
- A seeded settlement on today's date must not be later than the server's "now": capped with `min(..., datetime('now', '-3 hours'))`, as done for `created_at`.
