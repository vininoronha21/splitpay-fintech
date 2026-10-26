# 012 Settings and Friends — Spec

Stories: US05 (balance adjustment with history), US02 (category rules), US01 (friends for 1-to-1 splits) | Status: approved

## Problem

Configurações has only Aparência and Sair, and Amigos is a placeholder. The API already adjusts the balance with a reason and keeps the history (Business Rules 3, 12 and 19), lists and creates category rules (Business Rule 8), and lists and adds friends (Business Rule 11). Without screens, a visitor cannot show the US05 adjustment or create the US02 rule "uber" → "Transporte". This spec builds both screens from the approved prototypes (`docs/assets/prototype-settings.png`, `prototype-friends.png`).

## Acceptance Criteria

### Configurações (`/configuracoes`)

1. **Profile card:** avatar with initials, the saved name and "Conta de demonstração".
2. **Aparência:** the existing `ThemeControl`, unchanged.
3. **Ajustar saldo** (US05):
   - the note "Use quando o saldo do app estiver diferente do saldo no banco.";
   - "Saldo atual" from `GET /balance`;
   - "Novo saldo": a `MoneyField`, required, from R$ 0,00 to R$ 10.000.000.000,00;
   - "Diferença: {valor}" under the field as the user types, signed, in `success` when positive and `danger` when negative; hidden while the field is empty or invalid;
   - "Justificativa": a text area, 10 to 200 visible characters, with the hint "Obrigatória, com pelo menos 10 caracteres." and a live counter "{n}/10" that becomes "{n}/200" once it reaches 10;
   - "Confirmar ajuste" is enabled always and validates on tap, focusing the first invalid field;
   - errors: "Informe o novo saldo.", "Use um valor até R$ 10.000.000.000,00.", "O novo saldo é igual ao saldo atual.", "Escreva pelo menos 10 caracteres." and "Use até 200 caracteres.";
   - on success: one `POST /balance/adjustments`, the fields clear, "Saldo atual" and the history refresh, and a `role="status"` line reads "Saldo ajustado.";
   - an API error shows its pt-BR message under the button and keeps the values; a double tap sends one request.
4. **Histórico de ajustes** from `GET /balance/adjustments`, newest first:
   - each item shows the date and time ("10 out 2026, 18:00"), the signed delta (`success` or `danger`), "De {anterior} para {novo}" and the reason;
   - the first item carries a "Mais recente" pill; a vertical timeline line joins the items;
   - empty: "Nenhum ajuste ainda.";
   - more than 5 items show the 5 newest and a "Ver todos ({n})" button that expands the rest.
5. **Orçamento mensal:** `monthly_budget_cents` from `GET /profile`, with "Definido nos dados de demonstração" (Business Rule 13, read only).
6. **Regras de categoria** (US02):
   - the note "Palavras da descrição que definem a categoria sugerida. Existem {n} regras padrão.";
   - the user's rules first, newest first, each with keyword, a "Sua regra" pill, the category and a delete button (`aria-label` "Excluir regra {palavra}");
   - then the default rules, collapsed behind "Ver regras padrão ({n})";
   - add form: "Palavra-chave" (1 to 80 characters, at least one letter or digit), a "Categoria" native select from `GET /categories`, and "Adicionar";
   - errors: "Informe uma palavra-chave.", "Use até 80 caracteres.", "Escolha uma categoria."; API errors (409 "Já existe uma regra com essa palavra-chave.", the 422 about letters and 40 characters) appear under the form;
   - on success the new rule appears at the top of the user rules, the form clears and a status line reads "Regra criada.";
   - deleting removes the row at once after the API answers 204, with "Regra excluída."; a failure keeps the row and shows the message.
7. **Sair:** unchanged.

### Amigos (`/amigos`)

8. Title "Amigos" and subtitle "Pessoas com quem você divide despesas".
9. **Adicionar amigo:** a "Nome do amigo" field (1 to 60 visible characters) and an amber "+" button (`aria-label` "Adicionar amigo"); Enter submits.
   - errors: "Informe o nome do amigo.", "Use até 60 caracteres."; the API 409 shows "Já existe um amigo com esse nome.";
   - on success the field clears, the list reloads and a status line reads "Amigo adicionado: {nome}.".
10. **List** from `GET /friends` (sorted by the API), one row per friend: avatar, full name, and either "{valor}" in `accent-text` with "a receber" under it (from `GET /reimbursements/summary` `by_person`) or "Sem pendências" in `muted`.
11. The note under the list: "Não é possível cadastrar dois amigos com o mesmo nome."
12. Empty list: "Nenhum amigo ainda".

### Both screens

13. **States:** each card loads on its own with a skeleton and an error card with "Tentar novamente"; data is fetched every time the screen opens.
14. **Hide values:** every amount (saldo atual, diferença, histórico, orçamento, a receber) goes through `Money` or the same mask.
15. **Layout:** mobile matches the prototypes; from `md` each screen is one centered column up to 640 px; the 008 layout scan rules apply at 360, 390, 768 and 1280 in both themes, including R$ 10.000.000.000,00, a 200-character reason and a 60-character friend name; no focus hidden under the tab bar.
16. **Accessibility and copy:** visible labels, 48 px inputs with 16 px text, `aria-invalid` and `aria-describedby` on errors, 44 px targets, visible focus, reduced motion; pt-BR copy with no em or en dash, "·", arrows or "…".
17. `npm run build` passes with strict TypeScript.

## Data Rules

- **Money:** integer cents. The difference is `new − current`, both integers. The adjustment sends `new_balance_cents`; the API stores the delta (Business Rule 12).
- **Visible characters:** emptiness uses `trimInvisible`; maximum lengths count code points after that trim, as the API does (same rule as 010).
- **Dates:** `created_at` is a Brasília `YYYY-MM-DD HH:MM:SS` string, formatted from the string, never through a browser `Date`.
- **Shared demo data:** another visitor may change the balance between load and submit. The API compares with the balance at that moment, so the stored delta is always right; after any adjustment the screen reloads the balance and history.

## API Contract

No backend change. Uses `GET /profile`, `GET /balance`, `GET /balance/adjustments`, `POST /balance/adjustments`, `GET /categories`, `GET /categories/rules`, `POST /categories/rules`, `DELETE /categories/rules/{id}`, `GET /friends`, `POST /friends`, `GET /reimbursements/summary`.

## Out of Scope

- Editing or deleting friends and editing rules (Business Rules 8 and 11).
- Editing the budget (Business Rule 13) or the initial balance after login (Business Rule 4).
- A negative new balance: the API accepts it, but the demo balance never goes below zero and `parseBRL` has no sign.
- Per-friend history or a link from a friend to the statement.

## Decisions

| Decision | Why | Rejected |
| --- | --- | --- |
| New balance from R$ 0,00 up, no sign input | The seeded demo never goes negative, and `MoneyField` and `parseBRL` stay as they are. | A sign toggle: one more control and a new parser path for a case the demo never shows. |
| Native select for the rule's category | Eight options, accessible on every phone, no new component. | Category chips: a second chip row on an already long screen. A custom dropdown: focus and keyboard code for one field. |
| Default rules collapsed behind a button | The user's own rules are what the demo shows; 31 default rows would push Sair far down. | Showing all rules: a long scroll. Hiding defaults entirely: the count in the note could not be checked. |
| Delete a user rule without confirmation | It is undone by adding the rule again and touches no money. | A confirmation like Extrato's: friction for a reversible action. |
| Reload the friend list after adding | The API sorts names accent-aware; reloading keeps one ordering rule. | Inserting locally: a second sort that could disagree with the API. |
