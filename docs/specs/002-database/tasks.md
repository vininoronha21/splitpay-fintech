# 002 Database — Tasks

- [x] T1 — Schema with constraints and triggers | owner: data-engineer | files: `backend/sql/schema.sql` | verify: schema loads in a fresh `sqlite3` connection
- [x] T2 — pt-BR seed with relative dates | owner: data-engineer | files: `backend/sql/seed.sql` | verify: seed loads after the schema without errors
- [x] T3 — Consistency queries | owner: data-engineer | files: `backend/sql/checks.sql` | verify: every query returns zero rows on the seed
- [x] T4 — DB init, connection dependency and test fixtures | owner: backend-engineer | files: `backend/app/db.py`, `backend/app/config.py`, `backend/app/main.py`, `backend/.env.example`, `backend/tests/conftest.py`, `backend/tests/test_db.py` | verify: `pytest` passes
- [x] T5 — 001 audit carry-overs | owner: backend-engineer, frontend-engineer | files: `backend/app/main.py`, `backend/app/routers/health.py`, `backend/requirements.txt`, `backend/tests/test_errors.py`, `frontend/src/vite-env.d.ts` | verify: `pytest` and `npm run build` pass
- [ ] T6 — Audit | owner: auditor | files: `docs/specs/002-database/audit.md` | verify: verdict PASS
