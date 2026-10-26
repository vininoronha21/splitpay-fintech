# 012 Settings and Friends — Plan

Status: approved

## Files to Create/Modify

- `frontend/src/lib/settings.ts` (new): pure logic, no React.
  - `validateAdjustment({ newBalanceText, reason }, currentCents) → errors`, `adjustmentDelta(newCents, currentCents)`;
  - `reasonCounter(reason) → "3/10" | "12/200"`;
  - `validateRule({ keyword, categoryId })`, `validateFriendName(name)`;
  - `splitRules(rules) → { userRules, defaultRules }`;
  - `openByPerson(summary) → Map<personId, cents>`.
- `frontend/src/lib/dates.ts`: add `formatDateTime("2026-10-10 18:00:00")` → "10 out 2026, 18:00".
- `frontend/src/app/components/` (new):
  - `ProfileCard.tsx`, `AdjustBalanceCard.tsx`, `AdjustmentHistory.tsx`, `BudgetInfoCard.tsx`, `CategoryRulesCard.tsx`;
  - `FriendsScreen.tsx`.
- `frontend/src/app/components/SettingsScreen.tsx`: arranges the new cards around `ThemeControl` and Sair, in the prototype order.
- `frontend/src/app/components/ui/TextArea.tsx` (new): the Justificativa field, sharing `FieldFrame` and `useFieldIds` with `TextField`.
- `frontend/src/app/routes.tsx`: `/amigos` → `FriendsScreen`. `ScreenPlaceholder` stays only if something still uses it.
- `docs/development/repository-structure.md`, `docs/context.md`: the new lib file and the 012 state.

## Architectural & Tech Decisions

- **Cards own their data** (009 pattern): each card uses `useResource`. The adjust card and the history share one reload: `SettingsScreen` holds a `balanceVersion` counter that the adjust card increments on success and the balance and history resources list as a dependency.
- **Forms:** plain state plus the pure validators, with errors shown after a submit attempt and a ref against double submit (010 pattern).
- **Rules:** the created rule is prepended to local state; a delete removes it after 204. Both show a status line.
- **Friends:** two resources (`listFriends`, `getReimbursementSummary`); the add form calls `retry` on both after success.
- **Frontend TS Interfaces:** reuse `Profile`, `Balance`, `Adjustment`, `AdjustmentCreate`, `Category`, `CategoryRule`, `CategoryRuleCreate`, `Friend`, `ReimbursementSummary`. New local types: `AdjustmentErrors`, `RuleErrors`.
- **Database Schema:** no change.
- **Changes during T2:**
  - `FormFeedback.tsx` (new) is the shared status and error line of the three forms.
  - `FieldFrame` gains an `aside` slot on the hint line for the reason counter, so the counter is announced with the hint.
  - Rules and categories load in one resource, because the card needs both.
  - `TextArea` scrolls itself fully into view on focus, because Chrome scrolls only the caret and left the field under the tab bar.
  - The unused `ScreenPlaceholder` component was removed and its file renamed to `ScreenTitle.tsx`.

## Test Strategy

- **`settings.ts` self-checks** with `node --experimental-strip-types`: every validation boundary (0, 10^12, 10^12 + 1, equal to current; reason 9, 10, 200, 201 visible characters with invisible padding); the counter switch at 10; rule and friend name limits; `splitRules` keeps API order; `openByPerson`; `formatDateTime` for every month and midnight.
- **Runtime with the seeded API** (Playwright):
  - an adjustment from the current balance down by R$ 63,97 stores delta −6397 in `GET /balance/adjustments`, and the balance on Início matches;
  - "equal to current" shows the message without a request; a double tap sends one request;
  - a rule "uber eats" → Alimentação appears as "Sua regra", then Novo gasto suggests Alimentação for "Uber Eats janta"; deleting it removes it from `GET /categories/rules`; a duplicate shows the 409 message;
  - adding "Bia" lists her in API order; adding "bia" shows the 409 message; the a receber amounts equal `by_person`;
  - hide values masks every amount.
- **Layout scan** at 360, 390, 768 and 1280 in both themes with long data, and a keyboard sweep for focus under the tab bar; screenshots compared with the prototypes.
- `npm run build` and the copy scan.

## Risks & Edge Cases

- **Shared data:** another visitor's adjustment can change "Saldo atual" between load and submit; the API answers with the real delta and the screen reloads.
- **Long reasons and names:** the history wraps the reason; friend names truncate in the row with the full name in `title`.
- **Rule keyword normalization:** the API stores "Uber-Eats" as "uber eats"; the list shows the stored form.
