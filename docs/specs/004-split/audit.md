# 004 Split — Audit Report

Auditor: `auditor` agent | Date: 2026-10-17 | Branch: `feature/mvp-plan` | Commits audited: `6d3d8f9..1b0e856` (8 commits, `git log --oneline origin/dev..feature/mvp-plan`)

Runtime: Python 3.13.16, SQLite 3.45.1, Pydantic 2.14.1, FastAPI 0.143.3.

## Evidence Gathered

| # | Check | Command / method | Result |
| --- | --- | --- | --- |
| E1 | Test suite | `cd backend && .venv/bin/pytest -q` | **433 passed**, 1 deprecation warning (httpx in Starlette TestClient, unrelated) |
| E2 | Adversarial API probe | TestClient script on a scratch DB, about 150 requests: every split mode and boundary, every 422/404/409 code, 1-to-1 bypass attempts, money types, dates, invisible/unicode text, unsupported methods | Every check passed except the observations in m3 and m4. All rejections return `{"error":{"code","message"}}` with no stack trace. |
| E3 | Money property via the API | 300 random split expenses (amounts 1 to 10¹², random mode, percent and fixed share) | friend + user = amount and friend = the Business Rule 7 floor in **300/300** |
| E4 | Independent budget and balance | stdlib `sqlite3` reads raw rows and sums the own shares in Python for the current Brasília month (`2026-10`) | Seed: API `/budget` = `{300000, 222652, 77348, 74}` = independent; `/balance` `706397` = independent. Recomputed again after 7 new transactions: still equal. |
| E5 | AC8 deltas | before/after `GET /balance` and `GET /budget` for each case | equal R$ 100,00: balance −10000, budget +5000. percentage 33% of 10001: −10001 / +6701. fixed = amount: −7777 / +0. unsplit: −4321 / +4321. income: +99999 / +0. Split expense dated 2020: −5000 / +0. Over budget: `remaining_cents` −999938674, `used_percent` 333412 (floor). |
| E6 | Swagger | `/openapi.json` | No `HTTPValidationError` or `ValidationError` schema anywhere. Every non-2xx response (`PATCH /profile` 422, `POST /balance/adjustments` 422, `POST /friends` 409/422, `POST /transactions` 422, `GET /transactions/{id}` 404/422) references `ErrorResponse` and lists its codes. `SplitCreate` and `TransactionCreate` are published with `additionalProperties: false`. |
| E7 | Concurrency on friends (live uvicorn :8766, stopped by PID, DB deleted) | 5 rounds × 20 parallel `POST /friends` with case/accent variants of one name | each round: exactly **1 × 201 + 19 × 409** |
| E8 | Concurrency on transactions (same server) | 5 rounds × 30 parallel split expenses; 5 mixed rounds (transactions + adjustments + friends) | **181 × `500 internal_error`**. 120 of the 150 split expenses failed, and so did 48 of the 50 transactions in the mixed rounds. Adjustments and friends: 0 failures. Log: `sqlite3.OperationalError: database is locked` at `services/transactions.py:176`. See **M1**. |
| E9 | Isolating E8 | 3 × 20 parallel requests for each request shape, and 30 pairs of 2 parallel split expenses | Unsplit expense with no `category_id` (no read before the write): 60/60 → 201. With `category_id` or `split` (a read before the write): about 85% → 500. **2 parallel split expenses: 25 of 60 → 500.** Every 500 returns within about 0.1 s, well before the 5 s busy timeout. |
| E10 | `checks.sql` after writes | Run on the probe DB (300+ API transactions) and on the live DB after E8 (197 transactions, 78 shares) | **0 rows** in every check. `PRAGMA integrity_check` ok, `foreign_key_check` empty, and no split transaction without its share, so the failed requests rolled back cleanly. |
| E11 | Static checks | grep in `backend/app` | No `float`, `round(`, `Decimal` or `/` on amounts (only `//`). No f-string, `.format` or `%` SQL. The only concatenations (`services/balance.py:126`, `:149`) join constant SQL text, as in 003. Services import no FastAPI/Starlette code, and routers contain no SQL. |

