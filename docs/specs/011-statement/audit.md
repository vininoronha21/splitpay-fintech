# 011 Statement — Audit Report

Auditor: `auditor` agent | Date: 2026-10-24 | Branch: `feature/mvp-plan` | Commits audited: `bb028ba` (statement logic, long date), `f315f96` (screens), `aee0205` (docs), `9022c7e` (visual polish), diffed against `dev`. The `backend/` and `frontend/package*.json` diffs are empty.

Runtime: Node 22.22.0, Chromium 1194 through Playwright, Python `.venv` from `backend/`. API on `:8000` (`FRONTEND_ORIGIN=http://localhost:4173`, scratch DB, recreated before each runtime batch), `vite preview` on `:4173` after `npm run build`. The first run logs in through `/entrar`; the others set `localStorage["splitpay.name"]`. Scratch directory: `/tmp/claude-0/-home-claude-splitpay-fintech/03833dd2-2eab-509b-b278-e168f70beef2/scratchpad/audit011/` (written `$A` below). All scripts, data and screenshots stay there, never in the repo.

## Evidence Gathered

| # | Check | Command / method | Result |
| --- | --- | --- | --- |
| E1 | Strict build | `cd frontend && npm run build` | **Passes** (`tsc -b && vite build`, 1978 modules, no TS errors). |
| E2 | Static greps | `rg` over `frontend/src` and over the added lines of `git diff dev..feature/mvp-plan` | No `any` (only English words in comments), no `@ts-*`, `eslint-disable` or new casts. The only casts are still the 008 API boundary ones (`services/api.ts:75`, `:134`). No `toFixed`, `parseFloat`, `parseInt` or `Math.round`. The added lines have no `new Date`, `toLocale*`, `Intl.`, `fetch(`, `localStorage`, `dangerouslySetInnerHTML`, hex colors or `rgba(`. Money math in 011 is only integer `+=` in `statementTotals` and the sign flip in `signedCents`. |
| E3 | Copy scan | `rg "[—–·→…]" frontend/src` | **Empty** (exit 1). Every new pt-BR string matches the spec text word for word, including the note under the list and both confirmation questions. |
| E4 | Scope, dependencies, structure | `git diff dev..feature/mvp-plan --stat`; `repository-structure.md` | No backend or dependency change; `pytest` **743 passed**. New files: 5 components in `app/components/` and `lib/statement.ts`, which `repository-structure.md:93` now lists. `ui/Button.tsx` gains a `success` variant (recorded under "Changes during T2"). No `.env`, `*.db`, `node_modules` or `dist` tracked. Out of scope: no editing, deleting or reopening, no reminders or "Em atraso", no search or pagination, 1-to-1 only. |
| E5 | `statement.ts` self-checks (`$A/statement-check.mts`, `node --experimental-strip-types`) under TZ = UTC, America/Sao_Paulo, Pacific/Kiritimati | 2,000 random rounds (0 to 40 transactions, 20% income, 50% split, amounts up to 10¹² cents, reimbursements shuffled), plus fixed cases | **45,563 assertions, 0 failures in each TZ.** The join keeps the `/transactions` order and attaches every share to its own transaction, and an orphan share is ignored. `share_cents = amount − own_share` on every split. Each status filter equals the expected id list, and the totals equal integer sums with safe integers. `applySettle` moves exactly one entry (open to pago or acertado), the totals follow, the other entries keep their object identity and the input is not mutated; a `keep` id stays listed, and a plain transaction is a no-op. Parser: `em_aberto`/`pago`/`acertado` are accepted; `""`, `null`, `EM_ABERTO`, `Pago`, `" pago"`, `"pago "`, `todos`, `pago,acertado` and `status[]` give null; with a repeated `?status=pago&status=acertado`, `get` returns the first value. Labels: "Pago em 5 jan", "Acertado em 14 out", "Pago" without a date, "Nada em aberto"/"1 em aberto"/"4 em aberto", the 3 empty titles, "Igual"/"0%"/"30%"/"100%"/"Valor fixo", "3 de 10"/"1 de 1"/null for a missing half, the 4 payment labels; `firstName` with padding, a zero-width space and NBSP. `formatLongDate` matches a UTC reference for every day from 2000 to 2030; 2026-02-30 throws. |
| E6 | Runtime flow (`$A/flow.cjs`), seeded API, 390 px | Real login, list, chips, settle paths, errors, focus | **120 checks, 0 failures.** Numbers below are from this run. |
| E6a | Summary | vs `GET /reimbursements/summary` and the sum of `pago` shares | "A receber" R$ 377,45 = `open_cents` 37745; "4 em aberto" = `open_count`; "Já recebido" equals Σ pago (450594). After each settle, both cards and the count match the API again. |
| E6b | Chips | Each chip vs `GET /reimbursements?status=` | Each chip shows exactly the API ids, in `/transactions` order; Todos shows all 69 in API order. A chip tap sends **0 requests** and adds **no history entry** (`replace`). Exactly one chip is `aria-pressed="true"`. `?status=EM_ABERTO`, `?status=`, `?status=x` open on Todos; `?status=pago&status=acertado` opens on Pagos. |
| E6c | Deep link | Início "Reembolsos" shortcut | Opens `/extrato?status=em_aberto` with "Em aberto" pressed and only open rows; reload keeps the chip; back returns to `/inicio`. |
| E6d | Rows | All 69 rows on Todos | Each link's accessible name is "description, signed amount[, status with date]". Each split row shows the pill and "Parte de {first}: {share}". The only buttons are "Já acertamos"/"Recebi" on open rows. **0 interactive descendants inside any row link.** |
| E6e | Settle | Balance and requests | **Cancelar sends 0 PATCH.** Double click on Confirmar plus a forced click on the disabled button send **exactly 1 PATCH**; "Salvando..." shows and both buttons are disabled meanwhile. Recebi raises `/balance` by **exactly the share** (9395); the row reads "Pago em 24 out" in place, `role="status"` reads "Reembolso marcado como pago.", and the row stays listed under Em aberto until the chip changes. Já acertamos leaves `/balance` **unchanged**, with "Acertado em 24 out" and "Reembolso encerrado.". |
| E6f | Errors | Real 409, forced 500, network abort | **Real 409** (share settled via `PATCH` first): "Este reembolso já foi encerrado." shows, the background reload turns the row to "Pago em 24 out" with no buttons, the row stays listed, and the summary matches the API. **Forced 500** (route interception): the API message shows under the row in `role="alert"`, Confirmar and Cancelar stay enabled, and focus returns to Confirmar. A network abort shows "Não foi possível conectar ao servidor. Tente novamente.". |
| E6g | Focus | Confirmation open, cancel, success | Opening focuses Confirmar (Recebi and Já acertamos, by mouse and by keyboard). Cancelar returns focus to the button that opened it. After success or a 409, focus goes to the message. |
| E6h | Detail and back | Settle on the detail, back | The row link opens `/extrato/{id}`. Recebi on the detail updates the Status pill and announces the status line. **Voltar returns to `/extrato?status=em_aberto`**, and the list is refetched: the settled share has left Em aberto. A fresh tab at `/extrato/{id}`: Voltar goes to `/extrato`. |
| E6i | States | Interception | Skeletons on the summary and the list (`aria-busy`). List error card with "Tentar novamente", which reloads. Empty Todos: "Nenhum lançamento ainda" with "Novo gasto". The 3 empty-filter titles show, and "Nada em aberto" too. A detail 500 shows the error card, and its retry loads. |
| E6j | Início | "Últimos lançamentos" | The 3 mobile rows link to `/extrato/{id}` of the 3 newest transactions; the link opens the detail, and Voltar returns to `/inicio`. |
| E7 | Not found (`$A/notfound.cjs`) | `/extrato/{999999, abc, 0, 1.5, -1, 007, 1e3, %20, 99999999999999999999, 9007199254740991}` | All show "Lançamento não encontrado" with "Voltar para o extrato". Only `999999` and `9007199254740991` send a request (API 404); the others send **none**. |
| E8 | Detail vs API (`$A/detail.cjs`) | All 74 transactions (69 seeded + 5 created: every field with 30% split; no optional field and no category; income with place/pix/notes; 0% split; fixed 1 cent) | **74/74 match `GET /transactions/{id}` field by field.** Checked for each: type, description, signed amount, Data in long form, Categoria (expenses only), Local, Forma de pagamento, Parcela, Observações, and for splits Amigo, Como dividiu, both shares (summing to the total), Status with date and the buttons only when open. "Não informado" is in `muted` (all 5 optional fields on the plain expense). Notes keep their line break. The 0% split shows "R$ 0,00". One `h1`. |
| E9 | Hide values (`$A/hide.cjs`) | `splitpay.hideValues=true`; regex for amounts over every text node and every `aria-label`/`title`/`alt` | **0 amounts exposed** on Extrato (Todos, Pagos), Início and 3 details, apart from user-typed notes such as "Thiago deixou R$ 70,00" (free text, not an amount field). Every row link name reads "Valor oculto". The confirmation text reads "pagou R$ ••••" with accessible name "Valor oculto", on the list and on the detail. (The toggle exists only on Início, from 008.) Layout side channel in n3. |
| E10 | Layout scan (`$A/scan.cjs`, `$A/scan/`) | 16 states × 360/390/768/1280 × light/dark = **128 full-page screenshots**: Todos, Em aberto with two confirmations open, a forced 500 with a long message, Pagos, Acertados, list error, empty, loading, detail with every field and the confirmation open, a plain detail, an income of R$ 10 bi, a R$ 10 bi detail with 120-char description/place, 500-char notes and a 60-char friend name, a 60-char single-word friend, not found, and Início. Data: R$ 10.000.000.000,00 expenses and income, A receber R$ 15 bi, Já recebido R$ 5 bi | **0 horizontal scroll, 0 overlapping text, 0 clipped text, 0 text under the tab bar** (same method as 010 E8). Descriptions, meta lines and "Parte de {first}:" end in an ellipsis as designed. A separate overflow probe (`$A/overflow.cjs`) found one amount pushed into the card padding (m1). |
| E11 | Keyboard sweep (`$A/kbd.cjs`, `$A/kbd2.cjs`) | Tab through Em aberto (idle and with a confirmation opened by keyboard), two details and Início, at 360/390/768/1280 × both themes, viewport 740 px on phones | **802 focus stops; every one has a 2 px ring and is at least 44 px.** At 360 and 390 in both themes, **42 stops are partly or fully under the tab bar** (M1). `scroll-padding-bottom` is `auto` on Extrato. 768 and 1280 are clean. |
| E12 | Contrast (`$A/contrast.cjs`) | Computed colors of the new styles, both themes | "Recebi" text on its fill: 6.49 (light) / 8.06 (dark). Share in `accent-text`: 5.02 / 10.61. "Não informado": 7.73 / 6.91. Confirmation text: 16.12 / 14.27. Success line: 7.13 / 10.17. All AA. The tinted button fill is 1.10 / 1.26 against the card (n4). |
| E13 | Reduced motion | `rg transition|animate|duration` in the 6 new or changed components | No animation added; `Chip` already has `motion-reduce:transition-none`. |
| E14 | Detail amount size (`$A/amount.cjs`) | Mocked detail at 320 and 360 | "+R$ 999.999,99" and "−R$ 999.999,99" use 28 px and take 222 of 254 px at 320. From R$ 1.000.000,00 the size drops to 20 px; R$ 10 bi takes 234 of 254 px. Never overflows (n2). |
| E15 | Prototype comparison | `scan/claro-390-*.png`, `escuro-390-todos.png` against `prototype-statement.png` | Header, side-by-side summary card, chips, row anatomy, pills, tinted Recebi, note and tab bar match. Intended differences: the subtitle and the row content follow the spec (all transactions, with the description first and the friend in the meta line) instead of the prototype's reimbursements-only list; spec Decisions explain this. From md: one centered 720 px column, with the actions at the right of open rows. |
| E16 | Servers and repo | Stop uvicorn and `vite preview`; curl both ports | Both ports refuse (`000`). `git status` was clean before this file was written. |

