# 011 Statement — Spec

Stories: US03 (detail view and status filter), US01 (closing a friend's share) | Status: draft

## Problem

Início links to "Ver extrato" and to "Reembolsos" (`/extrato?status=em_aberto`), but both open a placeholder. The API already lists transactions, returns each one's detail, lists reimbursements by status and closes a share as `pago` or `acertado`. This spec builds the Extrato tab from the approved prototype (`docs/assets/prototype-statement.png`) and the transaction detail view that US03 asks for, so a visitor can follow an expense from "Aguardando reembolso" to "Pago" and see the balance change.

## Acceptance Criteria

1. **Extrato header** (`/extrato`):
   - title "Extrato" and the subtitle "Seus lançamentos e reembolsos";
   - two summary cards side by side:
     - "A receber": the sum of open friend shares in `accent-text`, with "1 em aberto", "N em aberto" or "Nada em aberto";
     - "Já recebido": the sum of `pago` friend shares in `success`, with "Somado ao saldo".
2. **Filter chips** (US03): "Todos", "Em aberto", "Pagos", "Acertados", single select.
   - The choice lives in the URL as `?status=em_aberto|pago|acertado`, so the Início shortcut, reload and back keep it. No parameter or an invalid value means Todos.
   - The chips scroll sideways inside their row when they do not fit, never the page.
3. **List:**
   - Todos shows every transaction (expenses, incomes and split expenses), newest first, in the API order;
   - a status chip shows only the split expenses whose friend share has that status;
   - every row reuses `TransactionRow`: icon or friend avatar, description, meta line and the signed full amount (Business Rule 5);
   - a split row adds a second line with the status pill and "Parte de {primeiro nome}: {valor}":
     - em_aberto: "Aguardando reembolso";
     - pago: "Pago em {dd mmm}";
     - acertado: "Acertado em {dd mmm}".
4. **Row actions** (open split rows only), as two buttons under the row:
   - "Já acertamos" (secondary) and "Recebi" (success tint, check icon);
   - a tap turns the buttons into an inline confirmation in the same place:
     - Recebi: "Confirmar que {primeiro nome} pagou {valor}? O valor volta para o seu saldo." with "Confirmar" and "Cancelar";
     - Já acertamos: "Encerrar sem alterar o saldo?" with "Confirmar" and "Cancelar";
   - Confirmar sends one `PATCH /reimbursements/{id}` with `pago` or `acertado`, shows "Salvando..." and disables both buttons;
   - on success the row updates in place (pill and date), both summary cards update, and a `role="status"` line reads "Reembolso marcado como pago." or "Reembolso encerrado.";
   - on a 409 the row shows "Este reembolso já foi encerrado." and the list reloads; any other error shows the API message under the row and keeps the buttons;
   - the note under the list explains both actions: "Recebi: a parte do amigo volta para o seu saldo. Já acertamos: encerra o reembolso sem alterar o saldo, por exemplo quando vocês compensaram de outra forma. As duas ações são definitivas."
5. **Detail view** (US03, `/extrato/{id}`): every row opens it, on Extrato and in "Últimos lançamentos" on Início.
   - A back button returns to the previous screen (the list keeps its filter), or to `/extrato` when there is no history.
   - Top: the type ("Gasto" or "Receita"), the description and the signed full amount.
   - A list of fields, each with a label and a value:
     - Data ("20 de outubro de 2026"), Categoria (expenses), Local, Forma de pagamento (Pix, Débito, Crédito, Dinheiro), Parcela ("3 de 10"), Observações;
     - an empty optional field shows "Não informado" in `muted`, so the full US03 field set is always visible.
   - Split expenses add a "Divisão" card:
     - Amigo (avatar and full name), Como dividiu ("Igual", "{n}%" or "Valor fixo"), Parte de {primeiro nome}, Sua parte, Status (pill with date);
     - the same actions and confirmation as AC4 when the share is open.
   - An unknown or invalid id shows "Lançamento não encontrado" with a "Voltar para o extrato" link; other errors show the error card with "Tentar novamente".
6. **States:**
   - skeleton rows and cards while loading; the error card with "Tentar novamente" on failure;
   - empty Todos: "Nenhum lançamento ainda" with a "Novo gasto" action;
   - empty status filter: "Nenhum reembolso em aberto", "Nenhum reembolso pago" or "Nenhum reembolso acertado";
   - data is fetched again every time the screen opens, so a settle on the detail view shows on the list.
7. **Hide values:** every amount on both screens, including the confirmation text, goes through `Money` or the same mask.
8. **Layout:**
   - mobile matches the prototype;
   - from `md` the screen is one centered column up to 720 px wide, and rows keep the actions on the right of the row text when they fit;
   - the 008 layout scan rules apply at 360, 390, 768 and 1280 in both themes, including long descriptions, long friend names and R$ 10.000.000.000,00.
9. **Accessibility and copy:**
   - chips are a `role="radiogroup"` or toggle buttons with `aria-pressed`; a row is one link with an accessible name of description, amount and status; action buttons are separate from the link;
   - focus moves to the confirmation's first button when it opens and back to the action button on Cancelar;
   - 44 px targets, visible focus, reduced motion;
   - pt-BR copy with no em or en dash, "·", arrows or "…".
10. `npm run build` passes with strict TypeScript.

## Data Rules

- **Money:** integer cents from the API. The friend's share on a row is `share_cents` from the joined reimbursement, which equals `amount_cents − own_share_cents` (Business Rule 7). The summary totals are integer sums of `share_cents`.
- **One data source per screen:** Extrato loads `GET /transactions` and `GET /reimbursements` (no filter) once and joins them by `transaction_id`, so the filter is client side, chip changes need no request and every row has its `settled_on`.
- **A receber** on Extrato equals `GET /reimbursements/summary.open_cents` used on Início; both come from the same rows.
- **Dates:** `settled_on` and `occurred_on` are Brasília days formatted from the string, as in 009.
- **Settling:** `pago` adds the friend's share to the balance and `acertado` does not (Business Rules 1, 5 and 20). A closed share never reopens, so there is no undo.

## API Contract

No backend change. Uses `GET /transactions`, `GET /transactions/{id}`, `GET /reimbursements`, `PATCH /reimbursements/{transaction_id}`.

## Out of Scope

- Editing or deleting transactions (not in any story).
- Reopening a closed share (the API forbids it).
- Reminders and an "Em atraso" status (removed in 008, `goal.md`).
- Search, date range filters and pagination (the demo data is small).
- Making the category items in Gastos do mês open the detail view.

## Decisions

| Decision | Why | Rejected |
| --- | --- | --- |
| Extrato lists every transaction under "Todos", and the status chips narrow it to split expenses | "Ver extrato" on Início promises a statement, and US03 asks to filter transactions by status. One list covers both. | Reimbursements only, as in the prototype: incomes and plain expenses would have no list and no detail view. Two tabs (Lançamentos and Reembolsos): two lists for the same rows. |
| Join `/transactions` and `/reimbursements` on the client, filter on the client | Two requests per visit, instant chip changes, and the settled date on every row without a backend change. | `?status=` per chip: a request per tap and no `settled_on` on `/transactions`. A new API field: a backend change for display only. |
| Inline confirmation instead of a modal | Both actions are final, so a second tap is needed, and inline keeps the context and needs no dialog component or focus trap. | No confirmation: an accidental tap changes the balance for good. A modal library: a dependency for two questions. |
| Detail view as its own route | Reload and back work, and Início rows can link to it. | A bottom sheet over the list: lost on reload and harder to make accessible. |
| "Não informado" for empty optional fields | Shows the whole US03 field set during the presentation. | Hiding empty fields: the detail of a simple expense would look incomplete. |
