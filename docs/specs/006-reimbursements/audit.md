# 006 Reimbursements — Audit Report

Auditor: `auditor` agent | Date: 2026-10-17 (Brasília) | Branch: `feature/mvp-plan` | Commits audited: `6d625ab..a04b7f2` (`17f99e7` feat(db), `911ea23` feat(api), `4de06b3` feat(api), `a04b7f2` docs). The `frontend/` diff is empty.

Runtime: Python 3.13.16, `.venv` from `backend/`.

## Evidence Gathered

| # | Check | Command / method | Result |
| --- | --- | --- | --- |
| E1 | Test suite | `cd backend && .venv/bin/pytest -q` | **645 passed** (567 at `6d625ab`), 1 unrelated httpx deprecation warning. Each commit is green on its own (`git archive` of each commit, then its own suite): `17f99e7` 584, `911ea23` 635, `4de06b3` 645. |
| E2 | T1/T2 are contract-neutral | `app.openapi()` dumped at `6d625ab`, `17f99e7`, `911ea23` and `HEAD`, then diffed | `17f99e7` is **byte-identical** to `6d625ab`. `911ea23` only adds the 3 `/reimbursements*` paths and 4 schemas (`SettleRequest`, `Reimbursement`, `ReimbursementSummary`, `PersonOpen`). `HEAD` also changes `GET /transactions`, and only by the optional `status` query and a `422` → `ErrorResponse`. `POST /transactions` and every other path and schema are unchanged. No `HTTPValidationError` anywhere. |
| E3 | T1/T2 data-neutral, across start times | `simtime.py`: schema + seed built in memory with every `'now'` replaced by a fixed UTC instant. 400 days × 8 times of day (00:00:30, 02:59:59, 03:00:00, 03:00:01, 12:00, 20:59:59, 21:00, 23:59:59 UTC; so Brasília 23:59:59 and 00:00:00 are both covered), at `6d625ab` and `HEAD`, each with its own `balance.py` | **3200 of 3200** start times: `/balance` = **706397** at both revisions, and the seeded adjustment history (id, previous, new) is **identical**. `checks.sql` (with the same `now`) returns **0 rows** at every start time, at both revisions. `foreign_key_check` is empty. No seeded `pago` share is settled after a same-day adjustment. |
| E4 | `GET /transactions` and detail unchanged | `list_transactions()` and `get_transaction(1..69)` at `6d625ab` and `HEAD`, seed built at 3 fixed instants, serialized through each revision's schemas | **Identical** JSON, including every `settled_on` (now `date(settled_at)`). |
| E5 | Old tests against new code | The 567 tests from `6d625ab` run against `HEAD` `app/` + `sql/` | 557 pass. All 12 failures are `sqlite3.OperationalError: no such column: settled_on` (or `has no column named settled_on`), from raw SQL in the tests that names the dropped column. No behavior failure. |
| E6 | Acceptance probe (live uvicorn on a free port, `127.0.0.1:33181`, PID 17560, scratch DB) | `probe.py`, about 90 assertions with httpx plus direct reads of the live DB file | **0 failures** on the ACs. One probe expectation was wrong (`/reimbursements/1.0`; see n4). Details in Section 1. |
| E7 | Concurrency (same live server) | `conc.py`: 5 rounds × 30 parallel `PATCH` (15 `pago` + 15 `acertado`) on a fresh share. Then 3 rounds × 52 mixed requests: 5 shares × 6 `PATCH`, 5 adjustments, 5 split `POST /transactions`, and 12 reads (summary, filtered lists, history) | One share: **1 × 200 + 29 × 409** in every round. Every 409 body is exactly `already_settled`. The DB status equals the winner, and `/balance` moved by 1666 (the share) when `pago` won and by 0 when `acertado` won. Mixed: per share **exactly one 200 and five 409**. 0 × 5xx in 437 requests. No `Traceback` in the server log. Server stopped with `kill 17560` (graceful shutdown in the log). |
| E8 | `checks.sql` after writes | All 14 checks on the live DB after E6 and E7 (58 shares, 38 closed, 19 adjustments) | **0 rows** for every check, including the new `settled_at_not_before_created_at` and `settled_at_not_in_future`. `integrity_check` ok, `foreign_key_check` empty. |
| E9 | Mutations (scratch copy, full suite) | One change at a time in `services/` or `sql/seed.sql` | Caught: dropping `AND status = 'em_aberto'` from `SETTLE_SQL`; history by `date(settled_at) <= date(r.created_at)` (the pre-006 rule); `settled_at = datetime('now')` (UTC); a no-op status filter in `list_transactions`. **Survived (645 pass):** `BEGIN IMMEDIATE` → `BEGIN` in `settle_share` (n3); removing the seed's `max(..., t.created_at)` (defensive, never reached by today's seed data); removing the seed's `min(..., now)` cap (**m1**); `open_count` as `len(rows)` (**m2**). |
| E10 | Static checks | grep and reading of the diff | Every new query uses `?` placeholders. `LIST_SQL` and `OPEN_BY_PERSON_SQL` are constants, and `HISTORY_SQL` only concatenates constant text. There is no f-string, `.format` or `%` SQL. `services/` imports nothing from FastAPI or Starlette, and routers contain no SQL. There is no `float` or `round(` in the new code. Largest module: `services/transactions.py`, 220 lines. |

