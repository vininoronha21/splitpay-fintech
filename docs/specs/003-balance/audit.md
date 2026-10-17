# 003 Balance — Audit Report

Auditor: `auditor` agent | Date: 2026-10-17 | Branch: `feature/mvp-plan` | Commits audited: `5852abc..c41ad78` (8 commits, `git log --oneline origin/dev..feature/mvp-plan`)

Runtime: Python 3.13.16, SQLite 3.45.1, Pydantic 2.14.1, FastAPI 0.143.3.

## Evidence Gathered

| # | Check | Command / method | Result |
| --- | --- | --- | --- |
| E1 | Test suite | `cd backend && .venv/bin/pytest -q` | **129 passed**, 1 deprecation warning (httpx in Starlette TestClient, unrelated) |
| E2 | Adversarial API probe | TestClient script over every endpoint (about 60 requests) | All invalid inputs return `422 {"error":{"code":"validation_error",...}}`. Unknown method returns `405`, unknown path `404`, same shape, no stack trace. See the AC rows below. |
| E3 | Independent balance formula | stdlib `python3` + `sqlite3` on `schema.sql` + `seed.sql`, summed in Python without the service SQL | `706397` = API `GET /balance` (`250000 + 3790000 + 450594 − 3777197 − 7000`) |
| E4 | Independent history | same script, Data Rules applied literally (movements dated `<= date(created_at)` + running sum of deltas ordered by `created_at, id`) | id 2: prev `753944`, new `741944`; id 1: prev `310035`, new `315035`. These equal the API output. |
| E5 | Seed vs. Brasília time sweep | `'now'` in `seed.sql` replaced by 1604 simulated UTC instants (every 6 h across 400 days, plus 21:00–23:59 BRT and month/year boundaries); for each instant: no date after BRT today, every `checks.sql` query returns 0 rows, every history balance > 0, end-of-day balance > 0 on every movement date, current week/month/year non-empty | **0 problems** |
| E6 | 002 seed guarantees after the 003 seed changes | second sweep (about 1370 instants): month −9 empty for transactions and `settled_on`, total balance > 0 | **0 problems** |
| E7 | Column defaults | `INSERT` without `created_at` | `2026-10-17 17:53:43` while `datetime('now')` = `20:53:43` (UTC−3) |
| E8 | Concurrency (live uvicorn, port 8765, stopped by PID, DB deleted) | 5 rounds × 20 parallel `POST /balance/adjustments` with the **same** target | each round: exactly **1 × 201 + 19 × 422 `no_change`**, final balance = target; no 500s in the log |
| E9 | Concurrency, distinct targets | 20 parallel POSTs, different targets | 20 × 201. The responses form an unbroken chain (`new[i] == previous[i+1]`), and the newest history entry equals `GET /balance`. |
| E10 | Lock is what serializes | external connection holds `BEGIN IMMEDIATE` and inserts +500, then commits after 1 s | the API request waited 1.04 s and then read the **committed** balance (`no_change`), which proves the balance is read under the write lock |

## 1. Spec Compliance

