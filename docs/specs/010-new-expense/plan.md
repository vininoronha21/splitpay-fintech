# 010 New Expense — Plan

Status: approved

## Files to Create/Modify

- `frontend/src/lib/transactionForm.ts` (new): the pure form logic, with no React.
  - `FormValues` type and `initialValues(type, today)`;
  - `validate(values) → Partial<Record<Field, string>>`;
  - `splitPreview(totalCents, mode, input) → { friendCents, userCents } | null`;
  - `toPayload(values) → TransactionCreate`.
- `frontend/src/lib/dates.ts`: add `brasiliaToday(now) → IsoDate`.
- `frontend/src/app/components/` (new):
  - `NewTransactionScreen.tsx`: screen state, submit and navigation;
  - `CategoryPicker.tsx`: chips, suggestion line, debounce;
  - `FriendPicker.tsx`: radiogroup and the inline "Novo" friend;
  - `SplitSection.tsx`: switch, mode, input and preview;
  - `MoreDetails.tsx`;
  - `ui/Switch.tsx`: `role="switch"`, 44 px target;
  - `SaveConfirmation.tsx`: the status message shown on Início.
- `frontend/src/app/components/HomeScreen.tsx`: render `SaveConfirmation` from `location.state`, then clear the state with `replace` so a reload does not repeat it.
- `frontend/src/app/routes.tsx`: `/novo-gasto` → `NewTransactionScreen`.
- `docs/development/repository-structure.md`: `transactionForm.ts`.

## Architectural & Tech Decisions

- **Logic outside components:** validation, the split preview and the payload live in `lib/transactionForm.ts` as pure functions. They are tested with `node --experimental-strip-types`, the same way as `money.ts` and `dates.ts`, so the money rules are proven without a browser.
- **One state object:** `useState<FormValues>` plus `touched` and `submitted` flags. Errors show under a field after it was touched or after a submit attempt.
- **Suggestion:**
  - a `useEffect` on the description, with a 400 ms `setTimeout` and an `AbortController`, calls `suggestCategory`;
  - a `categoryPickedByUser` flag stops the suggestion from changing the chip;
  - an empty description clears the suggestion.
- **Friends:** loaded with `useResource(listFriends)` the first time the switch turns on. A created friend is added to the local list and selected, with no refetch.
- **Submit:** `createTransaction(toPayload(values))`.
  - On `ApiError`, the banner shows `error.message`.
  - On success, `navigate("/inicio", { replace: true, state: { saved: type } })`.
  - A ref guards against double submit.
- **Fixed save bar:** below `md`, it sits fixed above the tab bar with the safe-area inset, and the form gets matching bottom padding.
- **Frontend TS Interfaces:** reuse `TransactionCreate`, `SplitCreate`, `Category`, `CategorySuggestion`, `Friend`, `PaymentMethod` and `TransactionType`. New local types: `FormValues`, `FieldName`, `SplitInput`.
- **Database Schema:** no change.

## Test Strategy

- **`transactionForm.ts` self-checks** (run by the audit):
  - every validation message and boundary: value 0, 1 and 10^12; 120 and 121 visible characters; percent −1, 0, 100 and 101; fixed share 0, the total, and the total plus 1; installments 0/1/360/361, number > total, only one of the pair; future date;
  - the split preview against the backend formulas for 10,000 random totals in each mode, where the shares always sum to the total;
  - `toPayload` omits blank optionals, and incomes carry no category, split or installments.
- **Runtime with the seeded API** (Playwright):
  - save an equal split of R$ 120,00 with Ana and check `GET /transactions/{id}`: friend 6000, user 6000, status `em_aberto`;
  - percent 30% and a fixed R$ 45,50 also match the API detail;
  - an income raises the balance on Início by its amount;
  - the suggestion selects Alimentação for "Janta com a galera", and a manual pick survives later typing;
  - add a new friend inline and save with them;
  - validation focus order, the API error banner (route interception), and double-click sends one request;
  - `?tipo=receita`, the confirmation on Início, and reload does not repeat it.
- **Layout scan** at 360, 390, 768 and 1280 in both themes, including the open details, every error showing and a long friend list; screenshots compared with `prototype-new-expense*.png`.
- `npm run build` and the copy scan.

## Risks & Edge Cases

- **iOS date input:** use a native `type="date"` with `max`. The value is always `YYYY-MM-DD`, so no parsing is needed.
- **Switching Gasto to Receita after filling the split:** the split state is kept but hidden and never sent. Switching back restores it.
- **Changing the total after choosing a fixed share above it:** the share field shows its error again, so the form never saves an invalid split.
- **Friend list wider than the screen:** horizontal scroll inside the picker only, never on the page.
- **The API's generic 422 "Dados inválidos na requisição.":** client validation mirrors every API rule, so it should not appear. If it does, the banner shows it.