## 1. Spec Compliance

- [x] **AC1: Pass.**
  - `PATCH /reimbursements/2 {"status":"pago"}` → `200` with the 8-field split block. The block equals `GET /transactions/2`'s `split`, with `settled_on` = today in Brasília.
  - `/balance` rose by exactly 9395 (the share). `/budget` `spent_cents` did not change.
  - `acertado` on share 4 → `200`. Neither `/balance` nor `/budget` moved.
  - The stored `settled_at` was `2026-10-17 20:58:19`, which is not after SQLite's Brasília `now` and not before the expense's `created_at`.
  - `409 already_settled` ("Este reembolso já foi encerrado.") in all four closed→closed combinations and for seeded `pago` and `acertado` shares. Nothing changes after a 409.
  - `404 not_found` ("Reembolso não encontrado.") for an income (1), an unsplit expense (3), 999 and 2⁶³−1. The balance is unchanged.
  - `422 validation_error`, with nothing changed, for these bodies: `em_aberto`, `PAGO`, `"pago "`, a list, `{}`, `null`, `[]`, a bare string, an extra key, `settled_on`/`settled_at` sent (`extra="forbid"`), malformed JSON, a form body and invalid UTF-8. Also for these ids: 0, −1, `x`, `1e3`, 2⁶³ and a space.
  - A bad body on an unknown id → 422 (validation runs before lookup).
- [x] **AC2: Pass.**
  - `GET /reimbursements` equals an independent join of the shares, ordered `occurred_on DESC, id DESC`. Each item has exactly the 8 contract fields.
  - The id order equals the split rows of `GET /transactions`.
  - Each `?status=` returns exactly its subset.
  - `""`, `PAGO`, `aberto`, `null`, `em_aberto,pago` and `" pago"` → 422.
- [x] **AC3: Pass.**
  - `open_cents` and `open_count` equal independent sums over `em_aberto` rows. `by_person` sums to `open_cents`, holds only friends with something open, and is largest first.
  - Ties are ordered by accent-insensitive name (`Álvaro` before `Zeca`, by test).
  - All values are JSON integers. A stray query string is ignored.
- [x] **AC4: Pass.** `GET /transactions?status=X` equals the unfiltered list filtered by `split_status == X`, for each of the three values. Invalid values → 422. Without the parameter, the list is identical to `6d625ab` (E4).
- [x] **AC5: Pass.**
  - An adjustment was typed as 555555. After the clock reached the next second, share 8 was marked `pago`. The history entry stayed equal to the original response. `/balance` = 555555 + share.
  - A `pago` before a later adjustment counts: the next adjustment's entry equals its typed 600000 and `/balance`. The earlier entry still shows 555555.
  - The seeded history is unchanged at every simulated start time (E3).
  - The 006 Open Questions are closed in `context.md`, and Business Rule 20 is added.
  - The same-second tie behaves as the Data Rule (`<=`) says (n1).