## 1. Spec Compliance

- [x] **AC1: Pass.** `POST /transactions` returns `201` with the AC5 detail for an expense (split or not) and for an income. `occurred_on` defaults to Brasília today (`2026-10-17`), and `created_at` comes from the column default (E2; `test_create_minimal_expense_returns_detail_with_defaults`, `test_create_income`).
- [x] **AC2: Pass.** The PDF example R$ 100,00 equal → 5000/5000 with `em_aberto` and `settled_on: null`. 10001 equal → 5000/5001. 1 cent equal → 0/1. Percentage 0/1/33/50/100 % on 10001 → 0/100/3300/5000/10001. Fixed 1 and fixed = amount accepted. friend + user = amount in 300/300 random API cases (E2, E3) and in the pure-function property tests (`test_split.py:122-142`). Integer math only (`services/transactions.py:42,49`).
- [x] **AC3: Pass (functionally).** Each case returns `422`:
  - **1-to-1 rule:** an income with a split; `split` as a list (one or two items); `person_ids`, `person_id: [1,2]` and `person_id_2`; top-level `friends`/`splits`; `user_share_cents` inside `split`.
  - **Extra fields:** `status`, `created_at` and `id` (`extra="forbid"`, `schemas.py:189`, `:213`).
  - **Amounts:** 0, −1, 10¹²+1, 2⁶³, 10⁴⁰, `100.0`, `10.5`, raw `1e3`, `"100"`, `true`, `null`.
  - **`percent`:** float, string, bool, 101, −1, missing, or sent in `equal`/`fixed` mode.
  - **`share_cents`:** sent in `equal`/`percentage` mode, 0, above the amount, missing, float or string.
  - **`mode`:** an unknown or uppercase value. **`person_id`:** 0, −1, `"1"`, 2⁶³ or `null`.
  - **`category_id`:** 0 or `"1"`.
  - **Dates:** tomorrow and `9999-12-31` (code `future_date`); a Unix timestamp as int or string, an ISO datetime, a `Z` suffix, 30 February, `dd/mm/yyyy`, full-width or Arabic-Indic digits, a trailing newline, year 0000, an empty string.
  - **Installments:** only one of the two fields, 0/3, 4/3, 1/361, a float.
  - **Required text:** empty, spaces, ZWSP, ZWJ/BOM/WJ, NBSP/U+3000, control characters or LRM/RLM only; 121 characters; a number; `null`.
  - **Other:** an unknown `type`/`payment_method`, notes 501, place 121, an array body, an empty body, malformed JSON, no body.

  The codes `friend_not_found` and `category_not_found` are confirmed. The accepted boundaries are 120 characters, 120 emoji and 10¹², and the trimming counts code points like SQLite `length()` (120 NFD `é` = 240 code points → 422). See m2 for the undocumented `future_date` code and m4 for the invisible "letters" that still pass.
- [x] **AC4: Pass.** Ordered by `(occurred_on DESC, id DESC)` (verified over the whole list). Each item has `type`, `description`, `amount_cents`, `own_share_cents`, `category_name`, `occurred_on`, `friend_name` and `split_status` (E2; `test_list_own_share_and_friend_match_independent_rows`).
- [x] **AC5: Pass.** Every `transactions` column is in the detail, with `split_mode`/`split_percent` moved into the `split` block together with `person_id`, `person_name`, `friend_share_cents`, `user_share_cents`, `status` and `settled_on`. An unknown id or 2⁶³−1 → `404 not_found`. An id of 0, −1, `abc`, `1.5`, 2⁶³ or `1e3` → `422 validation_error`.
- [x] **AC6: Pass.** `GET /friends` is sorted ignoring case and accents (`Álvaro` comes before `Ana Lima`). `POST` trims (`"  Álvaro ​"` → `Álvaro`) and accepts 60 characters or 60 emoji. These return `409 friend_exists`: `ana lima`, `ANA LIMA`, `Âna Lima`, `Ána Lîmá`, NFD `Álvaro`, full-width `ａｎａ ｌｉｍａ`, NBSP inside the name. Empty, blank, zero-width-only, 61 characters, `null`, a number and a list → 422. Under 20 parallel variants, exactly one is created (E7). A new friend can be used in a split immediately. See m3.
- [x] **AC7: Pass.** The month, `budget_cents`, own-share `spent_cents`, a negative `remaining_cents` and floor `used_percent` all match the independent computation (E4, E5). The zero-budget rule is covered by `test_zero_budget_does_not_divide_by_zero`.
- [x] **AC8: Pass.** The balance moves by the full amount and the budget by the user's share only, in every mode. An income moves only the balance. A past-month expense moves only the balance (E5; `test_budget.py:47-105`).
- [x] **AC9: Pass.** Every documented error is `ErrorResponse`, including on the 003 routes, and no `HTTPValidationError` remains (E6; `test_errors.py:81-100`). This closes 003 m1.