- [x] **AC1: Pass.** `GET /profile` returns `{"display_name":"Usuário","initial_balance_cents":250000,"monthly_budget_cents":300000}` (E2). Covered by `tests/test_profile.py::test_get_profile_returns_seeded_profile`.
- [x] **AC2: Pass.** `0` and `10**12` accepted. Each of these is rejected with `422 validation_error` and leaves the profile unchanged: `-1`, `10.5`, `1000.0`, `"1000"`, `true`, `false`, `null`, `10**12+1`, `2**63`, `10**40`, `[1]`, `{"a":1}`, `{}`, malformed JSON, no body, array body (E2; parametrized test `test_patch_profile_rejects_invalid_value`). Extra fields `display_name` and `monthly_budget_cents` are ignored: the DB row is unchanged.
- [x] **AC3: Pass.** The parts and `balance_cents` match an independent Python sum (E3, `test_balance_matches_independent_sum_over_seed_rows`). Only `pago` shares count as reimbursements; `acertado` leaves the balance unchanged (`test_balance_counts_only_pago_shares_as_reimbursements`). The balance is recomputed per request (`services/balance.py` `BALANCE_PARTS_SQL`, no stored total).
- [x] **AC4: Pass.** delta = target − current (tests plus E2). The reason is trimmed, and 9, 201 and whitespace-only reasons are rejected; NBSP-only, U+3000-only and tab/newline-only reasons are rejected too. A 200-emoji reason is accepted and a 201-emoji reason rejected, and the code-point count matches SQLite `length()`. A body equal to the current balance returns `422 {"error":{"code":"no_change",...}}` and inserts nothing. A negative target is accepted. The response is the history entry (`201`). SQL-injection text is stored literally. Extra fields (`created_at`, `delta_cents`, `id`) are ignored, and `created_at` comes from the column default. See Minor finding m2 for invisible characters.
- [x] **AC5: Pass.** Newest first by `(created_at, id)`. `new − previous = delta` for every entry. Previous/new balances are computed by `HISTORY_SQL` and never stored (the schema has no such columns). The values match the independent computation (E4). The newest entry equals `GET /balance` after creation, including under concurrency (E9).
- [x] **AC6: Pass.** `PATCH /profile` moves the balance by the same amount and creates no adjustment (`test_patch_profile_moves_balance_by_same_amount_without_adjustment`). A `POST` is reflected in `GET /balance` (`test_balance_reflects_adjustment`).
- [x] **AC7: Pass.** Seed: every `'now'` is `'now', '-3 hours'` first, and no seed date is after BRT today at any simulated instant (E5). Defaults are `datetime('now', '-3 hours')` (`schema.sql:54`, `schema.sql:95`; E7). API: `created_at` is returned as `2026-10-17T17:53:09` while UTC was 20:53 (E2). Python never computes "now", because grep finds no `datetime.now` or `time` in `app/`.
- [x] **AC8: Pass.** `/openapi.json` lists `GET`/`PATCH /profile`, `GET /balance`, `GET`/`POST /balance/adjustments`, with `ProfileUpdate`/`AdjustmentCreate` request schemas (bounds and lengths included) and `Profile`/`Balance`/`Adjustment` response schemas (`test_openapi_lists_profile_and_balance_endpoints`). See Minor finding m1 for the documented 422 shape.

**Data Rules (including the two "Added during implementation"):**

- ±10¹² request bound: enforced by `Cents`/`NonNegativeCents` (`schemas.py:13-16`). I also tried to drive the stored values toward overflow by alternating `PATCH` of the initial balance (0 ↔ 10¹²) with adjustments to ±10¹². The deltas stay around ±3·10¹² and the balances around ±2·10¹². Both are far inside int64, and both are below JS `Number.MAX_SAFE_INTEGER` (≈9·10¹⁵), so phase 2 TS `number` is safe.
- `created_at` ISO 8601 without offset: the `datetime` field serializes `"2026-10-17 17:53:09"` from SQLite as `"2026-10-17T17:53:09"` (E2). Pass.
- Negative new balance allowed; negative initial balance rejected. Pass.
- History definition and movement dates: verified independently (E4, E5). Pass.

## 2. Security & Data Consistency

- [x] **Parameterized SQL.** Every value goes through `?` placeholders (`services/balance.py:90`, `:132`, `:136`). The two concatenations `HISTORY_SQL + " ORDER BY ..."` (`:113`) and `HISTORY_SQL + " WHERE id = ?"` (`:136`) join constant SQL text only, never a value. No f-string, `.format` or `%` SQL anywhere in `app/`.
- [x] **Validation edge cases.** Zero, null, booleans, floats, huge integers, strings, containers, malformed JSON and missing fields are all covered (E2).
- [x] **Error shape.** `{"error":{"code","message"}}` for 404/405/422/`no_change`/500, pt-BR messages, no stack traces or SQL in bodies (E2, E10).
- [x] **Write safety.** `BEGIN IMMEDIATE` (`services/balance.py:126`) proven effective (E8–E10). `no_change` rolls back and releases the lock: 19 of 20 parallel requests in each round got `no_change` and the next round proceeded.
- [x] **`checks.sql`.** Returns 0 rows on the seed at every simulated instant (E5). 003 adds no write path to shares or transactions.
- [x] **Balance never stored.** Recomputed from rows (`BALANCE_PARTS_SQL`), and previous/new history values are computed (Business Rule 3).
- [x] **Strict 1-to-1 respected.** No split, transaction or multi-person logic added. `split_share` is only read in sums.
- [x] **Secrets/CORS.** Unchanged by this feature.

## 3. Structural & Stack Rules

