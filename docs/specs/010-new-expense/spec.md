# 010 New Expense — Spec

Stories: US01 (1-to-1 split), US02 (category suggestion), US05 (incomes as inflows) | Status: approved

## Problem

The API can record expenses, incomes and 1-to-1 splits, and it suggests a category from the description. The app still has only a "Novo gasto" placeholder, so a visitor cannot show the core of the product: paying R$ 120,00, splitting it with a friend and seeing the share become "a receber". This spec builds the form Vinicius approved (`docs/assets/prototype-new-expense.png`, dark: `prototype-new-expense-dark.png`).

## Acceptance Criteria

1. **Screen and type:**
   - `/novo-gasto` has a back button, a title and a "Gasto / Receita" segmented control;
   - the title follows the type: "Novo gasto" or "Nova receita";
   - `?tipo=receita` (the Início shortcut) opens on Receita; any other value opens on Gasto.
2. **Valor:**
   - a `MoneyField` parsed with `parseBRL`;
   - required, greater than zero and at most R$ 10.000.000.000,00;
   - errors: "Informe o valor." and "Use um valor até R$ 10.000.000.000,00.".
3. **Descrição:**
   - required, 1 to 120 visible characters (same rule as the API);
   - errors: "Informe uma descrição." and "Use até 120 caracteres.".
4. **Category suggestion (US02, expenses only):**
   - after the user stops typing for 400 ms, `GET /categories/suggest` runs with the description;
   - a match shows "Categoria sugerida: {nome}" under the field and selects that chip, unless the user already picked a category by hand;
   - no match shows nothing;
   - a failed suggestion is silent, because the category stays optional.
5. **Categoria (expenses only):**
   - chips from `GET /categories`, single select and optional;
   - tapping the selected chip clears it;
   - if the list fails to load, an inline error with "Tentar novamente" shows and the rest of the form still works.
6. **Data:**
   - a native date input, defaulting to today in Brasília;
   - `max` is today, so no future dates (API rule);
   - error: "A data não pode ser no futuro.".
7. **"Dividir com um amigo" (US01, expenses only):**
   - a switch, off by default;
   - when on, it shows a horizontal friend picker from `GET /friends`: avatar with initials and first name, single select, `role="radiogroup"`;
   - a "Novo" chip opens an inline name field (1 to 60 visible characters). Saving calls `POST /friends` and selects the new friend (Business Rule 11);
   - "Como dividir": Igual, Porcentagem or Valor fixo:
     - Igual needs no input;
     - Porcentagem asks for the friend's whole percent, 0 to 100;
     - Valor fixo asks for the friend's amount, more than 0 and at most the total (Business Rule 7).
   - two preview cards show "Parte de {primeiro nome}" and "Sua parte", recomputed as the user types:
     - the friend's share is `floor(total / 2)`, `floor(total × pct / 100)` or the fixed amount;
     - the user's share is the total minus the friend's share;
   - the note "O valor total sai do seu saldo agora. No orçamento do mês entra apenas a sua parte." (Business Rule 5);
   - errors: "Escolha um amigo.", "Use um número inteiro de 0 a 100." and "A parte do amigo deve ser maior que zero e até o valor total.".
8. **"Mais detalhes":** a collapsed section (button with `aria-expanded`) holding:
   - Local, up to 120 characters;
   - Forma de pagamento as single-select chips (Pix, Débito, Crédito, Dinheiro), optional;
   - Parcelas: number and total, 1 to 360, both or neither, with number ≤ total. Error: "Informe a parcela e o total, com a parcela até o total.";
   - Observações, up to 500 characters.

   It opens by itself when a field inside it has an error.
9. **Receita:**
   - shows only Valor, Descrição, Data and Mais detalhes, without Parcelas;
   - category and split are hidden and never sent (Business Rule 14);
   - the button reads "Salvar receita".
10. **Save:**
    - a primary button fixed above the safe area: "Salvar gasto" or "Salvar receita";
    - it validates every field, focuses the first invalid one, and shows each message under its field;
    - when valid it sends one `POST /transactions`, then disables the button and shows "Salvando...";
    - an API error appears in a pt-BR banner above the button, and the form keeps every value;
    - on success it goes to `/inicio` (replace), where a short confirmation reads "Gasto registrado." or "Receita registrada." (`role="status"`, it fades out, and it respects reduced motion).
11. **Layout:**
    - mobile matches the prototype;
    - from `md` the form is one centered column up to 560 px wide, and the save button sits at the end of the form instead of fixed;
    - nothing hides behind the fixed button or the tab bar;
    - the 008 layout scan rules apply at 360, 390, 768 and 1280 in both themes.
12. **Accessibility and copy:**
    - every field has a visible label and inputs are 48 px tall with 16 px text;
    - errors use `aria-invalid` and `aria-describedby`, and the suggestion line is `aria-live="polite"`;
    - pt-BR copy with no em or en dash, "·", arrows or "…".
13. `npm run build` passes with strict TypeScript.

## Data Rules

- **Money:**
  - amounts are integer cents from `parseBRL`;
  - the preview uses the same integer formulas as the backend (Business Rule 7), so what the user sees is what gets saved;
  - percent is parsed as a whole number from the digits only.
- **Payload:** built only from valid fields.
  - Blank optional text is omitted.
  - `occurred_on` is the `YYYY-MM-DD` from the date input.
  - `split` is `{ person_id, mode, percent? | share_cents? }` exactly as the `SplitCreate` union.
  - Incomes never carry `category_id`, `split` or installments.
- **Visible characters:** emptiness uses `trimInvisible` from `lib/text.ts`; maximum lengths count code points after that trim, exactly as the API's `max_length` does (Python `len`), so the form never lets a 422 through. Plain pt-BR text counts the same either way; only emoji and decomposed accents count more.
- **Today in Brasília:** computed from the device clock at UTC−3 (Business Rule 18). If the device date is ahead, the API is still the final check.

## API Contract

No backend change. Uses `GET /categories`, `GET /categories/suggest?description=`, `GET /friends`, `POST /friends`, `POST /transactions`.

## Out of Scope

- Editing or deleting transactions (not in any story).
- Creating category rules and the friends screen (012).
- Splits with more than one friend (`goal.md`).
- Receipt photos and recurring expenses.

## Decisions

| Decision | Why | Rejected |
| --- | --- | --- |
| Plain React state with one `validate()` function that returns errors per field | One form, about 12 fields. The rules mirror the API and stay readable in one file. | A form library (React Hook Form, Formik): a dependency for one form. Schema libraries (zod): duplicate the backend validation (008 decision). |
| Debounced suggestion that never overrides a manual pick | Shows US02 live while typing, without fighting the user. | Suggesting only on save: the visitor never sees it. Always overriding: the chip jumps under the user's finger. |
| "Mais detalhes" as an inline expandable section | Keeps one form state and one save button, and the main fields stay above the fold. | A separate screen (the prototype's chevron): state must survive navigation and needs two back paths. |
| Inline "Novo" friend inside the picker | Business Rule 11 lets visitors add their own names, and adding where it is needed avoids leaving the form. | Sending the user to Amigos (012): loses the form and the screen does not exist yet. |
| Confirmation via router state on Início | Shows that saving worked and returns to the updated balance and "a receber" numbers. | A toast library: a dependency for one message. Staying on the form: the visitor does not see the effect. |