- [x] **AC6: Pass.** Exactly one `200` and the rest `409` in every burst, and never a `500` (E7). This is also pinned by `test_parallel_closes_same_share_one_wins` and `test_parallel_mixed_closes_one_wins_and_balance_matches`.
- [x] **AC7: Pass.** `PATCH /reimbursements/{transaction_id}` documents 404 `not_found`, 409 `already_settled` and 422 `validation_error`. `GET /reimbursements` and `GET /transactions` document 422. Every 4xx references `ErrorResponse`, and `/summary` has no error response, as in the contract (E2).

**Data Rules: Pass.**
- The schema enforces three things: `settled_at` is canonical `YYYY-MM-DD HH:MM:SS`, it is set iff the share is closed, and it is never before `created_at`. The last one uses triggers on insert and update, plus the `created_at` update guard on `transactions`.
- "Not in the future" is a `checks.sql` query (it needs the clock).
- A share created and settled in the same second gets `settled_at == created_at`, which is accepted (`2026-10-17 20:58:21` for both, E6).
- `settled_on` is `date(settled_at)` from the same SQLite clock as `created_at`. So around Brasília midnight the exposed date is always the stored one (E3 covers seeds at 23:59:59 and 00:00:00).

## 2. Security & Data Consistency

- [x] **Parameterized SQL** in every new query (E10). `? IS NULL OR s.status = ?` serves both the filtered and unfiltered lists with one query.
- [x] **Money.** `pago` moves `/balance` by exactly `share_cents` and never moves the budget. `acertado` moves neither (E6, E7). The summary is computed with integer SQL `sum` and Python `sum`, and the schemas use `StrictInt`.
- [x] **Data consistency.** `checks.sql` returns 0 rows on fresh DBs at 3200 start times and after concurrent writes (E3, E8).
- [x] **Write safety.** The `WHERE status = 'em_aberto'` in the single `UPDATE` decides the winner. The 404/409 lookup runs inside the same transaction.
- [x] **Errors.** Every response uses the standard shape with pt-BR messages, and no stack trace or SQL leaks.
- [x] **Strict 1-to-1.** Shares are addressed by `transaction_id`. There is no group logic, and nothing computes what the user owes.

## 3. Structural & Stack Rules

- [x] **Layers.** Routers parse the request, call a service and return a schema. Services raise `DomainError`. `settle_share` reuses `get_transaction(...)["split"]`, so the split block is built in one place.
- [x] **Files.** Every new file is in the plan and in `repository-structure.md`. There are no new dependencies and no new directories.
- [x] **Scope.** `em_aberto` is rejected as a target, so there is no reopening. There is no date input (`extra="forbid"`), and no partial payment, due date, "Em Atraso" status or reminder. `GET`/`PUT`/`DELETE`/`POST /reimbursements/{id}` → 405, and `POST`/`PATCH`/`DELETE /reimbursements` → 405. There is no frontend change.
- [x] **TypeScript.** Not applicable: no frontend changes.
- [x] **Process.** The spec and plan were approved (`6d625ab`) before product code. Commits are conventional with scopes and one logical change each. No `.db`, `.env` or `node_modules` is tracked.

## Findings

### Blocker

None.

### Major

None.

### Minor

- **m1. No test pins the seed's "never in the future" cap.**
  - If `min(..., datetime('now', '-3 hours'))` is removed from the `split_share` seed insert (`sql/seed.sql`), all 645 tests still pass, because they ran at an evening Brasília time.
  - E9's simulation of the same mutation flags `settled_at_not_in_future` on **38 of 464** start times (about 8%, at every time of day). So the guard for this plan risk is real, but whether the suite checks it depends on the wall clock.
  - **Fix:** add a `test_db.py` test that builds the seed at several fixed instants (replace `'now'` with a literal, as E3 does). Include a Brasília morning a day or two after a recent split expense. Assert that `checks.sql` returns zero rows.
