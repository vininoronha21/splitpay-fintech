# 006 Reimbursements — Spec

Stories: US03 (plus the inflow side of US05) | Status: draft

## Problem

US03 asks for a detail view per expense (place, amount, installment, payment method, notes and the one friend involved) and a filter by status tag, such as "Aguardando Reembolso". The detail view exists since 004, but nothing can change a share's status, list what friends owe, or filter transactions by status. Without a status change, a reimbursement can never enter the balance (Business Rules 1 and 5).

This feature also closes the two Open Questions in `context.md` assigned to 006.

## Acceptance Criteria

1. `PATCH /reimbursements/{transaction_id}` with `{"status": "pago" | "acertado"}` closes the friend's share of that expense and returns the split block (as in the 004 detail) with `200`:
   - `pago` adds the share to `GET /balance` (Business Rule 1); `acertado` closes it without changing the balance.
   - The settlement is recorded at the moment of the request (Brasília time); the request takes no date.
   - Only an `em_aberto` share can change. A closed one → `409 already_settled`. `em_aberto` or any other value as the target → `422 validation_error`.
   - Unknown transaction, or a transaction without a split → `404 not_found`.
2. `GET /reimbursements?status=` lists every share (newest expense first, as `GET /transactions`), each with `transaction_id`, `description`, `occurred_on`, `person_id`, `person_name`, `share_cents`, `status`, `settled_on`. `status` is optional and must be one of the three; any other value → `422 validation_error`.
3. `GET /reimbursements/summary` returns what is still to receive (Business Rule 6, "a receber"): `open_cents`, `open_count`, and `by_person` (`person_id`, `person_name`, `open_cents`, only friends with something open, largest first, then by name).
4. `GET /transactions?status=` filters the 004 list the same way; without the parameter the list is unchanged.
5. The adjustment history (003) stays correct: a share marked `pago` after an adjustment, on the same day, does not change that adjustment's previous or new balance (closes the Open Question, same idea as Business Rule 19).
6. Two visitors closing the same share at once: exactly one `200`, the other `409 already_settled`, never `500`.
7. Swagger documents every error response with `ErrorResponse`.

## Data Rules

- A share's settlement becomes a timestamp: `split_share.settled_on` (date) is replaced by `settled_at` (`YYYY-MM-DD HH:MM:SS`, Brasília), set if and only if the status is not `em_aberto`. The API keeps exposing the date as `settled_on` (`date(settled_at)`), so the 004 contract does not change.
- `settled_at` is never in the future and never before the expense's `created_at`. The API cannot break this because it always writes "now"; the seed is adjusted to respect it (closes the Open Question on future dates).
- Adjustment history: a `pago` share counts toward an adjustment when `settled_at <= adjustment.created_at`.
- Status transitions: `em_aberto` → `pago` or `acertado`, once. Closed states are final.

## API Contract

| Method | Path | Request | Response | Errors |
| --- | --- | --- | --- | --- |
| PATCH | `/reimbursements/{transaction_id}` | `{status}` | `200` split block | `422 validation_error`; `404 not_found`; `409 already_settled` |
| GET | `/reimbursements` | query `status?` | `200 [share]` | `422 validation_error` |
| GET | `/reimbursements/summary` | none | `200 {open_cents, open_count, by_person}` | none |
| GET | `/transactions` | query `status?` | `200 [summary]` (filtered) | `422 validation_error` |

## Out of Scope

- Reopening a closed share or choosing a past settlement date.
- Partial payments, reminders ("Lembrar"), due dates or an "Em Atraso" status (Business Rule 1).
- What the user owes friends (Business Rule 6) and group splits.
- Any frontend screen (phase 2).

## Decisions

| Decision | Why | Rejected |
| --- | --- | --- |
| Settlement is always "now" and final | Keeps the balance history explainable: the moment the user taps "Recebi" is the moment money entered. Also makes future or pre-expense dates impossible. | A date field and reversible statuses: each edit silently rewrites past balances. |
| Replace `settled_on` with `settled_at` | One timestamp orders a payment against an adjustment made the same day, exactly like `created_at` does for expenses (Rule 19). | Keeping the date only: marking `pago` after an adjustment changes the balance the user typed. Adding a second column: two values that must agree. |
| Shares are addressed by `transaction_id` | In 1-to-1 a transaction has at most one share, and the frontend already holds the transaction id. | Exposing `split_share.id`: a second id for the same thing until group splits exist. |
| Summary is its own endpoint | The reimbursements screen and the dashboard (007) both need "a receber" without loading the full list. | Computing totals in the frontend: duplicates money math outside the API. |