- [x] **Layers.** Routers (`routers/profile.py`, `routers/balance.py`) only parse, call a service and return a schema, with no SQL. `services/` imports nothing from FastAPI/Starlette (grep). `DomainError` lives in `services/__init__.py` and is mapped in `main.py:47-48`.
- [x] **Files.** Every created file is listed in `docs/development/repository-structure.md` (updated in the same feature for `services/__init__.py` and the profile in `balance.py`). No new dependency.
- [x] **Scope.** No transaction/split/category/dashboard endpoints. The `frontend/` diff is empty. No `display_name` write anywhere: grep finds only the `SELECT` at `services/balance.py:19`, and the extra `display_name` field in a PATCH is ignored. No monthly-budget write. Adjustments are append-only: `DELETE` returns `405`, and `GET /balance/adjustments/1` returns `404`.
- [x] **TypeScript.** Not applicable, because this feature has no frontend changes (plan: TS interfaces mirror `schemas.py` in phase 2).
- [x] **Money.** Integer cents end to end (`StrictInt`). No float appears anywhere in the path.
- [x] **Commits.** Conventional with scopes, spec and plan approved (`febf486`) before product code (`0f857b9`). No `.db`, `.env` or `node_modules` committed.

## Findings

### Blocker

None.

### Major

None.

### Minor

- **m1. Swagger documents the wrong 422 body.** `PATCH /profile` (`routers/profile.py:20`) and `POST /balance/adjustments` (`routers/balance.py:25`) advertise FastAPI's default `HTTPValidationError {"detail": [...]}`. The API actually returns `{"error":{"code","message"}}` (`main.py:41-48`), and the `no_change` code is not documented at all. The runtime shape is correct and consistent, but the published contract is wrong, which goes against "catch API contract errors early" for the phase 2 TS service layer. Suggested fix: add one `ErrorResponse` model to `schemas.py` and declare `responses={422: {"model": ErrorResponse}}`, reusable by 004+. Best done before 004 adds more bodies.
- **m2. A reason made only of invisible characters is accepted.** `schemas.py:40`: `strip_whitespace` uses `str.strip()`, which does not remove U+200B (zero-width space). `"​" * 12` was stored as a valid reason (E2, adjustment id 3), so the history shows a blank reason. The risk in a public demo is low. Optional fix: also reject a reason with fewer than 10 visible characters, for example `reason.strip("​‌‍⁠﻿")`, in a validator.
- **m3. Business Rule 18 wording contradicts the seed.** `docs/context.md:96` says "`created_at` is always written by the column default", but `backend/sql/seed.sql:222-224` writes `created_at` explicitly for the two seeded adjustments. This is needed so the history has past entries, and the format is still `YYYY-MM-DD HH:MM:SS`, Brasília. Suggested wording: "...written by the column default (the seed sets past timestamps explicitly with the same format)". The spec's Data Rule ("the API never sends it") is accurate.
- **m4. Seed reshaped beyond the plan without a task.** `plan.md:8` limits the seed change to "every `'now'` becomes `'now', '-3 hours'` (same relative layout)". Commit `6d4ea17 fix(db)` instead added 26 rows, changed salary amounts (450000 → 320000) and the Paraty amounts, and also touched `tests/test_balance.py`, mixing the `db` and test scopes in one commit. `tasks.md` has no entry for it. The change itself is sound: `checks.sql` returns 0 rows, the week/month/year coverage, empty month −9, positive balance and positive history all hold at 1604 and ~1370 simulated instants (E5, E6), and no doc references the old amounts. Record it in `tasks.md` (or in the plan's risks) so the trail is complete.
- **m5. The Business Rules table in context.md is broken (pre-existing).** The blank line at `docs/context.md:88` (from `b8c5a11`, before this feature) splits the Business Rules table, so in GitHub-flavored Markdown rows 11–18, including the new rule 18, render as plain text without a header. One-line fix: delete the blank line.
- **m6. Lock waits past 5 s return 500 (informational).** `app/db.py:13` uses the default `sqlite3` busy timeout of 5 s. If an outside writer held the lock longer, a `POST` returned `500 internal_error` after 5.02 s (E10; clean shape, no trace). The API's own transactions last milliseconds, so this cannot happen through the API alone. No action needed for the MVP.

## Verdict

**PASS**

All eight acceptance criteria and every Data Rule (including the two added during implementation) are met. The evidence includes passing tests and an independent recomputation, a 1604-instant time sweep and a live concurrency test. The security baseline, layer rules and scope are respected. The Minor findings m1–m4 should be fixed alongside 004 (m1 before 004 adds more request bodies), and none of them blocks the merge of 003.
