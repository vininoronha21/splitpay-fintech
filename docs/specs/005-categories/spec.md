# 005 Categories — Spec

Stories: US02 | Status: approved

## Problem

US02 asks the app to suggest a category from what the user types: "Janta" suggests "Alimentação", "Combustível" suggests "Transporte", and the user can add rules such as "Uber" → "Transporte". The database already holds 8 categories and 31 default rules (002), but the API cannot list categories, suggest one, or manage rules (Business Rule 8: create and delete only).

This feature also closes the three Open Questions in `context.md` assigned to 005.

## Acceptance Criteria

1. `GET /categories` lists every category (`id`, `name`) in id order, so "Outros" stays last.
2. `GET /categories/suggest?description=<text>` returns `{category_id, category_name, keyword}` for the winning rule, or all three `null` when nothing matches (`200` either way):
   - "Janta com a galera" → Alimentação; "Combustível" → Transporte; "Uber para o trabalho" → Transporte.
   - "JANTA", "Jãnta" and "janta" give the same answer (case and accents ignored).
   - A keyword matches whole words only: "bar" matches "Bar do Zé" but not "Barbearia".
   - A blank or missing `description` → `422 validation_error`; longer than 120 characters (the transaction limit) → `422`.
3. Winner when several rules match (Business Rule 8):
   - a user rule beats any default rule;
   - within the same kind, the longest keyword wins ("uber eats" beats "uber");
   - equal length: the rule created first (lowest id) wins, so the answer never changes between calls.
4. `GET /categories/rules` lists every rule with `{id, keyword, category_id, category_name, is_default}`: user rules first (newest first), then defaults by keyword.
5. `POST /categories/rules` with `{keyword, category_id}` creates a user rule and returns it with `201`. The keyword is stored normalized: lowercase, no accents, punctuation dropped, single spaces ("  Uber-Eats " → "uber eats").
   - unknown `category_id` → `422 category_not_found`;
   - a keyword longer than 80 characters as typed, with no letter or digit, or longer than 40 characters after normalizing → `422 validation_error`;
   - a keyword equal to an existing one after normalizing ("Ubér" vs "uber") → `409 rule_exists`.
6. `DELETE /categories/rules/{id}` deletes a user rule (`204`). Unknown id → `404 not_found`; a default rule → `409 rule_is_default`.
7. Swagger documents every error response with `ErrorResponse`, as in 004.

## Data Rules

- Matching compares normalized words: the description and the keyword pass through the same `normalize_text`, are split into words (runs of letters and digits), and the keyword's word sequence must appear consecutively in the description's.
- Hangul fillers (U+115F, U+1160, U+3164, U+FFA0) and the empty Braille cell (U+2800) count as spaces in `normalize_text`, for friend names (004) and keywords alike. Closes the Open Question.
- Accent stripping happens in the service before insert; the schema keeps enforcing lowercase only. Closes the Open Question.
- Suggestions are read-only: `POST /transactions` still takes `category_id` as sent (optional, as in 004).
- No schema change; rules keep the `category_rule` table from 002.

## API Contract

| Method | Path | Request | Response | Errors |
| --- | --- | --- | --- | --- |
| GET | `/categories` | none | `200 [{id, name}]` | none |
| GET | `/categories/suggest` | query `description` | `200 {category_id, category_name, keyword}` (nullable) | `422 validation_error` |
| GET | `/categories/rules` | none | `200 [{id, keyword, category_id, category_name, is_default}]` | none |
| POST | `/categories/rules` | `{keyword, category_id}` | `201` rule | `422 validation_error`, `category_not_found`; `409 rule_exists` |
| DELETE | `/categories/rules/{id}` | none | `204` | `404 not_found`; `409 rule_is_default` |

## Out of Scope

- Editing rules (delete + create, Business Rule 8) and creating, renaming or deleting categories.
- Assigning a category automatically when a transaction is saved without one.
- Fuzzy or typo-tolerant matching ("janat" → "janta").
- Any frontend screen (phase 2).

## Decisions

| Decision | Why | Rejected |
| --- | --- | --- |
| Whole-word matching | "bar" must not tag "Barbearia" as Lazer; whole words keep suggestions explainable. | Substring matching: shorter keywords hijack unrelated words. |
| Suggestion is a separate read endpoint, not applied on save | The form shows the suggestion and the user confirms it, which is what US02 describes. | Server-side auto-categorizing: the user never sees or overrides the choice. |
| Default rules cannot be deleted | Data is shared by every visitor (Business Rule 17); one deletion would break the "Janta" demo until a restart. | Deleting any rule: one visitor can break the demo for the rest. |
| `normalize_text` and the invisible-character set move to one shared module (`app/text.py`) | Request validation and service matching must agree on what "blank" means; today that list exists only in `schemas.py`. | Copying the list into the service: two definitions drift apart. |
| Rules endpoints live under `/categories/rules` in the categories router | A rule only exists to point at a category; one router covers US02. | A separate `/category-rules` router for three endpoints. |
