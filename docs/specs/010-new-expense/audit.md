# 010 New Expense — Audit Report

Auditor: `auditor` agent | Date: 2026-10-24 (UTC; 2026-10-23 evening in Brasília) | Branch: `feature/mvp-plan` | Commits audited: `adb2cb1..2a4f39d` (`3b05de5` approval, `ee3e92b` form logic, `b317347` docs, `4aa9b86` screen, `47767ba` polish, `2a4f39d` docs). The `backend/` diff is empty.

Runtime: Node 22.22.0, Chromium 1194 through Playwright 1.56.1, Python `.venv` from `backend/`. API on `:8000` (`FRONTEND_ORIGIN=http://localhost:4173`, scratch DB, recreated before each runtime batch), `vite preview` on `:4173` after `npm run build`. Login by setting `localStorage["splitpay.name"]`. Scratch directory: `/tmp/claude-0/-home-claude-splitpay-fintech/03833dd2-2eab-509b-b278-e168f70beef2/scratchpad/audit010/` (written `$A` below). All scripts and screenshots stay there, never in the repo.

## Evidence Gathered

| # | Check | Command / method | Result |
| --- | --- | --- | --- |
| E1 | Strict build | `cd frontend && npm run build` | **Passes**, 1972 modules, no TS errors. |
| E2 | Static greps | `rg` over `frontend/src` | No `any`, `as unknown as`, `@ts-*` or `eslint-disable`. The only casts are the 008 API boundary ones (`services/api.ts:75`, `:134`). Hex only in `theme.css` and `BrandMark.tsx`; no new `rgba(`. No `toFixed`, `parseFloat`, `parseInt` or `Math.round`. The only new money math is `transactionForm.ts:245` (`Math.floor(total / 2)`) and `:251` (`Math.floor(total * pct / 100)`, at most 10¹⁴, exact). The only `fetch(` is `services/api.ts:116`. The new `new Date()` calls (`NewTransactionScreen.tsx:100`, `:172`) only feed `brasiliaToday`, which reads UTC fields (`dates.ts:146-155`). No local `Date` getters, `toLocale*Date` or `Intl.DateTimeFormat`. |
| E3 | `transactionForm.ts` self-checks (`$A/form-check.ts`, `node --experimental-strip-types`) under TZ = UTC, America/Sao_Paulo, Pacific/Kiritimati, Pacific/Pago_Pago | Every message and boundary | **106,137 assertions, 0 failures in all 4 TZs.** Valor: "", 0, 0,00, `-5`, `abc`, `,50` → "Informe o valor."; 0,01, 1 and exactly R$ 10.000.000.000,00 (with and without dots) pass; 10.000.000.000,01 and a 20-digit number → "Use um valor até R$ 10.000.000.000,00.". Descrição: 120 passes, 121 fails, invisible-only (`​`, `⠀`, `ㅤ`) is "Informe uma descrição.", padding with invisible characters is trimmed before counting; 60 emoji with skin tone (120 code points) pass, 61 fail; 61 decomposed "é" (122 code points) fail, exactly as Python `len`. Date: today passes, tomorrow fails, also for incomes; a cleared date has no error and is omitted. Split: no friend, percent "", −1, 101, 50.5, "3 0", Arabic digits fail; 0, 100, "007", " 30 " pass; share 0, `abc`, total + 1 fail, 0,01 and the total pass; a share over a lowered total fails again. Place 120/121, notes 500/501, also for incomes. Installments 0/1, 1/0, 361/361, 1/361, 3/2, one of the pair → error; 1/1, 360/360, 1/360, 01/012 pass; ignored for incomes. `toPayload`: trims text, omits blank optionals and a cleared date, incomes drop `category_id`, `split` and installments even when set, the three `SplitCreate` shapes are exact, and invalid values throw `RangeError`. `brasiliaToday`: 02:59:59.999Z vs 03:00Z, New Year, 29 Feb 2028, year 0099, invalid `Date` throws, and every 15 minutes from Dec 2025 to Feb 2028 equals the UTC−3 reference. |
| E4 | Split preview vs backend | 30,000 previews (10,000 per mode; totals 1 cent to R$ 10 bilhões, three text styles) compared with `friend_share` imported from `backend/app/services/transactions.py` | **0 mismatches**; every pair sums to the total. |
| E5 | Invisible characters | All 1,114,112 code points through `trimInvisible` (JS) and `_is_invisible` (Python) | **Identical sets (259 code points).** So "empty" and lengths after the trim agree with the API. |
| E6 | Payloads vs the live API (`$A/post-payloads.py`) | 1,097 random forms that pass `validate()` (21% with boundary text, 41% split, 30% income, 19% installments, 38% without date), `toPayload` sent as `POST /transactions` | **1,097 × 201, 0 rejected.** Every stored split equals `friend_share`, status `em_aberto`; stored description, place and notes equal the trimmed text. (A first run used a fixed "today" a day ahead of Brasília and got `future_date` 422s from the API, which is the expected 4xx; rerun with the real day.) |
| E7 | Runtime AC1 to AC11 (`$A/flow.cjs`) | Seeded API, Playwright at 390 and 1280 | **175 checks, 0 failures.** Summarized per AC below; numbers include: suggest request 400 ms after the last input event, exactly 1 request for "Janta com a galera", the earlier request aborted (`requestfailed`) when the text changes during a slow response; equal R$ 120,00 with Ana → 6000/6000 `em_aberto`; 30% → 3600/8400; fixed R$ 45,50 with Fernanda → 4550/7450; **18 random UI saves** (totals up to R$ 10 bilhões, each mode) where the preview text equals the saved detail; R$ 77,70 split with Pedro → balance −7770, Pedro's open share +3885; income R$ 1.234,56 → balance +123456 and Início shows the new balance. |
| E8 | Layout scan (`$A/scan.cjs`, `$A/scan/`) | 13 states × 360/390/768/1280 × light/dark = **104 full-page screenshots**: empty, every error, split equal/percent/fixed, details open, 30 long friend names with "Novo" open, R$ 10 bilhões with a 120-char description and place, R$ 9.999.999.999,99 equal, Receita, API banner, categories and friends failed, loading. Same method as 009 E13, plus: text inside the friend scroller is not counted as clipped, but the scroller itself must stay inside the viewport; "under the bar" uses the top of the save bar or the tab bar, whichever is higher | **0 horizontal scroll, 0 overlaps, 0 clipped text, 0 content under the save bar or tab bar.** Only "Maximiliano Bartolomeu" names end in an ellipsis inside their 60 px column. Not covered by text-node scanning: the Valor input value at 360 px (n1). |
| E9 | Prototype comparison | `scan/claro-390-split-equal.png`, `escuro-390-split-equal.png`, `claro-360-huge.png`, `escuro-1280-errors.png`, `vp-*-360-banner-bottom.png` against `prototype-new-expense*.png` | Mobile light and dark match in structure, spacing, copy and colors (suggestion line, selected chip, ring on Ana, amber switch, preview cards, note, Mais detalhes, fixed amber button). Differences: the tab bar under the save bar (the app's shell), the date in the browser's own format (Playwright runs en-US; a pt-BR browser shows 23/10/2026). Desktop: one centered 560 px column with the button at the end. |
| E10 | Keyboard and focus (`$A/a11y.cjs`) | Tab through the whole form (split fixed with a friend, details open) at 360/390/768/1280 × both themes × with and without the API banner (16 runs) | **Every stop has a 2 px ring; no control under 44 px; inputs 48 px at 16 px** (Valor 56 px at 26 px; Observações 98 px). **Without the banner, no focused control is ever under the save bar or tab bar.** With the banner at 360 and 390 px, 4 controls are partly or almost fully covered (m1). Radiogroups (type, friends, mode) have one tab stop; arrows, Home and End move and select with wrap; Space and Enter toggle the switch. |
| E11 | Contrast (`$A/contrast.cjs`, `$A/sw.cjs`) | Every visible text node in 9 states × 390/1280 × 2 themes (780 runs per theme), with stacked backgrounds; then the new tokens | **0 text below AA.** Lowest light: `accent-text` on white 5.02, danger on the banner 5.30, "Alimentação" chip 6.37. Lowest dark: segmented muted 5.12, muted "R$ 0,00" on the friend card 5.13. Placeholders 7.7 (light) and ≥7 (dark). **Non-text:** `accent-edge` on white 3.19 (selected chip border, avatar ring, switch rim); dark `accent-edge` 10.61. Switch off: track `#8b8b94` on surface 3.38 light, 5.25 dark; knob on it 3.38. Switch on: amber track on white 1.67, but its 1 px inset rim is 3.19; knob rim `#92400e` on amber 4.25. All meaningful states pass 3:1. |
| E12 | Reduced motion | `reducedMotion: "reduce"` | Confirmation has `transition-property: none` (fade skipped); switch thumb, track and chevron use `motion-reduce:transition-none`. |
| E13 | Copy | `rg "[—–·→…]" frontend/src`; read every new pt-BR string | **Empty.** Strings beyond the spec ("Informe o nome do amigo.", "Nenhum amigo ainda. Toque em Novo para adicionar.", "Adicionar"/"Adicionando...", "Cancelar", "Salvando...", "Porcentagem do amigo", "Valor do amigo", "Parte do amigo", "Algo deu errado. Tente novamente.", "Parcela", "Total de parcelas") read naturally. Two small wording points in n5. |
| E14 | Scope, dependencies, backend, tracked files | `git diff adb2cb1..HEAD --stat -- backend frontend/package*.json`; `.venv/bin/pytest -q`; `git ls-files` | Backend and dependency diffs **empty**. **743 passed.** Only `.env.example` files tracked; no `.env`, `*.db`, `node_modules` or `dist`. Nothing out of scope: one friend per split, no editing or deleting, no rule creation, no receipts or recurrence. |
| E15 | Structure and tokens | New files against `repository-structure.md`; `theme.css` diff | 7 new components in `app/components/` and `ui/Switch.tsx` in `ui/` (allowed folders); `lib/transactionForm.ts` listed at `repository-structure.md:93`. Exactly 4 new tokens (`accent-edge` with dark overrides in both dark blocks, `switch-thumb`, `switch-off`, `switch-thumb-edge`) and one rule, `scroll-padding-bottom` under `width < 48rem`, scoped by `html:has([data-save-bar])`: measured 146 px on the form, `auto` on Início and from md. Existing tokens unchanged. The plan's file list omits `Chip.tsx` and `theme.css` (n6). |
| E16 | Regressions on 008/009 | `Chip` is used only by `CategoryPicker` and `MoreDetails`; reran 009 `home.cjs` and `scan2.cjs` on a fresh DB | 009 layout scan: **112 screens, 0 issues.** `home.cjs` 33 pass; the 2 diffs are the known avatar-initials expectation from 009. The new `SaveConfirmation` region on Início adds nothing visible when idle. |
| E17 | Edge probes (`$A/edge.cjs`, `$A/hide.cjs`, `$A/money.cjs`, API by curl) | Cleared date, typed 5-digit year, inline friend while the list failed, hide values on, long amounts, lone surrogate, duplicate friend | Cleared date saves as today with no message; typing "20261" in the year leaves `0261-10-23`, saved with no message (n2). Friend created while `GET /friends` failed is selected but never drawn, and the split saves with them (m2). Hide values masks the preview cards (n4). Valor at 360 px: R$ 10.000.000.000,00 needs 246 px in a 226 px input (n1). A lone UTF-16 surrogate in a description gets the API's generic 422 (n7). Duplicate "  âna   lima " → 409 "Já existe um amigo com esse nome." shown under the field. |
| E18 | Servers and repo | Stop uvicorn and `vite preview`; curl both ports | Both ports refuse (`000`). `git status` was clean before this file was written. |

## 1. Spec Compliance

- [x] **AC1: Pass.** Back link to `/inicio`, title follows the type, "Tipo de lançamento" radiogroup with arrow keys. `?tipo=receita` opens on Receita; `RECEITA`, `gasto`, empty and absent open on Gasto; the Início shortcut links `/novo-gasto?tipo=receita` (E7).
- [x] **AC2: Pass.** Both messages and every boundary (E3, E7). Malformed amounts read "Informe o valor." (n3).
- [x] **AC3: Pass.** 1 to 120 code points after `trimInvisible`, matching the API (E3, E5, E6).
- [x] **AC4: Pass.** 400 ms debounce, one request, abort of the previous one, latest wins, `aria-live="polite"`, chip selected, manual pick never overridden, no match and failure show nothing and raise no alert (E7).
- [x] **AC5: Pass.** 8 chips, single select, tapping the selected chip clears it. With `GET /categories` failing: inline alert with "Tentar novamente", the form still saves, retry brings the chips (E7).
- [x] **AC6: Pass.** Native date, default and `max` are Brasília today, also with the browser in Tokyo, Los Angeles and Kiritimati at the 03:00 UTC boundary; future date error (E7). Silent fallbacks in n2.
- [x] **AC7: Pass, with m2.** Switch off by default; friends load only on first switch on, once; radiogroup with initials and first names; "Novo" with focus, required, 61 characters, duplicate (409) messages, Enter saves without submitting the form, Escape returns focus; the new friend is selected and focused with no refetch. Modes, digits-only percent, preview recomputed as the user types and equal to the saved detail in 21 saves (E4, E7). All three error messages.
- [x] **AC8: Pass.** `aria-expanded`/`aria-controls`, Local, payment chips (toggle off), installments both-or-neither and number ≤ total, notes; the section opens and focuses Local on submit (E7).
- [x] **AC9: Pass.** Only Valor, Descrição, Data and Mais detalhes without Parcelas; with category, split and installments filled under Gasto, the income payload has only `type`, `description`, `amount_cents`, `occurred_on`; switching back restores them (E7).
- [x] **AC10: Pass.** Focus moves to the first invalid field (amount, description, friend, Local tested); one POST on double click, Enter and a forced click; "Salvando..." disabled; API and network errors in the banner with every value kept; success replaces the history entry, Início shows "Gasto registrado." or "Receita registrada." in `role="status"`, gone after about 3 s, not repeated on reload, no fade with reduced motion; balance and "a receber" updated (E7, E12).
- [x] **AC11: Pass, with m1.** Mobile matches the prototype; from md one centered column ≤ 560 px with a static button at the end; 104 screenshots clean (E8, E9). Keyboard focus can sit under the save bar while the API banner is shown (m1).
- [x] **AC12: Pass.** Visible labels on every input; the friend group's label is visually hidden under the visible "Dividir com um amigo" heading, as in the prototype. `aria-invalid`/`aria-describedby` on inputs, the installments pair and the friend radiogroup; inputs 48 px at 16 px; copy scan empty (E7, E10, E13).
- [x] **AC13: Pass.** E1.

**Data Rules: Pass.** Integer cents end to end, preview with the backend formulas (E4), percent from digits only, payload only from valid fields, blank optionals omitted, `SplitCreate` shapes exact, incomes never carry category, split or installments (E3, E6, E7). Visible characters as amended in T1 match the API code point for code point (E5). Today in Brasília from UTC fields (E3, E7).

## 2. Security & Data Consistency

- [x] **Money.** No floats on amounts; the two `Math.floor` divisions are exact for totals up to R$ 10 bilhões (E2, E4).
- [x] **No backend change**; `pytest` 743 passed; `checks.sql` does not apply (E14).
- [x] **The form never produces a 422 for anything a user can type through it** (E6), apart from the lone-surrogate edge in n7. Error messages render as text.
- [x] **No secrets or data files committed** (E14). All writes went to a scratch DB.

## 3. Structural & Stack Rules

- [x] **TypeScript.** Strict, no escapes (E1, E2). `FriendList` is a discriminated union.
- [x] **Dependencies.** None added. No form library, no toast library, as decided.
- [x] **Files.** All in allowed places; `transactionForm.ts` recorded; tokens recorded in the design skill (E15). Plan list lag in n6.
- [x] **Process.** Spec and plan approved (`3b05de5`) before the first code commit (`ee3e92b`). Commit hygiene notes in n6.

## Findings

### Blocker

None.

### Major

None.

### Minor

- **m1. With the API error banner showing, keyboard focus can land under the fixed save bar on phones.**
  - `frontend/src/styles/theme.css:162-164` sets a fixed `scroll-padding-bottom: calc(146px + safe-area)` (save bar 73 px + tab bar 61 px + 12 px). The banner (`NewTransactionScreen.tsx:310-318`) grows the save bar to 145 px, so the bars cover 206 px.
  - At 360 and 390 px in both themes, Shift+Tab / Tab after an API or network error leaves "Valor fixo" with 4 of 44 px visible (top 550, bar at 554 in a 740 px viewport), and "Mais detalhes", "Parcela" and "Total de parcelas" partly covered (`$A/a11y.cjs`). The network banner ("Não foi possível conectar ao servidor. Tente novamente.") is a realistic demo state. The page content itself stays clear, because the spacer at `:300` follows the measured height.
  - This contradicts AC11 ("nothing hides behind the fixed button") and the rule's own WCAG 2.4.11 comment.
  - **Fix:** drive the padding from the measured height, e.g. in `NewTransactionForm` a `useLayoutEffect` that sets `document.documentElement.style.scrollPaddingBottom = \`calc(${saveBarHeight + 61 + 12}px + env(safe-area-inset-bottom))\`` below md and clears it on unmount (or set a CSS variable `--save-bar-h` there and use it in the `theme.css` rule). Rerun the keyboard sweep with the banner at 360/390.
- **m2. A friend added while the friend list failed to load is selected but never shown.**
  - `NewTransactionScreen.tsx:59-61` returns `{ status: "error" }` and drops `added`; `FriendPicker.tsx:59` then renders no radios. After "Novo" → "Adicionar", the new friend is the split's `person_id`, the preview reads "Parte do amigo", focus goes to `body` (`FriendPicker.tsx:62-70` finds no radio), and saving stores the split with that friend (`edge-friend-list-error.png`; saved `person_name: "Beatriz Audit"`).
  - The user cannot see who the expense is split with, which is the core of US01. Reaching it needs `GET /friends` to fail, which the form explicitly supports.
  - **Fix:** in `useFriendList`, when the load failed, still expose the added friends: e.g. a `ready`-like list of `added` shown together with the error and retry, or make `FriendList`'s error variant carry `friends: added`. Then the avatar is drawn, selected and focused, and the preview names the friend.

### Informational

- **n1. Valor cuts the last digit of R$ 10 bilhões at 360 px.** `ui/MoneyField.tsx:152` is 26 px bold; "10.000.000.000,00" needs 246 px in a 226 px input, so it shows "10.000.000.000,0" until the caret scrolls it. R$ 1 bilhão fits within 3 px; 390 px and up fit. Native input scrolling keeps it usable. Optional: step the font down to 22 px from 16 characters.
- **n2. Two silent date fallbacks.** A cleared date is omitted and saved as today with no message (`transactionForm.ts:211-212`, `:300`). A year typo ("20261" leaves `0261-10-23`) is saved as year 261, because nothing sets a `min`. Neither is in the spec. Optional: "Informe a data." for a cleared field, and `min="2000-01-01"` with a message.
- **n3. A malformed amount such as "12.50" reads "Informe o valor."**, which suggests the field is empty (`transactionForm.ts:146-151`). This follows the spec's two messages. Optional spec tweak: "Use o formato 12,50.".
- **n4. Hide values masks the split preview** ("R$ ••••") while the user types the amounts. This follows 008 ("every amount goes through `Money`"). For the demo, consider showing plain amounts on the form.
- **n5. Wording.** "A parte dele fica registrada como a receber." (`SplitSection.tsx:70`, from the prototype) assumes a male friend; "A parte do amigo fica registrada como a receber." is neutral. "Toque em Novo para adicionar." (`FriendPicker.tsx:185`) reads oddly on desktop; "Use Novo para adicionar um amigo." works for both.
- **n6. Plan and commits.** `plan.md` and the T3 file list do not name the `ui/Chip.tsx` border change or the `theme.css` tokens and rule (both in `47767ba`). `ee3e92b` (`feat(web)`) also carries the spec's Data Rules amendment; a separate `docs(spec)` commit would make the post-approval change visible. `47767ba` uses `style(web)` for visual changes again (009 n5).
- **n7. A lone UTF-16 surrogate** pasted into a text field passes the form and gets the API's generic 422 "Dados inválidos na requisição." shown in the banner. Practically unreachable by typing; no action needed.
- **n8. A save within 400 ms of changing the description** keeps the previous suggested category. The chip on screen is what is saved, so the result is what the user saw; no action needed.

## Verdict

**PASS, with 2 minor findings open (m1, m2).** No blocker or major.

All 13 acceptance criteria and the Data Rules hold under my own runs:
- 106,137 logic assertions in 4 time zones;
- 30,000 previews equal to the backend's `friend_share`;
- 1,097 generated payloads all accepted by the API (201) with matching splits;
- 175 runtime checks, including 21 saved splits whose preview equals the stored detail;
- 104 layout screenshots with no overlap, clipping, horizontal scroll or hidden content;
- focus rings, 44 px targets, 48 px inputs, AA text and 3:1 states in both themes;
- an empty copy scan;
- no dependency or backend change (743 passed), and no regression on 008/009 (009 scan 112/0).

m1 and m2 are small, local fixes. Following the rule used for 009 (PASS with no open minors), T5 should stay unchecked until m1 and m2 are fixed and checked again: the keyboard sweep with the banner at 360/390, and an inline friend added while `GET /friends` fails. The informational notes are optional.
