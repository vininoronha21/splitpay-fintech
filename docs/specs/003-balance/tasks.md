# 003 Balance — Tasks

- [ ] T1 — Brasília time in schema defaults and seed | owner: data-engineer | files: `backend/sql/schema.sql`, `backend/sql/seed.sql` | verify: `pytest tests/test_db.py` passes
- [ ] T2 — Schemas, balance service and domain error | owner: backend-engineer | files: `backend/app/schemas.py`, `backend/app/services/__init__.py`, `backend/app/services/balance.py`, `backend/app/main.py` | verify: `pytest` passes
- [ ] T3 — Profile and balance routers with tests | owner: backend-engineer | files: `backend/app/routers/profile.py`, `backend/app/routers/balance.py`, `backend/app/main.py`, `backend/tests/test_profile.py`, `backend/tests/test_balance.py` | verify: `pytest tests/test_profile.py tests/test_balance.py` passes
- [ ] T4 — Docs sync | owner: main session | files: `docs/context.md`, `docs/development/repository-structure.md` | verify: open questions on timezone and timestamps closed
- [ ] T5 — Audit | owner: auditor | files: `docs/specs/003-balance/audit.md` | verify: verdict PASS
