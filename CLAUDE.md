# CLAUDE.md — SplitPay

Shared-expense fintech MVP for a FIAP presentation. Simple, explainable, not over-engineered, with a target of about one month.

## Mandatory Reading (before any task)

1. `docs/goal.md`: what we build, why, and what is OUT of scope (e.g., no multi-person splits, 1-to-1 only).
2. `docs/context.md`: current state, stack (FastAPI + React/TS + SQLite), decisions, open questions.
3. `docs/development/repository-structure.md`: where things live and the rules for changing the layout.
4. `docs/development/sdd-guide.md`: the required workflow (spec → plan → tasks → implementation → validation).
5. `docs/development/git-workflow.md`: branches and merge flow (`feature/mvp-plan` → `dev` → `main`).

If a request conflicts with these documents, stop and ask instead of picking silently.

## Rules

- **Language:** chat with the user in pt-BR. Write every file, identifier, comment and commit message in en-US. UI copy and seed data are pt-BR.
- **Structure:** create files only where `repository-structure.md` allows. A new directory, layer or dependency needs a stated reason and an update to that document in the same change.
- **Workflow:** no product code without an approved spec and plan in `docs/specs/NNN-<feature>/`. This path overrides skill defaults such as `docs/superpowers/specs/`.
- **Explain decisions:** for every non-trivial technical choice, state *what* was chosen, *why*, and *the simpler alternative rejected*, in one or two sentences. The user must be able to repeat it in the presentation.
- **Money:** integer cents end to end. Never use floats for amounts.
- **SQL & DB:** parameterized queries only. The DB is ephemeral (rebuilt on startup); do not attempt to build persistent volume workflows.
- **TypeScript:** Frontend code must be strictly typed. Catch API contract errors early.
- **Scope guard:** anything listed under "Out of Scope" in `goal.md` (like group splits or real auth) is rejected unless the user explicitly changes the goal.

## Agents (`.claude/agents/`)

| Agent | Phase | Role |
| --- | --- | --- |
| `data-engineer` | 1 | SQLite schema, seed data, consistency queries |
| `backend-engineer` | 1 | FastAPI endpoints, services, validation, tests (1-to-1 split logic) |
| `auditor` | 1–3 | Read-only review: spec compliance, security, data consistency, evidence |
| `frontend-engineer` | 2 | React+TS API integration, UI states, fake login, responsiveness |
| `ui-ux-designer` | 2 | Visual direction, accessibility, GSAP motion, using design skills for LP and Dashboard |

The main session orchestrates: it dispatches one implementer per task, then the `auditor`, and loops until the audit passes (see `sdd-guide.md`). Implementers never audit their own work.

## Commands

| Purpose | Command | Directory |
| --- | --- | --- |
| API dev server | `uvicorn app.main:app --reload` | `backend/` |
| API tests | `pytest` | `backend/` |
| Web dev server | `npm run dev` | `frontend/` |
| Web build & TS check | `npm run build` | `frontend/` |

Commands become valid once `001-restructure` creates `backend/` and `frontend/`.

## Git

- Every complete change is a conventional commit on `feature/mvp-plan` (worktree `.worktrees/mvp-plan/` locally). Each mini sprint (feature) merges into `dev`; each sprint merges into `main` as `commit vX.X`. Never commit on `dev` or `main` directly (see `git-workflow.md`).
- Conventional commits with a scope: `feat(api): ...`, `feat(web): ...`, `feat(db): ...`, `docs: ...`, `chore: ...`, `test(api): ...`.
- One logical change per commit. Review `git status` and `git diff --staged` before committing.
- Never commit `.env`, `*.db` or `node_modules/`.