## 1. Spec Compliance

- [x] **AC1: Pass.** Title, subtitle, and both cards with the correct tokens and captions match the API (E6a).
- [x] **AC2: Pass.** Single select; the URL holds the choice with `replace`; Início, reload and back keep it; invalid values mean Todos; the chips scroll inside their row, and the page never scrolls sideways (E6b, E6c, E10).
- [x] **AC3: Pass.** Todos in API order; each chip shows exactly the split rows with that status; `TransactionRow` with avatar or icon, meta line and signed full amount; split line with pill, date and first name (E6b, E6d).
- [x] **AC4: Pass.** Two buttons and the inline confirmation with the exact copy; one PATCH; "Salvando..." with both disabled; in-place update, cards and `role="status"`; 409 message with a reload; other errors under the row with the buttons kept; the note text (E6e, E6f).
- [x] **AC5: Pass.** Every row on Extrato and Início opens the detail; back keeps the filter, with `/extrato` as the fallback; type, description and signed amount; the full field set with "Não informado"; the Divisão card with actions; not found for unknown and invalid ids; error card with retry (E6h, E6j, E7, E8).
- [x] **AC6: Pass.** Skeletons, error card, all four empty states; refetch on every visit (E6h, E6i).
- [x] **AC7: Pass.** Every amount, including link names and the confirmation, is masked (E9). Side channel in n3.
- [x] **AC8: Pass, with m1.** Mobile matches the prototype structure. From md, one 720 px column, with the actions at the right when they fit. 128 screenshots are clean (E10, E15). One amount runs into the card padding at 360 with R$ 10 bi data (m1).
- [ ] **AC9: Fails (M1).** Chips use `aria-pressed`; each row is one link named "description, amount, status", with the buttons outside it. Focus moves to Confirmar and back on Cancelar; 44 px targets, a visible ring on every stop, no motion added; copy scan empty (E3, E6d, E6g, E11, E13). **But keyboard focus lands under the tab bar on phones (M1)**, so focus is not visible at 360 and 390.
- [x] **AC10: Pass.** E1.

