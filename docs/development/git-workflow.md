# Git Workflow

Three long-lived branches, each with one job. Work flows in one direction: `feature/mvp-plan` → `dev` → `main`. This strict flow ensures a clean, presentable commit history for the academic presentation and prevents broken code from reaching the MVP.

```text
feature/mvp-plan ──(feature passes audit)──▶ dev ──(tests & TS build green)──▶ main
 agents commit here      merge --no-ff          test/integration               merge --no-ff, "commit vX.X"
```

## Branches

| Branch | Role | Commits |
| --- | --- | --- |
| `feature/mvp-plan` | Where the agents work, one task per commit. Checked out as a worktree at `.worktrees/mvp-plan/` (git-ignored). | Conventional commits (see `CLAUDE.md`). |
| `dev` | Test and integration. Receives `feature/mvp-plan` when a feature's audit is **PASS**. `pytest` and `npm run build` (which includes TS type checking) must pass here. | Merge commits from `feature/mvp-plan`, conventional style (e.g. `merge: 001-restructure`). |
| `main` | Stable, presentable state. Receives only merges from `dev`. | One merge commit per release, named `commit vX.X`. |

## Rules

1. Nobody commits directly on `dev` or `main`; they only receive merges.
2. Merges use `--no-ff`, so each feature and each release stays visible in the history (crucial for demonstrating project evolution in the academic presentation).
3. `feature/mvp-plan` → `dev` only after the feature's `audit.md` says **PASS**.
4. `dev` → `main` only after backend tests (`pytest`) and frontend builds (`npm run build` to enforce TS types) pass on `dev`.
5. Versions: the last name used was `commit v2.0`, for the archived Java work. The next release on `main` is `commit v2.1`. Each later release bumps the minor number; finishing a phase bumps the major number.
6. Before starting a new feature, `feature/mvp-plan` merges `dev` back in if `dev` received anything else.
7. Pushes to `origin` are run by the user.

## Commands

```bash
# one-time: agent worktree
git worktree add .worktrees/mvp-plan feature/mvp-plan

# feature done and audited
git checkout dev && git merge --no-ff feature/mvp-plan -m "merge: 001-restructure"

# release (after pytest and npm run build pass)
git checkout main && git merge --no-ff dev -m "commit v2.1"
```
