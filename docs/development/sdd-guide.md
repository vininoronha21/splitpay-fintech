# Spec-Driven Development Guide

Every feature goes through five stages, in strict order. A stage starts only after the previous one is done. All artifacts live in `docs/specs/NNN-<feature>/`. This process ensures the 1-month MVP stays on track without scope creep.

## Stage Report (mandatory at every stage)

At the end of each stage, the agent reports in chat (pt-BR) and in the artifact (en-US):

1. **What**: what was done.
2. **Why**: why this stage or decision is needed.
3. **Files**: files created or changed.
4. **Verify**: the exact command or check that proves the result, and its outcome.

## 1. Specification — `spec.md`

- **What:** the problem, user stories covered (US0X), acceptance criteria, data rules, API contract (endpoints, request/response shapes, error cases), out of scope.
- **Why:** it fixes *what* "done" means before any code exists, so implementers and the auditor judge against the same text.
- **Who:** main session with the user. Resolves relevant items from "Open Questions" in `context.md`.
- **Gate:** the user approves the spec explicitly.

```markdown
# NNN <Feature> — Spec
Stories: US0X | Status: draft | approved
## Problem
## Acceptance Criteria   (numbered, each testable)
## Data Rules            (constraints, invariants, rounding)
## API Contract          (method, path, request, response, errors)
## Out of Scope          (explicitly block multi-user, complex auth, etc.)
## Decisions             (what / why / rejected alternative)
```

## 2. Planning — `plan.md`

- **What:** how the spec will be built: files to create or change (checked against `repository-structure.md`), schema changes, TypeScript interfaces (for frontend), test strategy, risks.
- **Why:** it surfaces structural and technical choices while they are still cheap to change.
- **Who:** main session. The owning agent may be consulted.
- **Gate:** the user approves the plan. Any new path or dependency is justified here.

## 3. Tasks — `tasks.md`

- **What:** ordered, small tasks (each about one commit). Each task has an owner agent, the files it touches, and a verification step.
- **Why:** small tasks are reviewable, auditable and easy to roll back.

```markdown
- [ ] T1 — <action> | owner: backend-engineer | files: ... | verify: `pytest tests/test_x.py` passes
```

## 4. Implementation

- **What:** the owner agent executes one task at a time, test first where logic exists (write the failing test, implement, see it pass).
- **Why:** tests turn acceptance criteria into evidence.
- **Rules:** touch only the task's files. Stay inside the plan. If the plan is wrong, stop and report instead of improvising. Do not introduce speculative features (e.g., group splits when only 1-to-1 is required).
- **Done when:** the task's verify step passes and the stage report is written.

## 5. Validation — `audit.md`

- **What:** the `auditor` checks the finished tasks against the spec:
  - every acceptance criterion maps to a passing test or a manual check with evidence;
  - security baseline and data-consistency checks from `context.md` (including `backend/sql/checks.sql`);
  - structure and scope rules (no unplanned files, layers, scope creep, or missing TS types).
- **Why:** an independent reviewer catches what the author cannot see.
- **Output:** findings ranked by severity (blocker, major, minor), each with file:line and evidence, then a verdict of **PASS** or **CHANGES REQUIRED**.
- **Loop:** if changes are required, the owning implementer fixes them and the auditor re-checks. The feature is done only on PASS.

## Orchestration

```text
main session: spec ─(user ok)→ plan ─(user ok)→ tasks
   for each task: implementer agent → verify → next task
   all tasks done: auditor → PASS? ─no→ implementer fixes → auditor
                                 └yes→ commit(s) → update context.md if a decision changed
```

## Phase 1 Feature Order

Follows the backlog priority in `goal.md`. All splits are strictly 1-to-1:

1. `001-restructure`: repository moves and deletions, backend scaffold, `/health`.
2. `002-database`: `schema.sql`, `seed.sql`, `checks.sql`, DB init.
3. `003-balance` (US05).
4. `004-split` (US01 - 1-to-1 only).
5. `005-categories` (US02).
6. `006-reimbursements` (US03).
7. `007-dashboard` (US04 data endpoints).

Phase 2 (frontend React+TS, UI/UX with GSAP) and Phase 3 (deploy, presentation) get their own numbered specs when phase 1 passes its audit.
