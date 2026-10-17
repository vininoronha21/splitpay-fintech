# 004 Split — Spec

Stories: US01 (plus the transaction base used by US03 and US04) | Status: approved

## Problem

US01 is the product's differentiator: the user logs an expense, tags one friend, and the app computes each share; only the user's share counts against the monthly budget. Today the database stores transactions and shares, but the API cannot create or read them, cannot list or add friends (Business Rule 11), and cannot show budget usage. Incomes (Business Rule 14) are created through the same endpoint.

This feature also closes the minors carried from the 002 and 003 audits that belong to it (Open Questions in `context.md`).

## Acceptance Criteria

1. `POST /transactions` creates an expense or an income and returns its detail (AC5 shape) with `201`.
2. An expense may carry a split with exactly **one** friend (`person_id`) in one of three modes (Business Rule 7):
   - `equal`: friend share = floor(amount / 2); the user keeps the remainder. R$ 100,00 → R$ 50,00 each; R$ 100,01 → friend R$ 50,00, user R$ 50,01.
   - `percentage`: the request gives the friend's whole percentage 0–100; friend share = floor(amount × pct / 100).
   - `fixed`: the request gives the friend's share in cents, 0 < share ≤ amount.
   The response shows `friend_share_cents` and `user_share_cents`, which always sum to the amount. A new share starts as `em_aberto`.
3. Rejected with `422`:
   - an income with a split; a split with a list of friends or any second friend field (1-to-1 only);
   - an unknown `person_id` (`friend_not_found`) or `category_id` (`category_not_found`);
   - amount ≤ 0 or above the cents limit; non-integer money (as in 003);
   - `occurred_on` after Brasília today, or not a valid date;
   - `percent` outside 0–100 or present outside `percentage` mode; `share_cents` outside `fixed` mode, 0, or above the amount;
   - installment fields not both present, or not 1 ≤ number ≤ total;
   - text that is empty or invisible after trimming (including zero-width characters) for required fields.
4. `GET /transactions` lists every transaction newest first (`occurred_on`, then `id`), each with type, description, amount, own share, category name, date and, when split, the friend's name and status.
5. `GET /transactions/{id}` returns the detail: every stored field plus category name and the split block (`person_id`, `person_name`, `mode`, `percent`, `friend_share_cents`, `user_share_cents`, `status`, `settled_on`). Unknown id → `404 not_found`.
6. `GET /friends` lists friends by name. `POST /friends` adds one by name (trimmed, 1–60 visible characters); a name that already exists, ignoring case and accents, → `409 friend_exists`.
7. `GET /budget` returns the current Brasília month (`YYYY-MM`), the monthly budget, `spent_cents` (sum of the **user's own share** of this month's expenses; incomes excluded), `remaining_cents` (may be negative) and `used_percent` (whole number, floor).
8. Creating a split expense changes `GET /balance` by the **full** amount and `GET /budget` by the **user's share** only (Business Rule 5).
9. Swagger documents every error response with the real shape `{"error": {"code", "message"}}` (carried from the 003 audit), for 003's endpoints too.

## Data Rules

- Split math lives in pure functions (`friend_share(amount, mode, percent, share)`) tested without a database (`repository-structure.md` layer rules).
- The stored `split_share.share_cents` is the friend's share; the user's share is always `amount − share` (002).
- `occurred_on` defaults to Brasília today when omitted. `created_at` comes from the column default.
- Own share for budget and lists: `amount` for an unsplit expense, `amount − share` for a split one.
- Added during implementation: installments are limited to 1–360; ids in paths and bodies to 1..2⁶³−1 (an id of 0 is a `validation_error`); `occurred_on` accepts only `YYYY-MM-DD`; text fields trim whitespace, zero-width and control characters before length checks; with a zero budget, `used_percent` is 100 if anything was spent, else 0.
- Friend name comparison ignores case and accents (`Ana` = `ana` = `Âna`); the stored name keeps what the user typed.

## API Contract

| Method | Path | Request | Response | Errors |
| --- | --- | --- | --- | --- |
| POST | `/transactions` | `{type, description, amount_cents, occurred_on?, category_id?, place?, payment_method?, installment_number?, installment_total?, notes?, split?: {person_id, mode, percent?, share_cents?}}` | `201` detail | `422 validation_error`, `friend_not_found`, `category_not_found` |
| GET | `/transactions` | none | `200 [summary]` | none |
| GET | `/transactions/{id}` | none | `200` detail | `404 not_found` |
| GET | `/friends` | none | `200 [{id, name}]` | none |
| POST | `/friends` | `{name}` | `201 {id, name}` | `422 validation_error`, `409 friend_exists` |
| GET | `/budget` | none | `200 {month, budget_cents, spent_cents, remaining_cents, used_percent}` | none |

## Out of Scope

- Group splits (more than one friend): planned right after the MVP.
- Editing or deleting transactions; editing or deleting friends (Business Rule 11).
- Category suggestion (005), status changes and filters (006), chart data (007).
- Any frontend screen (phase 2).

## Decisions

| Decision | Why | Rejected |
| --- | --- | --- |
| One `POST /transactions` for expenses and incomes, with an optional `split` object | One form with a type toggle (Business Rule 14); a `split` object makes "exactly one friend" visible in the contract. | Separate `/expenses` and `/incomes` endpoints. |
| Friends get their own router and service (`friends.py`) | A friend is its own resource used by splits, reimbursements and charts. | Hiding friend endpoints inside `transactions.py`. |
| `GET /budget` lives with the balance service | Budget usage is a money summary like the balance. | A separate budget module for one query. |
| Reject future dates | Keeps the 003 history rule true (newest adjustment equals the current balance) and matches a real statement. | Allowing scheduled expenses. |
