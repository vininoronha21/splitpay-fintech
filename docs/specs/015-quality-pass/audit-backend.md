# 015 Quality Pass — Backend Audit

Auditor: `auditor` (backend). Scope: all of `backend/app`, `backend/sql`, `backend/tests` and the config, on `feature/mvp-plan` at `74b0a4e`. I did not change any product code. Scratch files are in `/tmp/claude-0/-home-claude-splitpay-fintech/03833dd2-2eab-509b-b278-e168f70beef2/scratchpad/audit015be/` (`$S` below). The live server ran on port 8001 with `DATABASE_PATH=$S/be.db` and is now stopped.

## Evidence

| # | What | How | Result |
| --- | --- | --- | --- |
| E1 | Test suite | `.venv/bin/pytest -q`, also with `TZ=Pacific/Kiritimati` and `TZ=America/Sao_Paulo` | **743 passed** in each TZ. |
| E2 | Seed at every start time (`$S/seedsim.py`) | schema + seed with `'now'` pinned to 4,386 UTC instants: every day of 2026–2027 at 00:00:01, 03:30, 10:00, 12:05, 18:00 and 23:59:59 | **0 problems.** `checks.sql` returns 0 rows each time. No date or timestamp is in the future. Every `created_at` falls on its `occurred_on` day. The running balance never goes negative, and neither does any adjustment's previous or new balance. The current week, month and year have expenses, month −9 is empty, and nothing is older than 12 months. |
| E3 | Fuzz (`$S/fuzz.py`) | 5,000 random or edge requests on every endpoint through TestClient: bad types, ±10¹², 2⁶³, floats, bools, invalid dates, unknown fields, invisible text, SQL text, unknown ids | **No 5xx.** Every 4xx used the `{"error":{"code","message"}}` shape. The only exceptions came from httpx refusing to send `\n` or NUL in a URL (client side). After the run, `checks.sql` returned 0 rows and `/balance` matched the balance recomputed from rows. |
| E4 | Concurrent random writes (`$S/burst.py`) | 16 threads × 200 mixed requests on the live server (expenses with each split mode including 0%/100%/fixed=total, settles, adjustments, duplicate friends and rules, reads) | Each split share was `friend_share()` and friend + user = total. `checks.sql` returned 0 rows, `PRAGMA integrity_check` was ok, and `/balance` = recomputed balance. `/budget.spent` = own share for the month. For week/month/year at offsets 0 and −1, the chart total = Σ categories = Σ items = DB own share, and Σ by_person = Σ shares. The summary matched the open rows. **But 11 requests returned 500** (see m1). |
| E5 | Lock isolation (`$S/lockrepro.py`, `$S/grow.py`) | Fresh seed, 8 writers + 8 `GET /balance/adjustments` readers; then the same after 300 adjustments + 1,500 expenses (7.8 s of sequential requests) | Fresh: 160/160 × 201. Grown: **18/160 writes and 26 reads → 500 `database is locked`**. The same load against a scratch copy of the app with `PRAGMA journal_mode=WAL` (`$S/walserver.py`): **80/80 and 160/160 × 201**. |
| E6 | History cost (in-process) | `list_adjustments` on adjustments × transactions | 100×500: 0.09 s. 300×1,500: 0.81 s. **1,000×5,000: 7.9 s.** A one-pass prototype query returned identical rows in 30 random datasets (with the seed's `pago` shares and adjustments) and took 0.009 s at 1,000×5,000 (see m2). |
| E7 | Period bounds | `period_bounds` vs an independent computation for every day 2000–2030, offsets 0, −1, −2, −12, −13, −52, −519, −520 and a random one | 101,907 cases, 0 wrong. Weeks always start Monday and span 7 days. Months shift from the 1st. Years are 1 Jan–31 Dec. |
| E8 | Contract | `/openapi.json` vs `frontend/src/types/api.ts`, compared by a script | Every response and request schema has the same fields, required flags and nullability. `SplitCreate` is a TS discriminated union, and `ErrorResponse` is `ApiErrorBody`. The documented error statuses match the observed ones (404/409/422 per route). |
| E9 | SQL safety | grep for f-strings, `.format`, `%` and `+` near `execute` | Every SQL is a constant string. The only concatenations join constants (`HISTORY_SQL + " WHERE id = ?"`, `COUNTS_FOR_ADJUSTMENT`). Every value is bound with `?`. |
| E10 | CORS and HTTP | curl against the live server | Allowed-origin preflight → 200 with `allow-origin: http://localhost:4173`. Other origin → no `allow-origin` header. `text/plain` body → 422, so no CORS "simple request" write is possible. Unknown path → 404 JSON. Wrong method → 405 JSON. `/friends/` → 307 to `/friends`. Invalid UTF-8 body or broken JSON → 422 JSON. Offset −10²³ → 422. |

## Business rules checked

- **Rule 3 (balance):** `services/balance.py:25-38` matches the formula. It equals the recompute from rows after E3, E4 and E5.
- **Rules 12 and 19 (adjustments):** delta = typed − current inside `BEGIN IMMEDIATE`. In E5, the newest entry's `new_balance` equals the balance at the moment it was created. The same-second tie is the accepted 006 n1, not re-reported.
- **Rule 7 (split):** the split math is `//` on integers. Random API inputs, including 0%, 100%, 1 cent and fixed = total, all sum to the total (E4).
- **Rules 1, 5, 20 (settle):** settling uses one `UPDATE … WHERE status = 'em_aberto'`. Concurrent settles in E4 gave 200/409 with no double count. `pago` enters the balance and `acertado` does not. `settled_at` is never earlier than `created_at` (trigger plus checks).
- **Rules 5 and 16:** budget and charts use the own share. Charts' `by_person` sums all shares, as documented (E4).
- **Rules 9 and 18:** Monday weeks, months and years (E7). Brasília dates come from a fixed −3 h, independent of the server TZ (E1, E2).
- **Rule 8:** whole-word, accent-free matching with the user > longest > oldest order (`services/categories.py:42-60`). Covered by the suite.
- **Rule 11:** see m3.
- **Rule 14:** an income cannot carry a split (schema, Pydantic, trigger).
- **Overflow:** `MAX_CENTS` = 10¹² per value. Python adds the balance parts with unbounded ints. SQLite `sum()` would need about 9.2 million rows at the cap to overflow int64, so this is not reachable.

## Findings

### Minor

**m1. Under concurrent load, writes and reads can fail with `500 database is locked`, and the 500 also resets the client's keep-alive connection.**
- Where: `backend/app/db.py:13` (5 s busy timeout) and `:16-22` (default rollback-journal mode). Raised at `services/transactions.py:181` (`BEGIN IMMEDIATE`) and `services/balance.py:143` (history read). The response comes from `main.py:60`.
- Cause: in rollback-journal mode, readers and writers block each other. A writer has to wait until every reader is done before it can commit. While a slow read is running (`GET /balance/adjustments`, see m2), writers and new readers queue behind it. Once the wait passes 5 s, they get `sqlite3.OperationalError: database is locked`, which becomes a generic 500. The 003 note m6 ("cannot happen through the API alone") no longer holds.
- Reproduction:
  1. Start a fresh server on port 8001.
  2. Run `python $S/lockrepro.py x 8 8 20` → `{201: 160}`.
  3. Run `python $S/grow.py 300 1500` (300 adjustments and 1,500 expenses through the API).
  4. Run `python $S/lockrepro.py x 8 8 20` again → `{201: 126, 500: 18, exc: 16}`, p99 5.7 s. The server log shows `database is locked` 18× in `create_transaction` and 26× in `list_adjustments`.
  - Deterministic version: hold `BEGIN EXCLUSIVE` from another sqlite3 connection, then `POST /friends` → 500 after 5.0 s. The next `GET /health` on the same httpx client → `ConnectionResetError` (uvicorn closes the connection after an unhandled exception). A fresh connection → 200.
- Expected: a burst of a few dozen visitors does not produce 500s, and reads never fail because of writes.
- Fix (verified in scratch, E5):
  1. Turn on WAL once in `init_db`, after the unlink: `conn.execute("PRAGMA journal_mode=WAL")`. In WAL mode readers never block writers, and the setting is persistent, so `connect` needs no change.
  2. Also unlink `path + "-wal"` and `path + "-shm"` in `init_db`, and add `*.db-wal` and `*.db-shm` to `.gitignore`.
  3. Optional: map `sqlite3.OperationalError` "database is locked" to `503 {"error":{"code":"busy","message":"Muitas requisições ao mesmo tempo. Tente de novo."}}`, so a timeout is not shown as an internal error.
  - Why WAL: it is one pragma and the standard SQLite answer to concurrent readers. The simpler alternative, a longer busy timeout, only delays the same failure. Add a short note to `context.md`.

**m2. `GET /balance/adjustments` is quadratic (adjustments × transactions) and slows the shared demo as data grows.**
- Where: `backend/app/services/balance.py:57-91` (`HISTORY_SQL`). Each adjustment runs three correlated subqueries over transactions and shares.
- Reproduction (E6): fill a DB with N adjustments and M same-day expenses and time `list_adjustments`: 300×1,500 → 0.81 s; 1,000×5,000 → **7.9 s**. A read longer than the 5 s busy timeout makes m1 certain. The public demo shares one DB (Rule 17), so one script can get there in about a minute.
- Expected: roughly linear time. The Configurações history should load in milliseconds.
- Fix: one ordered pass. A movement counts for an adjustment if and only if `(occurred_on, created_at) <= (date(adj.created_at), adj.created_at)`. That tuple comparison is exactly `COUNTS_FOR_ADJUSTMENT`, and for a `pago` share the key is `(date(settled_at), settled_at)`. So merge all events and take a running `sum() OVER (ORDER BY day, ts, kind, id)`, with movements (kind 0) before adjustments (kind 1) on an equal key. My prototype (in `$S`, E6) matched `HISTORY_SQL` row for row in 30 random datasets and took 0.009 s at 1,000×5,000. Keep the existing history tests as the oracle. If the team prefers to keep the current query, record the growth limit in `context.md` instead (Rule 10 already restarts the API before the demo).

**m3. Combining and ignorable characters pass `VisibleText` and the duplicate-friend check (Rule 11).**
- Where: `backend/app/text.py:13` and `:36-54`. Only `Cc/Cf/Zs/Zl/Zp` plus 5 fillers count as invisible. `normalize_text` drops combining marks only after NFKD and keeps U+034F, U+FE0F and U+17B4, which have combining class 0. Used by `schemas/common.py:65` and `services/friends.py:28`.
- Reproduction (live API):
  - `POST /friends {"name":"Ana Lima͏"}` → **201**. So do `"Ana Lima️"` and `"Ana͏ Lima"`. `GET /friends` then lists four entries that all render as "Ana Lima" (ids 1, 13, 14, 15).
  - `{"name":"́"}`, `"͏"`, `"️"` and `"឴"` → **201** each, all blank-looking names.
  - `POST /transactions` with `description` `"́"` → 201. An adjustment `reason` of `"́"*10` is accepted by the same type.
  - Expected: 409 `friend_exists` for the look-alikes and 422 for the blank names, the same as the already-fixed U+200B and U+3164 cases (004 m3/m4).
- Fix in `text.py`:
  1. Treat Unicode `Default_Ignorable_Code_Point` characters as invisible: U+034F, U+115F–1160, U+17B4–17B5, U+180B–180F, U+3164, U+FE00–FE0F, U+FFA0, U+E0100–E01EF, plus the existing Cf set. Trim them and drop them in `normalize_text`.
  2. In `VisibleText`, also reject a value whose `normalize_text` is empty. That covers names made only of combining marks such as U+0301.
  3. Add these cases to `test_text.py` and `test_friends.py`.

### Informational (no action required)

- **i1. The API accepts any past `occurred_on`, the form only 2000 and later.** `schemas/transactions.py:20-30,69`: `POST /transactions {"type":"income","description":"Antiga","amount_cents":1,"occurred_on":"0001-01-01"}` → 201. The row counts in the balance, but no chart period can reach it (offset ≥ −520). The frontend enforces `min="2000-01-01"` (010 C6). Optional: add the same lower bound in Pydantic so the contract is the same on both sides.
- **i2. A disallowed CORS preflight returns Starlette's plain-text `400 Disallowed CORS origin`,** not the JSON error shape. Browsers never show this body to the page. No action.
- **i3. Deploy note for phase 3:** `config.py:6` compares `FRONTEND_ORIGIN` as one exact string. A trailing slash or a Vercel preview URL silently blocks CORS. Document the exact value in the deploy notes.
- **i4. `init_db` assumes the parent directory of `DATABASE_PATH` exists.** Startup fails if it does not. This does not matter with the default path.

## Not findings (checked and correct)

- No stack trace or SQL appears in any error body (E3, E5: the 500 body is the generic JSON).
- `checks.sql` returned 0 rows on a fresh DB (E2), after the fuzz (E3), after the bursts (E4) and after the lock failures (E5). A failed write never left partial rows, because every write is one transaction.
- Concurrent settles, adjustments, duplicate friends and duplicate rules each have exactly one winner (E4, plus the existing parallel tests).
- Server TZ does not affect anything (E1).

## Summary

| ID | Severity | Area | File:line | Status |
| --- | --- | --- | --- | --- |
| m1 | minor | Concurrency / ops | `backend/app/db.py:13,16-33` | Open: WAL + 503 mapping |
| m2 | minor | Performance / data integrity under load | `backend/app/services/balance.py:57-91` | Open: one-pass history, or record the limit |
| m3 | minor | Validation, Rule 11 | `backend/app/text.py:13,36-54` | Open: ignorable chars + non-empty normalized text |
| i1 | info | Contract | `backend/app/schemas/transactions.py:69` | Optional |
| i2 | info | CORS | Starlette `CORSMiddleware` | None |
| i3 | info | Deploy config | `backend/app/config.py:6` | Phase 3 note |
| i4 | info | Startup | `backend/app/db.py:25-27` | None |

No blockers and no majors. Business Rules 1, 3, 5, 7, 8, 9, 12, 14, 16, 18, 19 and 20 hold under random and concurrent input. Money stays exact, SQL is parameterized everywhere and the seed is consistent at every start time.

**Verdict: CHANGES REQUIRED.** Per spec AC3, m1–m3 are fixed in T4 or recorded with a reason in `docs/context.md` Open Questions. After the fixes, the closing check re-runs E1, E5 (with `grow.py`), E6 and the m3 reproductions.
