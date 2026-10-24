# 011 Statement — Plan

Status: approved

## Files to Create/Modify

- `frontend/src/lib/statement.ts` (new): pure logic, no React.
  - `parseStatusParam(value) → SplitStatus | null`;
  - `buildEntries(transactions, reimbursements) → StatementEntry[]` (a transaction plus its `Reimbursement` or null);
  - `filterEntries(entries, status)`, `statementTotals(entries) → { openCents, openCount, receivedCents }`;
  - `applySettle(entries, transactionId, split) → StatementEntry[]` for the in-place update;
  - labels: `statusLabel(status, settledOn)`, `splitModeLabel(split)`, `installmentLabel(n, total)`, `paymentMethodLabel(method)`.
- `frontend/src/lib/dates.ts`: add `formatLongDate("2026-10-20")` → "20 de outubro de 2026".
- `frontend/src/app/components/` (new):
  - `StatementScreen.tsx`: header, summary cards, chips, list, note;
  - `StatementSummary.tsx`, `StatusFilter.tsx`;
  - `SettleActions.tsx`: the two buttons, the inline confirmation, the PATCH and its errors (used by the list and the detail);
  - `TransactionDetailScreen.tsx`: the detail view, its field list and the Divisão card.
- `frontend/src/app/components/TransactionRow.tsx`: an optional `href` makes the row content a link; an optional `extra` slot renders the split line and actions outside the link.
- `frontend/src/app/components/RecentTransactionsCard.tsx`: rows link to `/extrato/{id}`.
- `frontend/src/app/components/MoreDetails.tsx`: import the payment method labels from `statement.ts` so they are defined once.
- `frontend/src/app/routes.tsx`: `/extrato` → `StatementScreen`, `/extrato/:id` → `TransactionDetailScreen`.
- `docs/development/repository-structure.md` and `docs/context.md`: the new lib file and the 011 state.

## Architectural & Tech Decisions

- **Data:** `useResource` loads both lists with `Promise.all` and keeps one `entries` array in state. A settle replaces one entry with `applySettle`, so the list, the chip filter and the totals update together without a refetch. A 409 calls `retry`.
- **Filter:** `useSearchParams` with `replace`, so chip taps do not fill the history. The chips reuse the `Chip` primitive with `aria-pressed`.
- **Detail:** `useResource(getTransaction(id))`. The back button uses `navigate(-1)` when `location.key !== "default"`, otherwise `/extrato`. An `ApiError` with status 404, or an id that is not a positive integer, shows the not-found state without a request.
- **SettleActions** owns a small state machine: `idle → confirming(pago|acertado) → saving → done | error`. A ref guards against a double submit. On success it calls `onSettled(split: SplitDetail)`.
- **Frontend TS Interfaces:** reuse `TransactionSummary`, `TransactionDetail`, `Reimbursement`, `SplitDetail`, `SplitStatus`, `ClosedStatus` and `PaymentMethod`. New local types: `StatementEntry`, `StatementTotals`.
- **Database Schema:** no change.
- **Changes during T2:**
  - A 409 reloads both lists in the background instead of calling `retry`, because `retry` shows skeletons and would remove the row and its "Este reembolso já foi encerrado." message.
  - A share settled under a status chip stays listed with its new pill until the chip changes, so the row updates in place instead of vanishing.
  - `TransactionRow` takes two slots, `extra` (the split line) and `actions` (the buttons), so the buttons sit right of the text from `md` and wrap below it otherwise.
  - `ui/Button.tsx` gains a `success` variant for "Recebi".

## Test Strategy

- **`statement.ts` self-checks** with `node --experimental-strip-types`:
  - the join keeps the API order and attaches every reimbursement to its transaction;
  - filters by each status, totals on random integer shares, `applySettle` moves an entry from open to pago or acertado and the totals follow;
  - the param parser and every label, including "3 de 10" and "30%".
- **Runtime with the seeded API** (Playwright):
  - the summary equals `/reimbursements/summary` and the sum of pago shares;
  - each chip shows exactly the rows `/reimbursements?status=` returns, and `?status=em_aberto` from Início opens on Em aberto;
  - "Recebi" raises `/balance` by the friend's share and turns the row to "Pago em {hoje}"; "Já acertamos" leaves the balance unchanged; Cancelar sends nothing; a double click sends one PATCH; a forced 409 shows its message;
  - the detail of a seeded expense with every field matches `GET /transactions/{id}`, and an expense without optionals shows "Não informado";
  - `/extrato/999999` and `/extrato/abc` show the not-found state; back returns to the filtered list;
  - hide values masks every amount, including the confirmation text.
- **Layout scan** at 360, 390, 768 and 1280 in both themes, with an open confirmation and the longest seeded rows; screenshots compared with `prototype-statement.png`.
- `npm run build` and the copy scan.

## Risks & Edge Cases

- **Ephemeral demo data:** the database is shared and rebuilt on deploy, so another visitor may settle a share first. The 409 path covers it.
- **Long lists:** the seed is small; no virtualization.
- **A split with 0% for the friend:** the share is 0 and already reads as open; the row shows "Parte de Ana: R$ 0,00" and the actions still work, as the API allows it.
- **Row link and buttons:** the link wraps only the row content, never the buttons, so there are no nested interactive elements.
