# Git Workflow

Three long-lived branches, each with one job. Work flows in one direction: `feature/mvp-plan` → `dev` → `main`. This strict flow ensures a clean, presentable commit history for the academic presentation and prevents broken code from reaching the MVP.

```text
feature/mvp-plan ──(feature passes audit)──▶ dev ──(tests & TS build green)──▶ main
 agents commit here      merge --no-ff          test/integration               merge --no-ff, "commit vX.X"
```

## Cadence

- **Every complete change** (one task, one doc update) is one conventional commit on `feature/mvp-plan`.
- **Mini sprint** = one numbered feature (`docs/specs/NNN-<feature>/`). When its audit is **PASS**, it is merged into `dev` as `merge: NNN-<feature>`.
- **Sprint** = a group of mini sprints that forms a demonstrable increment. When it is complete and green on `dev`, `dev` is merged into `main` as `commit vX.X`.

| Sprint | Mini sprints | Release on `main` |
| --- | --- | --- |
| 1. Foundation | `001-restructure`, `002-database` | `commit v2.1` |
| 2. Money core | `003-balance` (US05), `004-split` (US01) | `commit v2.2` |
| 3. Organization and insight | `005-categories` (US02), `006-reimbursements` (US03), `007-dashboard` (US04) | `commit v3.0` (phase 1 done) |
| 4. App shell | `008-app-shell` (themes, brand, fake login, navigation, typed client) | `commit v3.1` |
| 5. Core screens | `009-home` (US05 cards, US04 charts), `010-new-expense` (US01, US02), `011-statement` (US03) | `commit v3.2` |
| 6. Settings and showcase | `012-settings-friends`, `013-landing` (GSAP), `014-pwa` | `commit v4.0` (phase 2 done) |

Phase 3 sprints are added here when their specs exist. Sprint 4 was released on its own at the user's request (2026-10-21).

## Branches

| Branch | Role | Commits |
| --- | --- | --- |
| `feature/mvp-plan` | Where the agents work, one task per commit. Locally it is checked out as a worktree at `.worktrees/mvp-plan/` (git-ignored); cloud sessions check it out directly. | Conventional commits (see `CLAUDE.md`). |
| `dev` | Test and integration. Receives `feature/mvp-plan` when a feature's audit is **PASS**. `pytest` and `npm run build` (which includes TS type checking) must pass here. | Merge commits from `feature/mvp-plan`, conventional style (e.g. `merge: 001-restructure`). |
| `main` | Stable, presentable state. Receives only merges from `dev`. | One merge commit per release, named `commit vX.X`. |

## Rules

1. Nobody commits directly on `dev` or `main`; they only receive merges.
2. Merges use `--no-ff`, so each feature and each release stays visible in the history (crucial for demonstrating project evolution in the academic presentation).
3. `feature/mvp-plan` → `dev` only after the feature's `audit.md` says **PASS**.
4. `dev` → `main` only after backend tests (`pytest`) and frontend builds (`npm run build` to enforce TS types) pass on `dev`.
5. Versions: the last name used was `commit v2.0`, for the archived Java work. The next release on `main` is `commit v2.1`. Each later release bumps the minor number; finishing a phase bumps the major number.
6. Before starting a new feature, `feature/mvp-plan` merges `dev` back in if `dev` received anything else.
7. Cloud sessions push `feature/mvp-plan` after each commit and `dev`/`main` right after each merge, because their containers are ephemeral and unpushed work is lost. Local sessions leave pushes to the user.

## Commands

```bash
# one-time: agent worktree
git worktree add .worktrees/mvp-plan feature/mvp-plan

# feature done and audited
git checkout dev && git merge --no-ff feature/mvp-plan -m "merge: 001-restructure"

# release (after pytest and npm run build pass)
git checkout main && git merge --no-ff dev -m "commit v2.1"
```
