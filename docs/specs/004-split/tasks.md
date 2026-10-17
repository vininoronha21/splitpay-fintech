# 004 Split — Tasks

- [x] T1 — Split math as pure functions | owner: backend-engineer | files: `backend/app/services/transactions.py`, `backend/tests/test_split.py` | verify: `pytest tests/test_split.py` passes
- [x] T2 — Shared schemas: visible text, error response, Brasília today | owner: backend-engineer | files: `backend/app/schemas.py`, `backend/app/services/__init__.py`, `backend/app/routers/profile.py`, `backend/app/routers/balance.py` | verify: `pytest` passes; Swagger shows `ErrorResponse` on 003 endpoints
- [x] T3 — Friends endpoints | owner: backend-engineer | files: `backend/app/services/friends.py`, `backend/app/routers/friends.py`, `backend/app/main.py`, `backend/tests/test_friends.py` | verify: `pytest tests/test_friends.py` passes
- [x] T4 — Transaction endpoints with 1-to-1 split | owner: backend-engineer | files: `backend/app/services/transactions.py`, `backend/app/routers/transactions.py`, `backend/app/schemas.py`, `backend/app/main.py`, `backend/tests/test_transactions.py` | verify: `pytest tests/test_transactions.py` passes
- [x] T5 — Budget usage | owner: backend-engineer | files: `backend/app/services/balance.py`, `backend/app/routers/balance.py`, `backend/app/schemas.py`, `backend/tests/test_budget.py` | verify: `pytest tests/test_budget.py` passes
- [x] T6 — Docs sync | owner: main session | files: `docs/development/repository-structure.md`, `docs/context.md` | verify: new files listed; carried questions closed
- [x] T7 — Audit | owner: auditor | files: `docs/specs/004-split/audit.md` | verify: verdict PASS