**Data Rules:** pure `friend_share()` is tested without a DB (`test_split.py`). `share_cents` stores the friend's share, and the user's share is computed as `amount − share` (`services/transactions.py:144`; `LIST_SQL`, `BUDGET_SQL`). Each "Added during implementation" limit (installments 1–360, ids 1..2⁶³−1, `YYYY-MM-DD` only, invisible trimming, zero-budget percent) was verified in E2. The stored friend name keeps what was typed. **Pass.**

**003 carry-overs:** m1 is closed (AC9). m2 is closed: `AdjustmentCreate.reason` is now `VisibleText` (`schemas.py:140`), and ZWSP-only, mixed-invisible and 9-visible-characters-plus-padding reasons are rejected (`test_balance.py`). m3 (Rule 18 wording), m4 (003 T4b) and m5 (contiguous Business Rules table) are also fixed.

## 2. Security & Data Consistency

- [x] **Parameterized SQL** everywhere (E11). SQL-injection text is stored literally (E2).
- [x] **Edge cases.** Zero, null, bool, float, string, huge ints, containers, bad dates and invisible text are all covered (E2). Errors use the standard shape with pt-BR messages, and nothing leaks (a 500 is the generic `internal_error`).
- [x] **Data consistency.** `checks.sql` returns 0 rows after hundreds of API writes, including after the failed concurrent writes (E10). Shares always sum to the total (E3). The balance is recomputed from rows, and the budget counts only the own share (E4).
- [ ] **Write safety under concurrency: Fail.** Concurrent transaction creation returns 500 (M1).
- [x] **Strict 1-to-1.** `SplitCreate` holds one scalar `person_id`, and `extra="forbid"` is set on both models. No list or group logic exists in schemas, services or SQL, and the schema's `UNIQUE (transaction_id)` is untouched.

## 3. Structural & Stack Rules

- [x] **Layers.** Routers only parse, call a service and return a schema. Services do not import FastAPI. `friend_share` is pure.
- [x] **Files.** Every new file (`services/friends.py`, `routers/friends.py`, `routers/transactions.py`, `services/transactions.py`, four test files) is in the plan and in `repository-structure.md`, which was updated in `1b0e856`. `schemas.py` has 295 lines, under the ~300-line split rule. There are no new dependencies (`unicodedata` and `re` are stdlib).
- [x] **Scope.** There are no PUT/PATCH/DELETE routes for transactions or friends (405/404), no category suggestion, no status change, no filters, and no chart data. The `frontend/` diff is empty.
- [x] **TypeScript.** Not applicable: no frontend changes.
- [x] **Process.** The spec and plan were approved (`8b31d8b`) before product code (`925c60a`). Commits are conventional with scopes. No `.db`, `.env` or `node_modules` is tracked.

## Findings

### Blocker

None.

### Major

