# 005 Categories — Audit Report

Auditor: `auditor` agent | Date: 2026-10-17 | Branch: `feature/mvp-plan` | Commits audited: `f9fc707..a707a18` (`e561568` refactor(api), `7215156` feat(api), `4d49e67` feat(api), `a707a18` docs). The `frontend/` diff is empty.

Runtime: Python 3.13.16, SQLite 3.45.1, Pydantic 2.14.1, FastAPI 0.143.3.

## Evidence Gathered

| # | Check | Command / method | Result |
| --- | --- | --- | --- |
| E1 | Test suite | `cd backend && .venv/bin/pytest -q` | **565 passed** (461 at `f9fc707`), 1 unrelated httpx deprecation warning. Each commit is green on its own: `e561568` 483, `7215156` 524, `4d49e67` 565. |
| E2 | T1 is a refactor | The 461 tests from `f9fc707`, unmodified, run against the `HEAD` code | **461 passed**. `from app.services.friends import normalize_text` still resolves, because it is re-imported from `app.text`. |
| E3 | T1 contract unchanged | `app.openapi()` dumped at `f9fc707` and at `HEAD`, then diffed | Every pre-existing path and component schema is **identical**. The only additions are the 4 `/categories*` paths and the 4 `Category*` schemas. No `HTTPValidationError` anywhere. |
| E4 | T1 intended change (closes 004 n2) | TestClient, `POST /friends` | `AnaㅤLima`, `AnaᅟLima`, `Ana ⠀ Lima`, `AnaﾠLima` and `AnaᅠLima` now return `409 friend_exists`. `A​na Lima` and `ANA  LÍMA` still return 409, and `Ana⁠Lima` is still 201 (same as the 004 re-audit). A description made only of `ㅤㅤ` or `⠀` is still 422. |
| E5 | Adversarial probe | `probe.py`: TestClient on a scratch DB, about 160 checks across all 5 endpoints | **0 failures.** Details in Sections 1 and 2. |
| E6 | Concurrency (live uvicorn :8777, PID 6293, scratch DB) | 5 rounds × 20 parallel `POST /categories/rules` with case/accent/punctuation/ZWSP variants of one keyword; 20 parallel `DELETE` of one rule; 3 rounds × 60 mixed requests (create, delete, suggest, list, split `POST /transactions`) | Create: **1 × 201 + 19 × 409** in every round. Delete: **1 × 204 + 19 × 404**. Mixed: 0 × 5xx (201 × 24, 200 × 24, 404 × 12 per round). No `Traceback` in the server log. Server stopped with `kill 6293`. |
| E7 | Is `BEGIN IMMEDIATE` load-bearing, and is it tested? | Mutation on a scratch copy: `create_rule`'s `BEGIN IMMEDIATE` → `BEGIN`. Ran the category tests, then the E6 create rounds on uvicorn :8778 (PID 7669, stopped by PID) | Tests: **82/82 still pass**. Live: **41 × `500 internal_error`** in 100 requests (`sqlite3.OperationalError: database is locked`). See **m1**. |
| E8 | Do the tests pin the matching rules? | Mutations of `services/categories.py` | Reversed id tie-break → 1 failure. Shortest-wins → 4 failures. Dropping user-over-default → 2. Substring matching → 4. Allowing a default delete → 1. Dropping the 40-character check → 2. Every one is caught. |
| E9 | Raw HTTP (live :8777) | curl and `http.client` | `%FF%FE` → 200 (null suggestion). `%ED%A0%80janta` → 200 Alimentação. `%00` → 422. `janta%00` → 200. `%` and `%zz` → 200 (null). `description` with no value, `=`, `+++` and `%E3%85%A4` → 422. Repeated `description=a&description=` → 422 (the last value wins). 8 KB and 60 KB → 422. 200 KB and 2 MB URLs → uvicorn's plain `400 Invalid HTTP request` before the app. A 1 MB keyword body → 422. A body with invalid UTF-8 → `400 bad_request`. A duplicate JSON key → the last value wins. No 5xx. |
| E10 | `checks.sql` | All 11 checks on a fresh DB, on the probe DB, and on the live DB after E6 (73 rules, 105 transactions) | **0 rows** in every case. `integrity_check` ok, `foreign_key_check` empty. Every stored keyword equals `" ".join(words(keyword))`, for the 31 seeded rules and for every API-created rule. |
| E11 | Static checks | grep in `backend/app` | All SQL in `services/categories.py` uses `?` placeholders. The only concatenations (`LIST_RULES_SQL`, `RULES_WITH_CATEGORY_SQL + "WHERE r.id = ?"`) join constant text. There is no f-string, `.format` or `%` SQL. `services/` and `text.py` import nothing from FastAPI or Starlette. Routers have no SQL. There is no `float` or `round(` in the new code. |

## 1. Spec Compliance