- **m2. `open_count` is not pinned against a per-friend count.**
  - Replacing the summed `open_count` with `len(rows)` (the number of friends) passes every test. The seed has exactly one open share per friend, and the tie test also creates one share per new friend.
  - **Fix:** in `test_reimbursements.py`, open two shares for the same friend. Assert `open_count` rises by 2, and that the friend's single `by_person` entry holds both shares.

### Informational

- **n1. Same-second tie.** An adjustment and a `pago` in the **same second**, in that order, change the entry. Typed 800000 at `20:59:42`, then a `pago` of 2500 in the same second: the entry now shows 802500, which equals `/balance` (E6 follow-up). In the E7 mixed bursts, the burst adjustments likewise show values that include same-second writes. This is exactly the Data Rule (`settled_at <= adjustment.created_at`) and the tie accepted for expenses in 004 (R7/m1). AC5 holds from the next second on. The UI cannot normally adjust and then settle within one second. No action, but the presentation should state the tie in one sentence.
- **n2. `test_same_day_pago_after_adjustment_keeps_typed_balance` and Brasília midnight.**
  - If the adjustment lands in second 23:59:59, `wait_for_next_second` pushes the settlement to 00:00:00 of the next day. Then the precondition `settled_at[:10] == created_at[:10]` fails. That is about 1 run in 86,400 at a random time of day.
  - **Judgment: acceptable.** It fails loudly on a precondition and never passes falsely. The substantive assertions would still hold, because the rule compares timestamps, not dates.
  - The API twin, `test_pago_after_same_day_adjustment_keeps_its_balance`, has no same-day guard. At that instant it would quietly test the cross-day case instead.
  - The `settled_on == brasilia_today()` assertions in other tests have only a millisecond window.
  - Optional hardening: before posting the adjustment, wait while Brasília time is 23:59:58 or later.
- **n3. `BEGIN IMMEDIATE` in `settle_share` is defensive, not load-bearing.** The first statement is the `UPDATE`, which takes the write lock at once. So plain `BEGIN` still passes the parallel tests (E9), the same case as `delete_rule` in 005. The status condition in the `UPDATE` is what guarantees AC6, as the plan says. No action.
- **n4. Integral float-like path ids.** `PATCH /reimbursements/1.0` is read as id 1 (→ 404). The same holds for `/transactions/2.0` and `/categories/rules/1.0`. This is lax Pydantic int parsing on every route, it predates 006, and the id resolves to the correct row. `1.5` and `1e3` still → 422. No action.
- **n5. A seed comment is incomplete.** "before the 18:00 adjustment" ignores the 10:00 seeded adjustment (day 25 of month −3). A `pago` settled that afternoon would no longer count toward it, whereas it did with date-only `settled_on`. No seeded `pago` lands on that day for any of the 3200 start times (E3), so nothing changes today. Worth one more clause if the seed is touched again.
- **n6. A repeated `status` parameter** (`?status=pago&status=acertado`): the last value wins → `200`, the same as for the query in 005 (E9 there). No action.

## Verdict

**PASS**

All seven acceptance criteria, the Data Rules and the Out of Scope list hold under real requests. The evidence is 645 passing tests (each commit green), a live acceptance probe and live concurrency bursts: exactly one winner per share, no 5xx in 437 requests, and the balance moved only by the winning `pago`. T1/T2 are contract- and data-neutral. OpenAPI is byte-identical after `17f99e7`, the transaction list and detail are identical, and `/balance` is 706397 with an identical seeded adjustment history at 3200 simulated start times, including both sides of Brasília midnight. `checks.sql` returns zero rows on every fresh DB and after the writes. SQL is parameterized, the layers are clean, and money is integer cents. m1 and m2 are test gaps, not defects. Fix both before 006 merges into `dev`.