- **M1. Concurrent `POST /transactions` fails with `500 internal_error`.** `backend/app/services/transactions.py:168` opens a deferred `BEGIN`. The `SELECT`s at `:171`/`:173` then take a SHARED lock, and the `INSERT` at `:176` must upgrade it to RESERVED. If another connection is writing at that moment, SQLite returns `SQLITE_BUSY` immediately to avoid a deadlock. It does not invoke the busy handler, so the 5 s timeout never helps. Evidence (E8, E9):
  - 181 of 200 concurrent transaction requests failed, all at `:176`, each in about 0.1 s.
  - Even **2** simultaneous split expenses fail about 40% of the time (25 of 60).
  - Unsplit expenses without a category, which do no read before the write, never fail (60/60).

  No data is corrupted, because the rollback works (E10). However, Business Rule 17 makes this a shared public demo, and logging an expense is the core US01 action, so two visitors saving at the same moment get "Erro interno do servidor". The other two write paths already avoid this with `BEGIN IMMEDIATE` (`services/friends.py:36`, `services/balance.py:139`), and so does the 003 audit E8–E10 pattern.

  **Fix:** use `conn.execute("BEGIN IMMEDIATE")` at `transactions.py:168`. Add a regression test that runs parallel `POST /transactions` with a split, for example threads over the TestClient with a file DB, and asserts no 500.

### Minor