**Data Rules: Pass.** Integer cents throughout. Each row's share comes from the joined reimbursement and equals `amount − own_share` (E5, E6d, E8). One request pair per visit, with the filter on the client (E6b). A receber equals `summary.open_cents` (E6a). Days are formatted from the string (E5). Pago changes the balance by the share and acertado does not; there is no undo (E6e).

**Changes during T2: Accepted.** (1) The background reload after a 409 keeps the row and its message while still reloading the list, as AC4 asks (E6f). (2) A share settled under a chip stays until the chip changes: the spec says "the row updates in place", and changing the chip drops it (E6e). (3) `extra`/`actions` slots keep the buttons outside the link (E6d). (4) The `success` button variant meets AA text contrast (E12).

## 2. Security & Data Consistency

- [x] **Money.** No floats; sums are safe integers up to the R$ 15 bi test data (E2, E5).
- [x] **No backend change**; `pytest` 743 passed; parameterized SQL untouched; `checks.sql` does not apply (E4).
- [x] **Ids are validated before any request** (`/^[1-9]\d*$/` and safe integer), and paths use `encodeURIComponent` (E7). API messages render as text.
- [x] **No secrets or data files committed**; all writes went to scratch DBs (E4).

## 3. Structural & Stack Rules

- [x] **TypeScript.** Strict, no escapes; `Phase` is a discriminated union (E1, E2).
- [x] **Dependencies.** None added; no modal library, as decided.
- [x] **Files.** All in allowed folders; `statement.ts` is recorded in `repository-structure.md`; `context.md` states 011 (E4).
- [x] **Process.** Spec and plan were approved (`a44d795`) before the first code commit (`bb028ba`). Commit notes in n5.

