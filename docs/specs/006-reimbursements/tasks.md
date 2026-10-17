# 006 Reimbursements — Tasks

- [x] T1 — Replace `settled_on` with `settled_at` (schema, seed, checks) | owner: data-engineer | files: `backend/sql/schema.sql`, `backend/sql/seed.sql`, `backend/sql/checks.sql`, `backend/tests/test_db.py` | verify: `checks.sql` returns zero rows; `pytest tests/test_db.py` passes
- [x] T2 — Services read the new column; history uses `settled_at` | owner: backend-engineer | files: `backend/app/services/balance.py`, `backend/app/services/transactions.py`, affected tests | verify: full `pytest` passes, API contract unchanged
- [x] T3 — Settle a share, list and summary | owner: backend-engineer | files: `backend/app/services/reimbursements.py`, `backend/app/routers/reimbursements.py`, `backend/app/schemas/reimbursements.py`, `backend/app/main.py`, `backend/tests/test_reimbursements.py` | verify: `pytest tests/test_reimbursements.py` passes
- [x] T4 — Status filter on `GET /transactions` | owner: backend-engineer | files: `backend/app/services/transactions.py`, `backend/app/routers/transactions.py`, `backend/tests/test_transactions.py` | verify: `pytest tests/test_transactions.py` passes
- [ ] T5 — Docs sync | owner: main session | files: `docs/context.md`, `docs/development/repository-structure.md` | verify: Rule 20 added; 006 questions closed
- [ ] T6 — Audit | owner: auditor | files: `docs/specs/006-reimbursements/audit.md` | verify: verdict PASS