- [x] **AC1: Pass.** `GET /categories` returns 8 `{id, name}` items in id order, with `Outros` (id 8) last.
- [x] **AC2: Pass.**
  - "Janta com a galera" → Alimentação, "Combustível" → Transporte, "Uber para o trabalho" → Transporte.
  - "JANTA", "Jãnta", "janta", NFD `Jánta`, full-width `ｊａｎｔａ` and math-bold `𝐣𝐚𝐧𝐭𝐚` → Alimentação.
  - "Bar do Zé" → Lazer (`keyword: "bar"`). "Barbearia" → all three `null` with `200`.
  - Missing, empty, spaces, ZWSP, Hangul filler and Braille blank → `422` `{"error":{"code":"validation_error","message":"Dados inválidos na requisição."}}`. 121 characters (ASCII or `é`) → 422. 120 characters, including with invisible padding → 200.
  - Punctuation, emoji and an internal ZWSP do not block a match (`JANTA!!!`, `🍔 janta 🍕`, `(janta)`, `Janta​ com`). Hangul and Braille blanks act as word separators (`x⠀janta⠀y` → Alimentação).
- [x] **AC3: Pass.**
  - User `janta galera` (Lazer) beats the default `janta` for "janta galera hoje".
  - The user rule `galera` beats the longer default `combustivel`.
  - Among user rules, the longer `janta galera` beats `galera`.
  - `uber eats` beats `uber` ("pedido Uber Eats" → Alimentação, "Uber para casa" → Transporte). `UBER-EATS!` and `uber_eats` also match `uber eats`.
  - Equal length: `abc` (lower id) wins for both "xyz abc" and "abc xyz".
  - `pick_rule` (`services/categories.py:58`) sorts by `(is_default, -len(keyword), id)`, as the plan says.
- [x] **AC4: Pass.** User rules come first, newest first. Then the 31 defaults, sorted by keyword. Each item has exactly `{id, keyword, category_id, category_name, is_default}`, and `is_default` is a JSON boolean.
- [x] **AC5: Pass.**
  - `"  Uber-Eats "` is a 409 against the stored `uber eats`. `"  Pão-de-Açúcar!! "` → 201, stored as `pao de acucar`, and it then matches "Passeio no Pao de Acucar".
  - `Ubér`, `UBER`, `Janta` (equal to a default) and `ac​ai` (after `Ａｃａｉ` was stored as `acai`) → `409 rule_exists`.
  - These → `422 validation_error`: `!!!`, `🍔🍕`, `---`, `_`, `__`, `…`, `©®`, ZWSP, `ㅤ`, `⠀⠀` and a lone surrogate. The message is "A palavra-chave precisa ter letras ou números e no máximo 40 caracteres." (or the generic one when the schema rejects first).
  - **40-character limit after normalizing:**
    - Accepted: 40 ASCII letters, `c`×20 + space + `c`×19, `d`×20 + `"  -  "` + `d`×19, `Ç`×40, NFD `é`×40 (80 code points raw), `ß`×20 (→ `ss`×20 = 40), `ﬃ`×13 (→ 39).
    - Rejected with 422, not 500: `b`×41, `ẞ`×21 (→ 42), `ﬃ`×14 (→ 42) and `ﷺ`×3 (each expands to 18 characters).
    - Python `len()` and SQLite `length()` both count code points, and `words()` never emits NUL, so the service check always runs before the DB `CHECK`.
  - Unknown `category_id` (999, 2⁶³−1) → `422 category_not_found`.
  - Bad bodies → `422 validation_error`: `category_id` of 0, −1, `"1"`, `1.0`, `true` or 2⁶³; a missing field; a non-string or `null` keyword; `is_default` or `id` sent (`extra="forbid"`); an array or string body; malformed JSON; a form body.
  - SQL-injection text is stored as words (`drop table category rule`).
- [x] **AC6: Pass.** Deleting a user rule → `204` with an empty body, and the suggestion disappears at once. Deleting it again → `404` `{"code":"not_found","message":"Regra não encontrada."}`. The same keyword can be recreated afterwards. A default rule → `409 rule_is_default` ("Regras padrão não podem ser excluídas."). An id of 0, −1, `abc`, `1.5`, `1e3` or 2⁶³ → 422. 2⁶³−1 → 404. Under 20 parallel deletes, exactly one returns 204 (E6). Deleting a rule after a transaction used its category leaves the transaction's `category_name` intact (`transactions` references `category`, not `category_rule`).
- [x] **AC7: Pass.** Every non-2xx response on the new routes references `ErrorResponse` and lists its codes: `GET /categories/suggest` 422; `POST /categories/rules` 409 `rule_exists` and 422 `validation_error, category_not_found`; `DELETE /categories/rules/{rule_id}` 404/409/422 (E3). Both test files assert this.

**Data Rules: Pass.**
- Matching compares `words()` lists, with the keyword as a consecutive slice.
- The blank letters count as spaces (E4, E5).
- Accents are stripped in the service before insert, and the schema `CHECK` is unchanged.
- `POST /transactions` without `category_id` still stores `null` for "Janta com a galera", so nothing is auto-applied.
- There is no schema change.

**Open Questions:** the three items assigned to 005 are removed from `context.md`, and Business Rule 8 is refined to match the spec (whole words, protected defaults, id tie-break).

## 2. Security & Data Consistency

