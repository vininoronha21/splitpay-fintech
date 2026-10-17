# 005 Categories — Plan

Status: draft

## Files to Create/Modify

- `backend/app/schemas.py` → package `backend/app/schemas/`, split by domain (Change Rule 4; the file reached 300 lines):
  - `common.py`: money and id types, `ErrorResponse`, `error_responses`, `VisibleText`, `OptionalVisibleText`;
  - `balance.py`: profile, balance, adjustments, budget;
  - `friends.py`, `transactions.py`;
  - `categories.py` (new models): `Category`, `CategorySuggestion`, `CategoryRuleCreate`, `CategoryRule`.
  - `__init__.py` stays empty; routers import from the domain module (`from app.schemas.balance import Balance`).
- `backend/app/text.py` (new): `INVISIBLE_CHARACTERS`, `trim_invisible`, `normalize_text` (moved from `services/friends.py`, now treating the blank "letters" as spaces) and `words()`. Imported by schemas and services.
- `backend/app/services/categories.py` (new): pure `pick_rule(description_words, rules)`; `list_categories`, `suggest_category`, `list_rules`, `create_rule`, `delete_rule`.
- `backend/app/routers/categories.py` (new); `backend/app/main.py`: register it.
- `backend/app/services/friends.py`: import `normalize_text` from `app.text`.
- `backend/tests/test_categories.py`, `test_category_rules.py`, `test_text.py` (new); existing tests updated only for moved imports.
- `docs/development/repository-structure.md`: `schemas/` package and `text.py`.
- `docs/context.md`: close the three 005 Open Questions.

## Architectural & Tech Decisions

- **Matching in Python, not SQL:** the service loads all rules (31 defaults plus a few user rules) and picks the winner with `pick_rule`, a pure function sorted by `(is_default, -len(keyword), id)`. SQLite cannot strip accents, and a pure function is testable without a database. Rejected: SQL `LIKE`, which is substring-based and accent-sensitive.
- **Word split:** `words(text) = re.findall(r"\w+", normalize_text(text))` with `\w` restricted to letters and digits (underscore dropped). A keyword matches when its word list is a consecutive slice of the description's.
- **Normalized storage:** `create_rule` stores `" ".join(words(keyword))`. The `UNIQUE` constraint then rejects duplicates; the service checks first inside `BEGIN IMMEDIATE` to return `409 rule_exists` (same pattern as `create_friend`).
- **Delete:** `DELETE ... WHERE id = ? AND is_default = 0`; when no row changed, a second query tells `404` from `409`.
- **Frontend TS Interfaces:** none yet (phase 2 mirrors `schemas/categories.py`).
- **Database Schema:** no change.

## Test Strategy

- `test_text.py`: accents, case, zero-width and Hangul/Braille blanks, punctuation, `words()`; friend duplicates still detected (004 regression).
- `test_categories.py`: `pick_rule` pure cases (user beats default, longest wins, id tie-break, whole-word, multi-word); the US02 examples through the API; every seeded default keyword already equals its normalized form.
- `test_category_rules.py`: list order, create (normalized storage, 201), 422/409 codes, delete user rule then the suggestion changes, delete default → 409, unknown → 404; a created rule wins over a default for the same description.
- Swagger: each documented error response references `ErrorResponse`.

## Risks & Edge Cases

- Moving `schemas.py` touches every router; the full suite must stay green (461 tests) before the new endpoints land.
- A description with a keyword in the plural ("jantares") will not match "jantar": accepted, and visible in the demo as "no suggestion".
- Emoji or symbols in a keyword are dropped by `words()`; a keyword made only of them is a `422`.
