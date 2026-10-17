# 004 Split — Plan

Status: approved

## Files to Create/Modify

- `backend/app/schemas.py`: `VisibleText` type (trim, reject zero-width-only), `ErrorResponse`, `SplitCreate`, `TransactionCreate`, `TransactionSummary`, `TransactionDetail`, `SplitDetail`, `FriendCreate`, `Friend`, `Budget`.
- `backend/app/services/transactions.py` (new): pure `friend_share()`; `create_transaction`, `list_transactions`, `get_transaction`.
- `backend/app/services/friends.py` (new): `list_friends`, `create_friend` (accent- and case-insensitive duplicate check), plus a small `normalize_text()` helper that 005 reuses for keywords.
- `backend/app/services/balance.py`: `get_budget`.
- `backend/app/routers/transactions.py`, `backend/app/routers/friends.py` (new); `backend/app/routers/balance.py`: `GET /budget`.
- `backend/app/routers/profile.py`, `balance.py`: `responses=` with `ErrorResponse` (003 audit m1).
- `backend/app/main.py`: register the new routers.
- `backend/tests/test_split.py` (pure math), `test_transactions.py`, `test_friends.py`, `test_budget.py` (new).
- `docs/development/repository-structure.md`: add `services/friends.py` and `routers/friends.py`, and note `GET /budget` in the balance router.
- `docs/context.md`: close the 002/003 open questions handled here.

## Architectural & Tech Decisions

- **Split math:** `friend_share(amount, mode, percent=None, share=None) -> int` with integer arithmetic only (`//`), so no float ever touches money. `user_share = amount - friend_share`.
- **Write path:** `create_transaction` validates references (`person_id`, `category_id`) and inserts the transaction and its share in one transaction; schema triggers stay as the last line of defense.
- **Validation split:** Pydantic checks shape (types, ranges, mode-specific fields, 1-to-1 shape via `extra="forbid"` on `SplitCreate`); the service checks facts that need the database (ids exist, date not after Brasília today, duplicate friend).
- **Brasília today in Python:** `datetime.now(timezone(timedelta(hours=-3))).date()` in one helper in `services/__init__.py`, matching SQL's `'now', '-3 hours'`.
- **Accent-insensitive names:** `unicodedata.normalize("NFKD")` and drop combining marks, then `casefold()`; stdlib only.
- **Frontend TS Interfaces:** none yet (phase 2 mirrors `schemas.py`).
- **Database Schema:** no change.

## Test Strategy

- `test_split.py`: equal (even, odd, 1 cent), percentage (0, 33, 50, 100, rounding down), fixed (1, amount), invalid combinations; property check over many amounts that friend + user = amount.
- `test_transactions.py`: every AC1–AC5 and AC8 case through the API, including the R$ 100,00 → R$ 50,00 example and each 422 code.
- `test_friends.py`: list sorted, add, duplicate with different case/accents → 409, invisible name → 422.
- `test_budget.py`: matches an independent own-share sum over the seed for the current Brasília month; a new split expense moves it by the user's share only.
- Swagger: each documented error response references `ErrorResponse`.

## Risks & Edge Cases

- A 1-cent expense split equally gives the friend 0 and the user 1: allowed (equal mode), unlike `fixed`, which requires a share above 0.
- `percentage` with 0% creates a share of 0; allowed by Business Rule 7 and shown as such.
- Budget month boundary at 21:00–24:00 UTC is handled by the shared Brasília-today helper and SQL's `'-3 hours'`.