- **m1. Past and same-day transactions rewrite the displayed adjustment history (decision needed, from 003's design).** `services/balance.py:62-66` counts every movement dated `<= date(adjustment.created_at)`. Before 004, no API could create transactions, so the history was stable. Now it changes after the fact.
  - Evidence: I set the balance to `123456` through `POST /balance/adjustments` and then created a R$ 1,00 expense the same day. The history entry then showed `new_balance_cents` `123356`, a value the user never typed (Business Rule 12).
  - A back-dated expense (the 2020 case in E5) shifts every later adjustment the same way.
  - The newest entry still equals `GET /balance`, so the spec's Decision "Reject future dates" holds, and `test_back_dated_expense_keeps_history_consistent` checks only that invariant.

  This is not a 004 acceptance-criterion failure, but it will appear in a typical demo flow (adjust, then add an expense). **Fix:** record it in `context.md` Open Questions for a user decision. One option is to compare `transactions.created_at` with the adjustment's `created_at` for same-day movements, or to order movements by `created_at` throughout.
- **m2. `future_date` is missing from the spec contract.** `docs/specs/004-split/spec.md:47` lists `validation_error`, `friend_not_found` and `category_not_found`, and AC3 (`spec.md:23`) names no code. The API returns `future_date` (`services/transactions.py:159`), and Swagger documents it. The phase 2 TS service layer should be able to rely on the spec, so add `future_date` to the table.
- **m3. Internal invisible characters bypass the duplicate-friend check.** `normalize_text` (`services/friends.py:10-18`) removes accents and case but keeps format characters. `"A​na Lima"` was created (`201`) and renders identically to the seeded `Ana Lima`, so the friend picker would show two identical names. `"Ana  Lima"` (double space) is also accepted. That is allowed by the spec's "case and accents" wording, but worth noting. **Fix:** in `normalize_text`, also drop `Cf` characters and collapse internal whitespace. 005 reuses this helper for keywords, so the fix pays off twice.
- **m4. Invisible "letter" characters still pass `VisibleText`.** `schemas.py:73-77` treats only `Cc/Cf/Zs/Zl/Zp` as invisible. A description of `"ㅤㅤ"` (Hangul filler, category `Lo`) or `"⠀⠀"` (Braille blank, `So`) is accepted and renders blank. The risk is low, and this is outside the literal AC3 wording ("including zero-width characters"). **Optional fix:** add these few code points (U+115F, U+1160, U+3164, U+FFA0, U+2800) to the invisible check.
- **m5. `FriendCreate` ignores unknown fields (informational).** `schemas.py:157` lacks `extra="forbid"`, so `{"name":"Zé","id":1}` returns `201` and ignores `id`. This is harmless (the id is assigned by the DB) but inconsistent with `TransactionCreate`. No action required.

## Verdict

**CHANGES REQUIRED**

All nine acceptance criteria, the Data Rules and the 003 carry-overs pass. The evidence is 433 passing tests, about 150 adversarial requests, 300 random split checks and an independent recomputation of the budget and balance. Scope, layers and parameterized SQL are clean, and `checks.sql` stays at zero rows. Only **M1** blocks PASS: concurrent `POST /transactions` returns 500 even with two simultaneous requests, which a shared public demo will hit. The fix is one line plus a regression test, after which the auditor re-checks E8/E9. m2 should be fixed in the same pass (spec text only). m1 needs a user decision and should go to Open Questions. m3 and m4 can go with 005, which reuses `normalize_text`.

---

## Re-audit

Auditor: `auditor` agent | Date: 2026-10-17 | Branch: `feature/mvp-plan` | Commits re-audited: `f0862e8..46683a7` (`6b99872` docs, `d905ee6` fix(api), `a2d67a1` fix(api), `ab955ee` fix(api), `46683a7` docs). Files changed: `db.py`, `schemas.py`, `services/{balance,friends,transactions}.py`, `sql/seed.sql`, four test files, and `spec.md`. The `frontend/` diff is empty.

### Evidence

| # | Check | Command / method | Result |
| --- | --- | --- | --- |
| R1 | Test suite | `cd backend && .venv/bin/pytest -q` | **461 passed** (433 before), 1 unrelated httpx deprecation warning. |
| R2 | Do the regression tests catch the bugs? | Mutation runs on a scratch copy of `backend/`: (a) `BEGIN IMMEDIATE` → `BEGIN` in `create_transaction`; (b) `COUNTS_FOR_ADJUSTMENT` → the old `occurred_on <= date(created_at)`; (c) `t.created_at <= r.created_at` → `<` | (a) both `test_parallel_*` tests fail. (b) 3 history tests fail (`test_same_day_expense_…`, `test_same_day_income_…`, `test_history_matches_independent_computation_after_new_transactions`). (c) 1 test fails (the independent computation). Every mutation is caught. |
| R3 | Concurrency, earlier scripts (live uvicorn :8766, PID 20432, scratch DB) | `conc.py` and `conc2.py`, unchanged from E7–E9 | Friends: 5 × (1 × 201 + 19 × 409), unchanged. Split expenses: **150/150 → 201** (was 120 × 500). Mixed: **150/150** created. E9 shapes: 3 × 20 for each shape → **180/180 → 201**. 30 pairs of 2 → **60/60 → 201** (was 25 × 500). |
| R4 | Concurrency, larger mixed burst | New `reaudit/conc3.py`: 4 rounds × 80 parallel requests (split expenses with a category, incomes, adjustments, friends, `PATCH /profile`, and the three GETs) | **0 × 5xx** in 320 requests. One `422` on an adjustment: a parallel `PATCH /profile` happened to move the balance onto that request's target (`no_change`, the same case `test_parallel_mixed_writes_all_succeed` allows for). The slowest request took 3.28 s, under the 5 s busy timeout. The uvicorn log has no `Traceback`, `locked` or `500` lines. Status totals: 163 × 200, 704 × 201, 95 × 409, 1 × 422. |
| R5 | `checks.sql` after R3/R4 | All 11 checks on the live DB (589 transactions, 377 shares, 91 adjustments, 103 friends) | **0 rows**. `integrity_check` ok, `foreign_key_check` empty, and every split transaction has its share. |
| R6 | History vs an independent computation after R3/R4 | `reaudit/hist.py`: the spec 004 rule computed in Python from raw rows and compared with `GET /balance/adjustments` | **0 mismatches** over 91 entries. `new − previous = delta` holds for every entry, and the newest entry equals `GET /balance` (no later same-day entry). |
| R7 | m1 decision, live server | `reaudit/m1.py` | Typed 123456. After waiting for the next second, an expense, an income and a split expense dated today were added: the entry is still **123456** and equals the original response, while `/balance` = 122386. A back-dated expense (yesterday, 200) shifts it to **123256** (`delta` unchanged, previous shifted). A 2020 expense shifts it again by 5. Tomorrow → `422 future_date`. An expense created the same day *before* a new adjustment counts, so that entry equals the typed 200000 and `/balance`. **Same-second tie:** an adjustment and an expense created in the same second (`18:38:11`) → the entry shows 299989, so the tie counts as before, as the spec says. |
| R8 | Seed boundary sweep (new) | `reaudit/boundary2.py`: schema + seed with `'now'` pinned to 5,849 instants (every day of 2026–2027 at 8 UTC times, including 02:59:59/03:00:00 and 20:59:59/21:00:00, plus month, year and leap-day edges) | **0 failures.** In every run: `checks.sql` 0 rows; each seeded `created_at` is on its `occurred_on` day, valid `YYYY-MM-DD HH:MM:SS`, never after Brasília now, and 08:00–17:59 unless it is a row dated today capped at now (3,422 capped rows, all equal to Brasília now). The history is positive (min R$ 3.100,35) and **identical, row for row, to the pre-fix date-only rule**, so the seeded history keeps its values. |
| R9 | Seed boundary sweep (earlier) | `boundary.py` (E-series from 003/004) | 5,480 runs, **0 failures**. Running balance positive every day, current balance 706397, ranges and month coverage unchanged. |
| R10 | Adversarial probe subset | `probe.py` (≈145 checks) and `budget.py` re-run on scratch DBs | 143 OK. The one FAIL (`"é" * 120` → 201) is a probe artifact: the script's literal is NFC (`303 251`), not NFD. A direct check gives NFD `é` × 120 (240 code points) → **422**, NFC × 120 → 201, NFC × 121 → 422, so this is unchanged from E2. `budget.py`: every AC8 delta is unchanged, and the independent budget and balance still match. |
| R11 | m3/m4/m5 probes | TestClient on a scratch DB | Covered under "Earlier findings" below. |
| R12 | Swagger | `/openapi.json` (live) | No `HTTPValidationError`. `POST /transactions` 422 lists `validation_error, future_date, friend_not_found, category_not_found`. `FriendCreate.additionalProperties` is `false`. |
| R13 | Static checks | grep in `backend/app` | No `float`, `round(`, `Decimal`, f-string or `.format` SQL. The new `COUNTS_FOR_ADJUSTMENT` concatenation is constant SQL text, and the adjustment values stay bound in the correlated subquery (no user input). Every write path (`create_transaction`, `create_friend`, `create_adjustment`, `set_initial_balance`) now starts with `BEGIN IMMEDIATE`, and `db.connect` sets `timeout=5.0` (`PRAGMA busy_timeout` = 5000, tested). |

Clean-up: uvicorn was stopped with `kill 20432` (it was not running afterwards), and the scratch DBs and mutation copy were deleted.

### Earlier findings

- **M1 (concurrent `POST /transactions` → 500): Fixed.** `services/transactions.py:173` uses `BEGIN IMMEDIATE`, and `set_initial_balance` was aligned (`services/balance.py:115`). R3/R4 show 0 × 500 over 960 concurrent requests (640 in R3, 320 in R4), with no lock errors in the log. Two regression tests (`test_parallel_split_expenses_with_category_all_succeed`, `test_parallel_mixed_writes_all_succeed`) use a real DB file and fail if the fix is reverted (R2).
- **m1 (history rewritten by same-day entries): Resolved.** The decision is recorded in the spec Data Rules (`spec.md:41`), including the same-second tie, and implemented in `services/balance.py:51-54` (`COUNTS_FOR_ADJUSTMENT`) exactly as written (R6, R7). Back-dated entries still shift history, as stated. Choosing `<=` for the tie is the right call: it keeps an entry equal to `/balance` at the moment it was created, even when an earlier write landed in the same second, and the UI cannot normally save an adjustment and then an expense within one second. Without the seed change, every seeded movement would look newer than the adjustment of its day. `seed.sql:206-210` handles this, and R8 shows the seeded history is unchanged and positive on every start date. `test_seed_transactions_were_recorded_on_their_day_during_the_day` pins this. See n1 for one stale sentence.
- **m2 (`future_date` missing from the spec): Fixed.** It is now in AC3 (`spec.md:23`) and in the API Contract errors (`spec.md:48`).
- **m3 (invisible characters bypass the duplicate-friend check): Fixed.** `normalize_text` drops `Cf` and collapses whitespace (`services/friends.py:10-26`). These now return `409`: `A​na Lima`, `Ana  Lima`, `Ana\t Lima`, ` Ana　Lima​`, `A­na Lima`, `Ana ‎ Lima`, `Ana‮Lima`, `ANA LÍMA`, `Ana Limá`, `novo  amigo` vs `Novo Amigo`. `Ana⁠Lima` and `Novo​Amigo` are still created, which is correct: they render as `AnaLima`/`NovoAmigo` (no space), so they are different names. The stored name keeps what was typed. See n2 for one residual.
- **m4 (invisible "letters" pass `VisibleText`): Fixed.** `U+115F/U+1160/U+3164/U+FFA0/U+2800` are trimmed (`schemas.py:75`). `⠀⠀`, `ᅟ`, `ﾠ ᅠ` and `ㅤ × 12` are rejected as a description, friend name or adjustment reason. `place`/`notes` made only of them become `null`, and `ㅤx` → `x`. An internal ZWSP inside a description is still kept, as before.
- **m5 (`FriendCreate` ignores extra fields): Fixed.** `extra="forbid"` (`schemas.py:161`). `{"name","id"}`, `{"name","extra"}` and `{"name","Name"}` → 422, and Swagger publishes `additionalProperties: false`.

**Nothing loosened.** Every earlier probe outcome holds (R10): 1-to-1 bypasses, money types, dates, ids, invisible text, the error shape and AC8 deltas. The suite grew from 433 to 461 tests and none were removed. The test diff only adds tests, apart from `expected_parts` in `test_balance.py`, which was updated to the new rule and still reads raw rows independently of the service SQL. No scope creep: no PUT/PATCH/DELETE on transactions or friends, no group logic, and no frontend changes.

### New findings

No blocker or major findings.

- **n1. One sentence in the spec Decisions is now stale (docs, minor).** `spec.md:69` justifies "Reject future dates" with "newest adjustment equals the current balance". Under the new Data Rule, that is no longer always true: R7 shows the entry at 123456 while `/balance` is 122386 after a later same-day expense. The rule is still needed, because a future-dated movement would make an entry differ from the balance the user typed. **Fix:** reword it to "an adjustment's new balance equals the balance at the moment it was created (the 003 rule)". The comment in `test_back_dated_expense_keeps_history_consistent` (`test_transactions.py:675`) uses the same wording, and that test is still correct.
- **n2. Blank "letter" characters between words still bypass the duplicate check (optional).** `normalize_text` does not treat the five `INVISIBLE_CHARACTERS` as whitespace. `"AnaㅤLima"`, `"AnaᅟLima"` and `"Ana ⠀ Lima"` are created (`201`) and render almost like `Ana Lima`. Typing these takes deliberate effort, so the risk is very low. **Optional fix (with 005, which reuses the helper):** map `INVISIBLE_CHARACTERS` to a space in `normalize_text` before `split()`.
- **n3. Carry-forward for 006 (informational).** `pago` shares still use the date rule (`settled_on` has no time, `services/balance.py:76`). When 006 adds status changes, marking a share `pago` later on the same day as an adjustment will shift that entry's typed balance, which is the m1 effect for reimbursements. 006 should decide this explicitly, for example by recording a settlement timestamp or accepting it. Add it next to the `settled_on` note in `context.md:102`.
- **n4. Housekeeping (informational).** `schemas.py` is at exactly 300 lines, the "about 300 lines" split threshold (`repository-structure.md:99`). Plan the split before 005 adds its schemas. The m1 decision is in the spec, but `context.md` has no matching note. If the user has not seen this refinement of their 003 rule, confirm it with them, since CLAUDE.md requires that conflicts with approved documents go to the user.

### Re-audit verdict

**PASS**

M1 is fixed and pinned by regression tests that fail if it is reverted. There were 0 server errors across 960 concurrent requests, `checks.sql` returned 0 rows afterwards, and history matched the independent computation. m1 is implemented exactly as the spec now states (same-day entry after an adjustment keeps the typed balance, back-dated shifts it, same-second tie counts as before). The seed keeps a positive, unchanged history with valid Brasília `created_at` values on 5,849 pinned start instants. m2–m5 are fixed, and no earlier check regressed. n1 (one stale sentence) and n2–n4 do not block. n1 can be fixed with the next docs commit, and n2/n3 belong to 005/006.
