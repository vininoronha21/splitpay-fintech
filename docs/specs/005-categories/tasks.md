# 005 Categories — Tasks

- [ ] T1 — Split `schemas.py` into a package and add `app/text.py` (no behavior change except blank letters as spaces) | owner: backend-engineer | files: `backend/app/schemas/`, `backend/app/text.py`, `backend/app/services/friends.py`, `backend/app/routers/*.py`, `backend/tests/test_text.py` | verify: full `pytest` passes
- [ ] T2 — Categories list and suggestion | owner: backend-engineer | files: `backend/app/services/categories.py`, `backend/app/routers/categories.py`, `backend/app/schemas/categories.py`, `backend/app/main.py`, `backend/tests/test_categories.py` | verify: `pytest tests/test_categories.py` passes
- [ ] T3 — Rule create, list and delete | owner: backend-engineer | files: same as T2, `backend/tests/test_category_rules.py` | verify: `pytest tests/test_category_rules.py` passes
- [ ] T4 — Docs sync | owner: main session | files: `docs/development/repository-structure.md`, `docs/context.md` | verify: new files listed; 005 questions closed
- [ ] T5 — Audit | owner: auditor | files: `docs/specs/005-categories/audit.md` | verify: verdict PASS