## Findings

### Blocker

None.

### Major

- **M1. On phones, keyboard focus lands under the fixed tab bar on Extrato and on the detail.**
  - Below md, the tab bar (`AppLayout.tsx:84-86`, 61 px, `position: fixed`) covers the bottom of the viewport. The only `scroll-padding-bottom` rule (`frontend/src/styles/theme.css:163-167`) is scoped to `html:has([data-save-bar])`, so Extrato and the detail have `auto`. When Tab moves to a control just below the fold, the browser scrolls it only to the viewport edge.
  - Measured at 390 × 740 (`$A/kbd2.cjs`): the row link "Divisão fixa, −R$ 10,01, Aguardando reembolso" is fully covered (top 692 against the bar at 679, 48 px high). "Já acertamos" and "Recebi" are 24 and 41 of 44 px covered, and "Conta de luz" 43 of 48. Across the sweep, 42 stops at 360 and 390 in both themes, including Cancelar of an open confirmation on the detail (`/extrato/75`, 390). 768 and 1280 are clean.
  - Extrato is the first long list of actions on a phone, and the settle flow is keyboard-driven, so a keyboard user cannot see which row or button they are about to confirm. This fails AC9 ("visible focus"), the 008 layout rule "nothing under the tab bar" that AC8 applies, and WCAG 2.4.11. It is graded higher than 010 m1 because it happens in the default state, not only with an error banner.
  - **Fix:** in `theme.css`, give every screen below md the tab bar's padding and keep the save-bar rule as the more specific case. For example, inside the existing `@media (width < 48rem)` block, add `html { scroll-padding-bottom: calc(61px + 12px + env(safe-area-inset-bottom)); }` before the `html:has([data-save-bar])` rule. Update the comment and the design skill line ("Screens with a fixed bottom bar set `scroll-padding-bottom`"). Then rerun the keyboard sweep (`$A/kbd.cjs`) at 360/390 in both themes, and the 010 sweep to confirm the save-bar value (218 px) still wins on `/novo-gasto`.

### Minor

