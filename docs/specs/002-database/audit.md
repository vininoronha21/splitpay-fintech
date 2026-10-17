# 002 Database — Audit Report

Auditor run: 2026-10-17, branch `feature/mvp-plan` at `676fbd0` (working tree clean before this report). Commits reviewed: `c214c05..676fbd0` (`git log --oneline dev..feature/mvp-plan`, 11 commits, all conventional with a scope).

## 1. Spec Compliance

- [x] AC1: Pass. Evidence: `app/main.py:57-60` makes the lifespan call `init_db`, and `app/db.py:19-27` unlinks the file and then runs `schema.sql` and `seed.sql`. `app/config.py:10` resolves `DATABASE_PATH` against `backend/` (default `splitpay.db`). I ran a live check: I wrote junk to a scratch file, started `DATABASE_PATH=<scratch>/live.db uvicorn app.main:app`, and got `{"status":"ok"}` from `/health`. The file then held 35 transactions and the profile `Usuário`, and no `*.db` appeared in `backend/`. The tests `test_app_startup_rebuilds_database_file` and `test_app_startup_discards_previous_data` cover this.
- [x] AC2: Pass. Evidence: `app/db.py:13-15` sets `sqlite3.Row` and `PRAGMA foreign_keys = ON` on every connection. `get_db` (`db.py:30-36`) opens one connection per request and closes it afterwards. `test_connect_enables_foreign_keys_and_named_columns` asserts both.
- [x] AC3: Pass for every case listed. Evidence: `tests/test_db.py:28-88` has 25 parametrized cases, each expecting `sqlite3.IntegrityError`. They cover amount 0 and -1, invalid type, a second share, share > amount, a negative share, a share on an income, `split_mode` on an income, an invalid status, installments 4/3, 0/3, number only and total only, percent 101 and -1, a percent on `equal`, a percent with no split, delta 0, a short reason, a negative balance and budget, and 4 FKs. `test_fixture_rows_are_valid` shows that the base rows are valid. See Major 1 for gaps outside the AC3 list.
- [x] AC4: Pass. Evidence: I split `checks.sql` on `-- check:` and ran each of the 10 blocks against a fresh schema + seed. All returned `[]`, and `PRAGMA foreign_key_check` returned `[]`. The blocks cover one share per split, no share on a non-split, share within amount, share matching the mode (Business Rule 7 floors), `settled_on` iff closed, `settled_on` not before `occurred_on`, no split on an income, parseable dates, the profile row, and FKs. My adversarial runs show they detect drift that the schema allows: a mode or percent or amount changed after the share was written, a deleted share, and a non-date `occurred_on`/`settled_on`.
- [x] AC5: Pass. Evidence: the profile is `Usuário` with 250000 / 300000. There are 8 friends and 8 categories, and the categories match `docs/assets/tela_gastos.png` exactly (Alimentação, Transporte, Lazer, Compras, Moradia, Saúde, Educação, Outros). There are 31 default rules, including `janta`→Alimentação, `combustivel`→Transporte and `uber`→Transporte. The seed has 30 expenses and 5 incomes. Splits by mode: equal 7, percentage 5, fixed 5. Shares by status: em_aberto 4, pago 9, acertado 4. There are 4 installment rows and 2 adjustments. The seed has no date literals: all 40 dates use `'now'`. I replaced `'now'` with fixed timestamps (00:00:01 and 23:59:59) on 16 boundary days: 2026-01-01, a Sunday (01-04), a Monday (01-05), 02-28, 03-01, 03-31, 06-01, 08-31, today, 12-31, 2027-02-28, 2027-03-01, leap day 2028-02-29, 2028-03-01, 2025-12-29 and 2027-01-03. On every day all checks returned zero rows, and the current week (Monday-start and Sunday-start), month and year all had data. On every day nothing was older than 12 months or in the future (transactions, `settled_on`, adjustments), and the month 9 months back was empty (context.md "at least one empty period").
- [x] AC6: Pass. Evidence: computed balance = 250000 + 1620000 (incomes) + 450594 (shares `pago`) − 1861902 (expenses) − 7000 (adjustments) = **451692** cents (R$ 4.516,92), positive and the same on every boundary day. `test_seed_computed_balance_is_positive` asserts it.
- [x] AC7: Pass. Evidence: `tests/conftest.py:12-35` gives each test a `tmp_path` file, and the `db` and `client` fixtures share it. `pytest -q`: **57 passed, 1 warning** (the known Starlette/httpx deprecation).
- [x] AC8: Pass. 001 minors 1, 2, 4 and 5 are fixed:
  - Minor 1: `app/main.py:46-54` adds ACAO/Vary only for `FRONTEND_ORIGIN`. Tests `test_internal_error_carries_cors_header_for_allowed_origin` and `..._has_no_cors_header_for_other_origin` cover it.
  - Minor 4: `routers/health.py:10` is `Literal["ok"]`.
  - Minor 5: `requirements.txt:4` pins `starlette==1.8.0`.
  - Minor 2: `frontend/src/vite-env.d.ts:4` is `readonly VITE_API_URL?: string`, and `npm run build` succeeds (39 modules, no TS errors).
  - Minor 3 is out of 002's scope, as stated.

## 2. Security & Data Consistency