- [x] **Parameterized SQL** in every new query (E11). Injection text is inert (E5).
- [x] **Edge cases.** These all give 2xx/4xx and never a 5xx (E5, E9): invisible and blank characters, compatibility forms (full-width, ligatures, circled, math-bold, `㎏` → `kg`), expanding casefolds, lone surrogates (JSON escapes and percent-encoded), NUL, invalid UTF-8, huge URLs and bodies, and repeated parameters. All errors use the standard shape with pt-BR messages.
- [x] **Data consistency.** `checks.sql` returns 0 rows on a fresh DB and after the concurrent writes (E10). Stored keywords are always in normalized form, so the `UNIQUE` column is the real duplicate guard.
- [x] **Write safety under concurrency** (E6). Both `create_rule` (`services/categories.py:108`) and `delete_rule` (`:139`) start with `BEGIN IMMEDIATE`. This is not pinned by a test (m1).
- [x] **Strict 1-to-1.** No split, schema or SQL code changed outside categories. There is no list or group logic.

## 3. Structural & Stack Rules

- [x] **Layers.** Routers parse the request, call a service and return a schema. `pick_rule` is pure and tested without a DB. Services raise `DomainError` only.
- [x] **Files.** Every new file is in the plan. `repository-structure.md` lists `text.py`, the `schemas/` package with its 5 modules, and the `services/categories.py` purpose. The largest schema module has 133 lines, well under the 300-line rule that motivated the split. There are no new dependencies (`re` and `unicodedata` are stdlib).
- [x] **Scope.** There is no category CRUD (`POST /categories` 405, `GET/PUT/DELETE /categories/1` 404), no rule edit (`PUT`/`PATCH /categories/rules/1` 405), no auto-categorization on save, and no fuzzy matching. The `frontend/` diff is empty.
- [x] **TypeScript.** Not applicable: no frontend changes.
- [x] **Process.** The spec and plan were approved (`f9fc707`) before product code. Commits are conventional with scopes and one logical change each. No `.db`, `.env` or `node_modules` is tracked.

## Findings

### Blocker

None.

### Major

None.

### Minor

- **m1. No regression test pins `BEGIN IMMEDIATE` in `create_rule`.** If `services/categories.py:108` reverts to a deferred `BEGIN`, all 82 category tests still pass. A live run then returns 41 × `500 internal_error` in 100 parallel duplicate creates (E7). This is the 004 M1 failure mode. The code is correct today, but nothing in the suite guards it, unlike `test_parallel_*` for transactions. **Fix:** add a parallel test on a file DB (threads over the TestClient, as in 004) that sends about 20 variants of one keyword. Assert exactly one `201`, the rest `409`, and no 5xx. Optionally do the same for parallel deletes (one `204`, the rest `404`).
- **m2. The raw 80-character keyword limit is not in the spec.** `CategoryRuleCreate.keyword` is `VisibleText(max_length=80)` (`schemas/categories.py:30`), but AC5 names only "longer than 40 characters after normalizing". `"z" + "!" * 80` normalizes to `z`, yet it gets the generic `422` "Dados inválidos na requisição." instead of being accepted. A 1 MB keyword is also rejected cheaply by this limit, so the limit itself is sound. The issue is only that the phase 2 form and TS types would rely on a spec that omits it. **Fix:** add the raw limit (80 characters before normalizing, Swagger `maxLength: 80`) to AC5 or the Data Rules.

### Informational

- **n1. The US02 example "Uber" → "Transporte" is already a default rule.** `uber` is seeded (`sql/seed.sql:41`, id 10), so creating it during the demo returns `409 rule_exists`. That is correct, but surprising live. The demo script (phase 3) should create a keyword that is not seeded, for example `uber eats` → Alimentação, which also shows "longest wins".
- **n2. Accepted matching limits, as the plan states.** A plural does not match (`jantas`). A zero-width character joins words (`Uber​Eats` → `ubereats`, which does not match `uber eats`, and renders without a space). A NUL inside a word splits it (`jan\x00ta`). A keyword cannot reuse a default's exact text to point it at another category (409). Use a longer phrase instead, which wins as a user rule.
- **n3. Errors raised outside the app routes.** An invalid UTF-8 JSON body returns `400 bad_request`, and a URL over about 64 KB gets uvicorn's plain-text 400 before reaching the app. Both apply to every endpoint, were not introduced here, and are not listed in Swagger. No action.

## Verdict

**PASS**

All seven acceptance criteria, the Data Rules and the Out of Scope list hold under real requests. The evidence is 565 passing tests, about 160 adversarial TestClient checks, raw HTTP probes, and concurrency bursts with exactly one winner and no 5xx. T1 is a true refactor: the 461 original tests pass unmodified, and every pre-existing OpenAPI path and schema is byte-identical. The only behavior change is the intended one (blank letters as spaces), which closes 004 n2. SQL is parameterized, layers are clean, and `checks.sql` returns zero rows. Expanding normalizations (`ß`, ligatures, `ﷺ`) never reach the DB `CHECK`. m1 (a missing concurrency regression test) and m2 (one sentence of spec) do not block. Both should be fixed before 005 merges into `dev`.