- **m1. In the detail's Divisão card, a 13-digit share runs 6 to 15 px into the card padding at 360 px.**
  - `TransactionDetailScreen.tsx:165` makes the label `shrink-0 max-w-[50%]`, and the `Money` value is `nowrap` (`.num`). With "Parte de Maximiliano" and R$ 9.999.999.999,99, the `dd` is 140 px wide but needs 146, so the amount ends 6 px past the content edge. With a 60-character single-word friend name ("Parte de WWWW...") it ends 15 px past it, 5 px from the card border (`$A/overflow.cjs`; visible in `scan/escuro-360-d-huge.png`). Nothing is clipped or overlapped, which is why the text scan in E10 stays clean, but the right edge no longer lines up with the other values. This is the R$ 10 bi case that AC8 names.
  - **Fix:** let the label give way instead of the amount. In `Field`, use `min-w-0 shrink` with `break-words` on `dt`, and `shrink-0` on `dd` when it holds a `Money`; or use `stacked` for the two share rows when the label is long. Recheck `d-huge` and `d-w-open` at 360.

### Informational

- **n1. Início "Gastos por categoria" truncates the name to "Sem c..." with absurd amounts** (designer flag, outside the 011 files: `CategorySummaryCard.tsx`, 009). With R$ 10.000.000.015,00 in one category at 360 px, the amount and "100%" leave the name about 40 px (`$A/inicio-360.png`). It only appears with values in the billions; seeded and realistic values fit, and the category opens in Gastos do mês with its full name. Optional, for 009 or 012: use the `TransactionRow` wrap pattern (`flex-wrap` with the name at `flex-[1_1_8rem]`, so the amount drops under it) instead of truncating below a minimum width.
- **n2. The detail amount size uses a character count** (`TransactionDetailScreen.tsx:21-22`, `:135`; designer flag). Measured: amounts up to 15 characters use 28 px and take at most 222 of 254 px even at 320; longer ones use 20 px, and R$ 10 bi takes 234 of 254 px (E14). Digits are tabular, so character count is a sound proxy for width, and the threshold is conservative: R$ 1.000.000,00 would also fit at 28 px. No change needed. If it is ever revisited, CSS `clamp()` with container query units would size by the real width without the constant.
- **n3. With hide values on, the summary layout still depends on the real amounts.** `StatementSummary.tsx:34` computes `long` from `formatBRL` lengths, so with values of 14 or more characters (R$ 100.000,00 and up) the two halves stack below md even while both read "R$ ••••". A viewer can then tell that a total is at least R$ 100 mil. This is irrelevant for the demo; optional fix: read `useHideValues()` and force `long = false` while hidden.
- **n4. The tinted "Recebi" and outlined "Já acertamos" buttons have low boundary contrast** (fill 1.10/1.26, border 2.11/1.07 against the card). Their text labels (6.49/8.06) identify them, so WCAG 1.4.11 does not apply, and `ghost` predates 011. No action needed.
- **n5. Plan and commits.** No seeded expense has every optional field, so the plan's "seeded expense with every field" was checked on data created in the scratch DB (E8). `9022c7e` is `style(web)` for visual changes and also touches `tasks.md` and a `QuickActions.tsx` comment that the plan does not list (same as 009 n5 and 010 n6).
- **n6. Every closed row keeps an empty `role="status"` region** inside an `sr-only` wrapper (`SettleActions.tsx:117-124`, `:185`), so the list has about 17 empty live regions. This is harmless (an empty region announces nothing), and it is the price of announcing the success line. No action needed.

## Verdict

**FAIL (CHANGES REQUIRED): 1 major (M1) and 1 minor (m1) open.** No blocker.

Everything else holds under my own runs:
- 45,563 logic assertions in 3 time zones;
- 120 runtime checks against the seeded API: summary equal to the API, chips equal to `/reimbursements?status=`, exactly 1 PATCH, balance +share for Recebi and unchanged for Já acertamos, a real 409 and a forced 500, focus management, back with the filter kept;
- 74/74 details equal to `GET /transactions/{id}`;
- not-found handling without needless requests;
- hide values with 0 exposed amounts;
- 128 layout screenshots with no overlap, clipping or horizontal scroll;
- AA contrast for the new styles;
- empty copy scan, no backend or dependency change (743 passed).

M1 is a one-rule CSS fix with a clear check. T5 stays unchecked until M1 and m1 are fixed and verified: the keyboard sweep at 360/390 in both themes with 0 focus stops under the tab bar, the 010 save-bar sweep unchanged, and the `d-huge`/`d-w-open` details at 360 with the amount inside the padding. The informational notes are optional.