- [x] Parameterized SQL used. App code has only constant SQL: `db.py:15` (PRAGMA) and `db.py:24-25` (`executescript` of the repo's own files). No f-string, `%` or `.format` builds a query in `backend/app`. The f-strings in `tests/test_db.py:21-25,133` build test-only SQL from constants, which is acceptable.
- [ ] Data validation handles edge cases (zero values, nulls): **partially**. NULL type, amount, status, delta, reason, description, share and balance are all rejected by `NOT NULL`. The NULL-safe CHECKs for installments and percent work. Date CHECKs and integer-type CHECKs do not (Major 1).
- [x] Strict 1-to-1 split logic respected. `split_share.transaction_id` is `UNIQUE` (`schema.sql:72`). Moving a share onto a transaction that already has one is rejected. No group, participant, auth or login code exists.
- [x] `checks.sql` returns zero rows on the seed (AC4) and on all 32 boundary-day loads.
- [x] Triggers on UPDATE paths work (verified manually, see Minor 1). A share cannot be moved to an income or non-split transaction or raised above the amount. A split transaction cannot become an income, lose its mode, drop below its share or change its id (FK). Deleting a person or category in use is rejected (FK).
- [x] No `*.db`, `.env` or `node_modules` tracked (`git ls-files`). `.gitignore:21-22` covers `*.db` and `*.db-journal`.

## 3. Structural & Stack Rules

- [x] Frontend uses strict TypeScript (no `any`). `tsconfig.json:14` is `strict: true`. Grepping `\bany\b` in `frontend/src` finds nothing.
- [x] No unplanned files, layers or dependencies. `git diff --stat dev..feature/mvp-plan` touches exactly the 16 files in `plan.md`. Every path is in `repository-structure.md`. The only dependency change is the planned `starlette` pin. No endpoints were added (`/health` only), so there is no story scope creep.
- [x] Money as integer cents in the seed (`typeof(amount_cents)` is `integer` on all 35 rows). The schema does not enforce it, though (Major 1).
- [x] Language: identifiers, comments and commits are en-US. Seed data is pt-BR.

## Findings

Blocker: none.

Major:

1. **Type and format CHECKs that SQLite silently passes.** Each of these inserts succeeded on a fresh schema + seed:
   - `backend/sql/schema.sql:41` `CHECK (date(occurred_on) = occurred_on)` and `:77` `date(settled_on) = settled_on`: `date('abc')` is NULL, so the CHECK is NULL and passes. `occurred_on = 'abc'` and `settled_on = 'abc'` (with `pago`) were **accepted**. This is the exact pitfall the schema itself warns about at `:52`. Only `checks.sql` (`dates_parse`) notices. (A well-formed but invalid date like `2026-02-30` is rejected correctly.)
   - `schema.sql:39` `amount_cents`, `:74` `share_cents`, `:86` `delta_cents` (also `:9-10`, `:44-45`, `:48`): column affinity still stores non-integers. `amount_cents = 10.5`, `share_cents = 5.5`, `delta_cents = 0.5`, `installment_number = 1.5` were stored as `real`. `amount_cents = 'abc'` and `delta_cents = 'abc'` were stored as text, because in SQLite `'abc' > 0` is true. `checks.sql` flags **none** of these. This breaks the CLAUDE.md money rule ("integer cents end to end, never floats") at the last line of defense. It would also corrupt the balance and the Rule 7 floor math if an endpoint in 003+ ever passed a float.

   Fix (data-engineer): use `date(x) IS x` for both date CHECKs. Add `typeof(col) = 'integer'` to the CHECK of each integer column (or declare the tables `STRICT`, available since 3.37; local is 3.45.1). Add pytest cases for `'abc'` dates, a REAL amount/share/delta and a TEXT amount. Optionally add a `checks.sql` query for non-integer money columns.

Minor:

1. `backend/sql/schema.sql:108-130`: the UPDATE-path triggers (`split_share_validate_update`, `transactions_validate_share_update`) have no tests. I verified them by hand (all 7 UPDATE cases above were rejected). A regression would go unnoticed. Add 3-4 parametrized UPDATE cases to `test_db.py`.
2. `backend/sql/schema.sql:29`: the "no accents" part of the keyword rule is not enforced. `lower()` is ASCII-only, so `'combustível2'` was accepted. 005 must normalize before inserting, or the schema comment should say that only lowercase is enforced.
3. `backend/sql/seed.sql` (all `'now'` uses) and `schema.sql:49,88` defaults: `'now'` is UTC. Between 21:00 and 24:00 in Brasília, "today" rows are dated tomorrow in local terms, and `created_at` is 3 h ahead. This is harmless for the seed. Pick one convention (UTC everywhere, or `'localtime'`) in 003/007 so that period filters and "today" agree with the UI.
4. `backend/tests/test_db.py:124`: the test assumes Monday-start weeks. Business Rule 9 does not state a week start. The seed has data for both conventions on every day I tried, so nothing breaks. Record the choice in 007's spec.
5. `backend/sql/schema.sql:74`: the schema allows `share_cents = 0` in `fixed` mode, while Business Rule 7 requires 0 < share. This is consistent with the plan ("0–amount"), and `checks.sql:310` catches it. 004's Pydantic model must reject it at input.

## Verdict

**CHANGES REQUIRED**

All 8 acceptance criteria pass with evidence, the 001 carry-overs are fixed, and there is no scope creep. One major remains: the schema accepts non-date text in date columns and non-integer values in money columns, and `checks.sql` does not catch the money cases. The fix is small (a few CHECK expressions and tests) and should land before 003 starts writing rows. The data-engineer fixes Major 1, then the auditor re-checks. The minors may be fixed in the same pass or carried into the named features.
