# 009 Home — Audit Report

Auditor: `auditor` agent | Date: 2026-10-22 (UTC; 2026-10-21 evening in Brasília) | Branch: `feature/mvp-plan` | Commits audited: `4833d96^..81a28eb` (`4833d96` spec draft, `7ac1f15` approval, `cb7f52b` helpers, `b669018` docs, `bc5ec0a` screens, `81a28eb` polish). The `backend/` diff is empty.

Runtime: Node 22.22.0, Chromium 1194 through Playwright 1.56.1, Python `.venv` from `backend/`. API on `:8000` (`FRONTEND_ORIGIN=http://localhost:4173`, scratch DB), `vite preview` on `:4173` after `npm run build`. Login by setting `localStorage["splitpay.name"]`. Scratch directory: `/tmp/claude-0/-home-claude-splitpay-fintech/03833dd2-2eab-509b-b278-e168f70beef2/scratchpad/audit009/` (written `$A` below). All scripts and screenshots stay there, never in the repo.

## Evidence Gathered

| # | Check | Command / method | Result |
| --- | --- | --- | --- |
| E1 | Strict build | `cd frontend && npm run build` (`strict`, `noUncheckedIndexedAccess`, `noUnused*`) | **Passes**, 1963 modules, no TS errors. |
| E2 | Static greps | `rg` over `frontend/src` | No `any`, `as unknown as`, `@ts-*` or `eslint-disable`. The only casts are the trusted `body as T` and `json() as unknown` in `services/api.ts`, which come from 008. Hex appears only in `theme.css` and `BrandMark.tsx`, and the only `rgba(` uses come from 008 (`Button.tsx:19`, `LoginScreen.tsx:128`). No `toFixed`, `parseFloat` or `Math.round`. The only `* 100` uses: `charts.ts:22-27`, which is integer math, and `FriendShares.tsx:52`, which computes a bar width in %, not an amount. The only `fetch(` is `services/api.ts:116`. The only `new Date` is `BalanceHeader.tsx:27`, read through UTC getters in `brasiliaHour`. No `getDate`, `getMonth`, `getFullYear`, `getHours`, `toLocale*Date` or `Intl.DateTimeFormat`. |
| E3 | Helper self-checks | `$A/helpers-check.ts` with `node --experimental-strip-types`, run under `TZ` = UTC, America/Sao_Paulo, Asia/Tokyo, Pacific/Kiritimati (UTC+14), Pacific/Pago_Pago (UTC−11), America/Los_Angeles | **202,905 assertions per TZ, 0 failures in all 6.** `formatShortDate` matches UTC date math for every day from 2023 to 2028. `monthName` and the month labels are correct for all 12 months ("Março de 2026"). Every Monday week from 2019-12-30 to 2030 is checked: inside a month "19 a 25 de out", across months "29 de set a 5 de out", across years "29 de dez de 2025 a 4 de jan de 2026". Leap day passes, and 14 malformed dates (`2026-02-29`, `2026-04-31`, `2026/10/20`, full-width digits, trailing `\n`) all throw `RangeError`, as do bad months and an end before the start. The greeting is checked from UTC instants at 4:59, 5:00, 11:59, 12:00, 17:59, 18:00, 0:00, 23:59 and 2:00 Brasília, on 22 Oct and on 1 Jan, plus all 24 hours. `sharePercents` passes 200,000 random lists (0 to 12 entries, totals up to 10¹¹): each list sums to 100, gives integers only, gives 0 to zero totals and stays within +1 of the floor. Ties go by list order (`[1,1,1]`→`[34,33,33]`, `[199,1]`→`[100,0]`, `[995,5]`→`[100,0]`); I first expected the reverse, but this is what the spec says. `[996,4]` gives `"<1%"`. Bad inputs (1.5, −1, NaN, ∞, 2⁵³) and an overflowing sum throw. 300,000 adversarial pairs near `MAX_SAFE_INTEGER/100` also give 0 failures. `categoryColor` matches `backend/sql/seed.sql:27-35` id by id; `null` and unknown ids map to `chart-other`. |
| E4 | Chart palette | The dataviz skill's `validate_palette.js`, run on the shipped 7 hues in each theme | **Adjacent pairs: all checks pass in both themes.** In light, `chart-1` 2.17, `chart-6` 2.69 and `chart-3` 2.82 are below 3:1 against white (WARN, see n1). All-pairs mode, which matters because slices are ordered by amount: `chart-2`/`chart-5` ΔE 10.5 (this pair already existed in 008), and `chart-other` against `chart-6` under protan ΔE 2.6 (n2). |
| E5 | Início, AC1 to AC7 (`$A/home.cjs`, `$A/states.cjs`) | Every value compared to the live `/balance`, `/budget`, `/reimbursements/summary`, `/dashboard/charts?period=month` and `/transactions` responses | **161 checks, 0 real failures.** 2 diffs came from my own expectations: the avatar initials ("AL") belong to the row text and are `aria-hidden`. Details: header full-bleed, amber, initials "VA", greeting, `R$ 7.063,97`, eye button. Quick-action hrefs are exact, hidden from 768. Budget: "Orçamento de outubro", `R$ 2.556,42 de R$ 3.000,00`, "85% usado", "Restam R$ 443,58", bar 85%. Mocked over budget: "116% usado", "Passou R$ 500,00" in `rgb(185,28,28)`, bar 100% wide in danger and exactly as wide as the track. At exactly 100%: "Restam R$ 0,00". Receivable: 4, 1 and 0 give "4 reembolsos", "1 reembolso" and "Nenhum reembolso em aberto". Categories at 390: 7 bar segments with flex set by cents, 3 rows with the expected percentages and "Ver tudo". At 768: title "… em outubro", "Ver detalhes", 7 legend rows in column-major order (4+3), 7 slices, `aria-hidden` SVG, center total. Empty: "Nenhum gasto neste mês". Latest: 3 rows at 390 and 4 at 768, meta lines, `−R$` amounts. Pills appear only from md. Income shows `+R$ 10.000,00` in `rgb(21,128,61)` with the arrow-down-to-line icon; expenses use the wallet; "Sem categoria"; a long description ends in an ellipsis. Empty list: "Nenhum lançamento ainda" plus "Novo gasto" → `/novo-gasto`. **1280×800:** two columns (380 px and the rest), every card ends at or above y = 688, `scrollHeight` = 800. |
| E6 | Greeting from UTC instants in the browser | `page.clock.setFixedTime` × 7 instants × `timezoneId` Sao_Paulo, Tokyo, Kiritimati, Los_Angeles, UTC | **35/35 correct**, so the browser time zone has no effect. |
| E7 | Per-card loading, error and retry on Início | Each of the 5 endpoints fails alone, as HTTP 500 and as connection refused; then all fail at once; then every response is held back | For each failure: **exactly one `role="alert"`** with that card's title, the other four cards still render, and "Tentar novamente" brings the card back (10/10). With everything failing: 5 error cards, no horizontal scroll at 360. With responses held back, the skeleton boxes sit within 2 px of the loaded boxes (y and height), so there is no layout shift. |
| E8 | Gastos do mês, AC8 to AC11 (`$A/spending.cjs`) | All 7 categories of the current month, September, the current week, week −3 (crosses months), the current year and June (no friends): legend, slices, center total, note; then every row expanded one by one; then the friends | **269 checks, 0 real failures.** 14 diffs came from my exact-match test of bar widths: the browser serializes `13.6142%` with 6 significant digits, and the value is correct. Percentages match my own largest-remainder calculation, and "Outros" shows "<1%" in the year view. **Every item list sums to its category total**, newest first. `aria-expanded` toggles and `aria-controls` points to an existing `ul` that is `hidden` while collapsed. Friend rows match `by_person`, and bars scale to the largest. Notes read "em outubro", "em setembro de 2026", "na semana de 19 a 25 de out", "em 2026". Labels: "Outubro de 2026", "19 a 25 de out", "28 de set a 4 de out", "2026", and at offset −42 "29 de dez de 2025 a 4 de jan de 2026" (wraps to two lines at 360 and fits). |
| E9 | URL state | `history.length` and the URL after each action, then 14 hand-written query strings | An offset step **replaces** the entry (length unchanged); a period change **pushes** it and resets offset to 0. Back from Anual returns to `semanal&offset=-3`. Reload keeps the label and the selected radio. Invalid values: `periodo=foo` (also with an offset), `MENSAL`, `periodo=`, `offset=5`, `abc` and `+1` → `?periodo=mensal&offset=0`. `-600` and `-99999999999999999999` → `-520`, and "Mês anterior" is disabled there. `-1.5` → 0 within the given period (n3). `-0` → 0. Unknown extra params are kept. Every rewrite uses `replace`, and exactly one charts request goes out per URL (never one for the invalid value). Opening Gastos with no query keeps the URL clean. |
| E10 | Empty period, errors | Offset −9 (January 2026, seeded empty); mocked 500 | "Nenhum dado encontrado" plus "Não há despesas suas neste período.", with icon, in one card of min-height 340 px. That is inside the range of the loaded cards (126 to 644 px across the seeded periods). On error the label is empty, the navigator still works, and retry recovers. |
| E11 | Hide values (AC13, `$A/hide.cjs`) | Toggle on Início, then visit `/inicio`, Gastos (month, year, week) with **every category expanded**, at 390 and 1280 | **0 amounts visible** (regex `R\$ [\d.]+,\d\d` over `main`), up to 65 masks per screen. Percentages, bars and slices stay. The eye switches to "Mostrar valores". |
| E12 | Data freshness (AC12, `$A/fresh.cjs`) | On Gastos do mês, `POST /transactions` an income of R$ 1.234,56 and a Saúde expense of R$ 43,21, then tap back (SPA navigation) | Balance, budget (`spent` +4.321, new %), and the latest rows ("Farmácia auditoria, Saúde" `−R$ 43,21` first, then "Freela auditoria, Receita" `+R$ 1.234,56` in green) all update. Reopening Gastos shows the new Saúde total and overall total. The API was then restarted on a fresh DB for the scans. |
| E13 | Layout scan (AC14, `$A/scan.cjs`, `$A/scan/`) | **112 full-page screenshots**: 14 states × 360/390/768/1280 × light/dark. The states cover Início loaded, loading, all-error, empty with over budget, and amounts of R$ 9.999.999.999,99; Gastos month, year with all rows open, week −3 with rows open, empty, no friends, error, loading, long values with rows open, and hidden values with rows open | **Method.** I take the box of every visible text node (`Range.getClientRects`) and clip it to its nearest overflow ancestor, so ellipsis truncation is not counted as overflow. Overlap means two boxes from different elements intersecting by >1×2 px. Under the tab bar means a text box or control intersecting the fixed nav at maximum scroll, measured in the viewport, not from the full-page image (which paints the fixed bar mid-page). Horizontal scroll means `scrollWidth > clientWidth`. Donut: the width of the center text is compared with the hole (ring size − 2 × stroke). **Results:** 0 overlaps, 0 content under the tab bar, 0 clipped text in every Início state at every width. **Horizontal scroll on Gastos do mês at 360 and 390 in both themes as soon as a category is expanded** (M1). **The Início donut total runs over the ring from R$ 1.000.000.000,00** (m1). The Gastos donut fits up to R$ 89.999.999.999,55 (133/142 px). |
| E14 | Prototype comparison | Viewed `claro-390-inicio`, `escuro-390-inicio`, `claro-1280-inicio`, `claro-390-gastos-mes`, `escuro-390-gastos-vazio`, `claro-1280-inicio-error`, `claro-390-inicio-loading`, `$A/spend-1280-mes-1.png`, `$A/spend-390-anual-expanded-hscroll.png` and `$A/spend-360-mensal-alimentacao.png` against the four `prototype-*.png` | Início mobile, desktop and dark match the prototypes in structure, spacing and copy. The differences are seed data (Compras as a 7th category in plum, newer dates) and the full name in the greeting. Gastos do mês matches `prototype-monthly-spending.png`. **The prototype's own state, Alimentação expanded at 360, cuts the card's right edge and the chevrons** (`$A/spend-360-mensal-alimentacao.png`). |
| E15 | Accessibility (`$A/a11y.cjs`) | Tab through Início, Gastos (one row expanded) and a past week, at 390 and 1280, in both themes (12 runs) | **Every stop shows a 2 px solid ring**: light `#b45309` (dark ink on amber), dark `#fbbf24`. **No target under 44 px** (the smallest is "Ver tudo", 66×44). Enter and Space toggle a row. Arrow keys move the period radios and push the URL. Every SVG in `main` is `aria-hidden`, and so are the friend bars. The accessibility tree reads balance, budget, receivable, the 3 category rows and the transactions as text. Reduced motion: no animation while loading and no transition on either screen (without it, the chevron rotates over 0.2 s). |
| E16 | Contrast (`$A/contrast.cjs`) | Every visible text node on 8 screen states × 2 widths × 2 themes, with the background built by stacking ancestors (alpha included) and colors converted through canvas | **1,048 text nodes per theme, 0 below AA.** Light: 13 color pairs, lowest `accent-text` and `success` on white at 5.02, "Saldo disponível" (`on-accent/72` on amber) 5.88. Dark: 17 pairs, lowest `muted` on `neutral-soft` 5.81. Non-text (n1): light budget and friend bars `accent`/`track` 1.32, track/surface 1.27; dark track/surface 1.19. |
| E17 | Copy | `rg "[—–·→…]" frontend/src`; I read every new pt-BR string | **Empty.** Strings are natural and professional. Singular, plural and zero are right for reimbursements. The week phrases read well ("na semana de 28 de set a 4 de out"). |
| E18 | Scope, dependencies, backend, tracked files | `git diff 4833d96..HEAD --stat -- backend`, `-- frontend/package*.json`; `.venv/bin/pytest -q`; `git ls-files` | Backend diff **empty**. No dependency change. **743 passed.** No `.env`, `*.db`, `node_modules` or `dist` tracked. Nothing from `goal.md`'s Out of Scope list: splits shown are 1-to-1 only; no auth, no budget editing, no row tap, no GSAP. |
| E19 | Structure | Every new file against `repository-structure.md` | `lib/dates.ts`, `lib/charts.ts` and `lib/useResource.ts` are listed in `repository-structure.md:93`. The 13 components sit in `app/components/`, an allowed folder. **`CardHeader.tsx` and the `AppLayout.tsx` change** (Início full-bleed below md; Início tab highlighted on Gastos do mês, styling only, `aria-current` unchanged) are in allowed places but are **missing from the plan's file list** (m2). |
| E20 | Servers | `kill` uvicorn and `vite preview`; then curl both ports | Both down. `git status` showed a clean tree before this file was written. |

## 1. Spec Compliance

- [x] **AC1: Pass.** E5, E6. Brasília hour from UTC fields, independent of the device time zone.
- [x] **AC2: Pass.** Hrefs exact, below md only (E5).
- [x] **AC3: Pass.** Normal, over-budget (danger text and bar, capped at 100%) and exactly 100% are all correct; the card links to `/gastos-do-mes` (E5).
- [x] **AC4: Pass.** Singular, plural and zero (E5).
- [x] **AC5: Pass.** Mobile bar plus 3 rows plus "Ver tudo"; from md a donut, centered total, two-column legend and "Ver detalhes"; empty state (E5). The Início donut total overflows from R$ 1 bilhão (m1).
- [x] **AC6: Pass.** 3 rows, then 4 from md; icons, avatar, meta line, signed amounts, income in success, pills from md, "Ver extrato", empty state (E5, E12).
- [x] **AC7: Pass.** Two columns; everything fits 1280×800 with no scroll (E5, E14).
- [x] **AC8: Pass.** Back button, segmented control, navigator labels, both disabled limits; URL push and replace, reload and back; invalid values fall back (E8, E9). Edge reading in n3.
- [x] **AC9: Pass.** Donut, note, legend percentages, expandable rows with `aria-expanded` and items that sum to the totals, zero slices hidden, a single category draws a full ring with no dash (E8, mock with `0` totals).
- [x] **AC10: Pass.** Note, rows, bars scaled to the largest; zero friends hidden; a month with no friends shows "Nenhuma despesa dividida neste período." (E8).
- [x] **AC11: Pass.** One card with icon and US04 wording, 340 px, inside the range of the loaded cards (E10).
- [x] **AC12: Pass.** Each card fails and retries on its own; data is fetched again on every open (E7, E12).
- [x] **AC13: Pass.** E11.
- [ ] **AC14: Fail (M1).** Horizontal scroll on Gastos do mês at 360 and 390 after expanding a category, with seeded data, on the default view. Targets, focus, reduced motion, copy and `aria-hidden` charts pass (E13, E15, E17). The donut overlap at R$ 1 bilhão or more is m1.
- [x] **AC15: Pass.** E1.

**Data Rules: Pass.**
- Money: amounts only through `Money` and `formatBRL`, and percentages are integer largest remainder (E3).
- Colors: fixed by seeded id (E3).
- Dates: parsed from the string, and the greeting from UTC (E3, E6).
- Rows show the full amount paid, while charts and budget use the user's own share (E5, E8).

## 2. Security & Data Consistency

- [x] **Money.** Only integers reach `formatBRL`. The two float divisions are geometry: donut arc length and bar width (E2).
- [x] **No backend change**; `pytest` 743 passed; `checks.sql` does not apply (E18).
- [x] **No secrets or data files committed** (E18). Mutations in this audit only touched a scratch DB.
- [x] **Errors.** API messages render as text. Network errors get the fixed pt-BR message from 008 (E7).

## 3. Structural & Stack Rules

- [x] **TypeScript.** Strict, no escapes (E1, E2). `Resource<T>` is a discriminated union, so `data` is only readable when `status === "ready"`.
- [x] **Dependencies.** None added. Donut and bars are hand-drawn, as the spec decided.
- [ ] **Files and docs.** The plan's file list omits `CardHeader.tsx` and the `AppLayout.tsx` change, and `context.md` still says screen contents "come in 009-012" (m2).
- [x] **Process.** Spec and plan were approved (`7ac1f15`, Vinicius, "continue", 2026-10-22) before the first code commit (`cb7f52b`). The commits are conventional and scoped. One type is debatable (n5).

## Findings

### Blocker

None.

### Major

- **M1. Expanding a category on Gastos do mês makes the page scroll sideways on phones.**
  - `frontend/src/app/components/SpendingScreen.tsx:133` (and the skeleton grid at `:112`) is `grid items-start gap-3 md:gap-4 lg:grid-cols-2`. Below `lg` it has no column template, so its single implicit track is sized by the cards' min-content width. An open item row (`CategoryBreakdown.tsx`, `<span className="min-w-0 flex-1 truncate">` with `white-space: nowrap`) adds the full description to that min-content width. The card grows past the screen instead of truncating.
  - Seeded data, default view, 360 px: opening **Alimentação** (the state drawn in `prototype-monthly-spending.png`) gives `scrollWidth` 392. The card's right edge, the amounts and the chevrons are cut off (`$A/spend-360-mensal-alimentacao.png`).
  - In the year view: "Viagem para Paraty - hospedagem" gives 438 px, and the browser scrolls the page 32 px sideways after the click (`$A/spend-390-anual-expanded-hscroll.png`).
  - Reproduced at 360 and 390 in both themes, in 7 period/category combinations. At 768 and 1280 it does not happen: the column is wide enough, and `lg:grid-cols-2` is already `minmax(0,1fr)`.
  - This breaks AC14 ("no horizontal scroll at 360, 390") on the main US04 interaction.
  - **Fix:** add `grid-cols-1` (Tailwind 4: `repeat(1, minmax(0, 1fr))`) to both grids at `SpendingScreen.tsx:112` and `:133`, or give each card `min-w-0`. Verified by injecting `grid-template-columns: minmax(0,1fr)` into the running build: `scrollWidth` stays 360 with every row open, in the month and year views, and the long items end in an ellipsis (`$A/spend-360-anual-expanded-fixprobe.png`). After the fix, rerun the layout scan with rows expanded at 360/390.

### Minor

- **m1. The Início donut total runs over the ring from R$ 1.000.000.000,00 (md and up).**
  - `frontend/src/app/components/DonutChart.tsx:83-90` drops to `text-xs` at most. The Início ring (`CategorySummaryCard.tsx:116-117`, 168 px with stroke 22) has a 124 px hole. "R$ 1.000.000.000,00" measures 125 px and "R$ 89.999.999.999,55" 133 px, so the text runs into the slices (`$A/donut-crop-1280-long.png`). It stays readable.
  - The month's total is the user's own share for the month. On the public demo, one visitor who saves a single expense of R$ 1 bilhão or more (the API accepts up to R$ 10 bilhões per entry) triggers it for everyone. That is unlikely but reachable, and the plan's long-value risk targets R$ 10 bilhões. The Gastos ring (142 px hole) is fine.
  - **Fix:** in `amountClass`, for `size === "md"` and a length above 18, use `text-[11px]` (about 122 px for 20 characters). Or give the Início ring a thinner stroke (`strokeWidth={16}` gives a 136 px hole). Then check "R$ 89.999.999.999,55" at 768 and 1280.
- **m2. Plan and context lag behind the code.**
  - `docs/specs/009-home/plan.md:17-21` and the T2 file list in `tasks.md` do not name `CardHeader.tsx` (a new shared component: card title, link and `linkCardClasses`). They also omit the `AppLayout.tsx` change: the Início full-bleed gutter, and `useSectionTab` highlighting Início on `/gastos-do-mes`.
  - `docs/context.md:13` still says "Screen contents come in 009-012". The presentation reads this file. 008's audit raised the same kind of lag (m5, m6).
  - **Fix:** add the two files to the plan's list with one line each, giving the reason (shared card header; full-bleed amber header below md and the section highlight). In Current State, record that 009 delivered Início and Gastos do mês.

### Informational

- **n1. Light-theme chart marks and bar fills are below 3:1. This is acceptable under WCAG 1.4.11.**
  - Slices against white: `chart-1` 2.17, `chart-6` 2.69, `chart-3` 2.82. Bar fill against track 1.32 (budget, friends), track against surface 1.27.
  - 1.4.11 asks 3:1 only for graphics *required to understand* the content. Every number a slice or bar encodes is also in text next to it: legend name, percent and amount; "85% usado"; each friend's amount. The charts are `aria-hidden`, and hide values keeps the percentages. Dark passes 3:1 everywhere.
  - One partial gap: the mobile Início stacked bar shows all categories but labels only the top 3, so the other 4 segments are color only. They are a preview, and "Ver tudo" opens the full legend. Accepted as is.
  - If a stronger reading is wanted later, outline light slices with a 1 px `surface` stroke and darken `track` for meters.
- **n2. Colorblind separation is checked for adjacent pairs only.** Slices are ordered by amount, so any two categories can sit side by side. In light, `chart-other` against `chart-6` (Outros against Saúde) is ΔE 2.6 under protan. `chart-2` against `chart-5` is ΔE 10.5 with normal vision, a pair that already existed in 008. The 2 px gaps and the legend in the same order as the slices make up for it. Note it in the design skill.
- **n3. An invalid offset with a valid period goes to the current period of that type, not to the current month.** For example, `?periodo=anual&offset=abc` shows the current year (`SpendingScreen.tsx:43-46`). This is the sensible reading of AC8 ("invalid values fall back to the current month"), but the spec says it more narrowly. Reword the spec to "invalid values fall back to the current period (the current month when `periodo` is invalid)", or keep as is.
- **n4. The design skill contradicts itself on amber.** `.claude/skills/splitpay-design-language/SKILL.md:43` says "Never amber shades for categories" and in the same line maps Moradia to `chart-1` (`#eda100`, an amber next to the `#fbbf24` brand fill). The palette comes from 008. Reword the rule ("never the brand `accent` or status hues") so later specs do not "fix" Moradia.
- **n5. `81a28eb` uses `style(web)` for visual changes.** In Conventional Commits, `style` means code formatting with no behavior change. This commit changes rendering (chevron rotation, spacing, nav highlight, donut sizes), and it also ticks T1–T5 in `tasks.md`. Prefer `fix(web)` or `feat(web)`, and a separate `docs` commit for task check-marks.
- **n6. Stress values truncate category names to one letter** in the Início desktop legend ("M…" beside "R$ 9.999.999.999,99"). This only happens with amounts near R$ 10 bilhões; no change needed for the demo.

## Verdict

**CHANGES REQUIRED (FAIL)**: one major finding.

Most of the feature holds up under my own runs:
- 202,905 helper assertions pass under 6 time zones.
- Every Início and Gastos value equals the API, including the over-budget, singular, plural, zero, income and empty cases.
- Each card fails and retries on its own.
- URL push and replace, clamping, invalid values, back and reload all behave.
- Expanded items sum to their totals.
- Hide values masks every amount.
- New transactions show up on the next open.
- 1280×800 fits with no scroll.
- Focus, 44 px targets, reduced motion and every text contrast pair pass in both themes.
- The copy scan is empty.
- No dependency was added, the backend is untouched (743 passed), and nothing out of scope was found.

The failure is AC14: on phones, expanding a category on Gastos do mês, which is the core US04 interaction and the prototype's own state, widens the card past the screen and scrolls the page sideways (M1). The fix is one class on two grids, already proven by injection. Fix M1, m1 and m2, then re-audit. The re-audit needs the 360/390 scan with rows expanded and a check of the Início donut at R$ 1 bilhão or more.

## Re-audit (fix verification)

Auditor: `auditor` agent | Date: 2026-10-22 | Commits checked: `36ecfa1` (docs: m2, n3, n4; it also put this file under version control) and `7c62645` (code: M1, m1, and `sharePercents` in BigInt). I checked each fix at `HEAD` (`7c62645`) with my own runs, not from the commit messages. Same scratch directory; new scripts and captures are in `$A/re/`, and the new full scan is in `$A/scan2/`.

### Evidence

| # | Check | Result |
| --- | --- | --- |
| R1 | Build, greps, copy scan | `npm run build` **passes** (1963 modules). Still no `any`, `@ts-*`, `toFixed`, `parseFloat` or `Math.round`, and the only cast is the 008 API boundary one. `rg "[—–·→…]" frontend/src` is **empty**. Diff since `81a28eb`: 4 frontend files and 6 docs files. No new file, no dependency change, backend diff empty. |
| R2 | M1: every expanded row at phone widths (`$A/re/expand.cjs`) | 360 and 390 px × light and dark. Periods: year 0 and −1, months 0 to −11 (except the empty −9), weeks 0 to −29. Each category is opened alone, then all at once: **512 states, 0 problems.** Every state has `scrollWidth` equal to the viewport, `scrollX` 0, the card at 16 px from each edge and every item inside it. 82 item labels are truncated with an ellipsis instead. Captures: `$A/re/spend-360-claro-anual-all-open.png` and the dark and 390 versions. `HomeScreen.tsx:15` got the same `grid-cols-1`, and every Início check still passes (R6). |
| R3 | m1: donut center from R$ 2.556,42 to `MAX_SAFE_INTEGER` cents (`$A/re/donut.cjs`) | 13 totals × Gastos at 360/390/768/1280 and Início at 768/1280: **78 renders, 0 overflows.** I measured the distance from the center to every corner of the amount box and of the "Total" label. The smallest margin inside the hole is **6.5 px**, and nothing wraps or scrolls. Início: "R$ 1.000.000.000,00" 104 px at 10 px in a 124 px hole; "R$ 90.071.992.547.409,91" 106 px at 8 px. Gastos: 119 px at 9 px in a 142 px hole. Captures: `$A/re/donut-*-10bi.png` and `-max.png`, readable on screen. |
| R4 | `sharePercents` (BigInt) (`$A/re/bigpct-check.ts`) | **Small lists:** identical to the previous implementation (`git show 81a28eb:…/charts.ts`) on **300,000 random lists** and on the tie cases. **Huge totals:** 200,000 lists mixing 0, small values, `MAX_SAFE_INTEGER`, 2⁵², 9×10¹³ to 10¹⁵ and random safe integers. Each result is identical to my own BigInt reference, which picks the leftover points by explicit selection instead of a sort. 3 × MAX gives `[34,33,33]`; MAX with 1 gives `[100,0]`; 1,000 × MAX (sum about 9×10¹⁸) gives 100 ones then zeros. Unsafe or non-integer inputs still throw. **500,015 assertions, 0 failures.** The original helper suite (E3), with its overflow case changed to "exact", still passes 202,905 per TZ in 4 TZs. |
| R5 | Full layout scan (`$A/scan2.cjs`) | Same method and same 14 states × 4 widths × 2 themes as E13. That includes Gastos with all rows open in year, week −3, long values and hidden values. **112 screenshots, 0 issues:** no horizontal scroll, clipped text, overlap, content under the tab bar or donut overflow. |
| R6 | Regression of E5 to E16 | `home` 33, `states` 128, `spending` 269, `hide` 18, `fresh` 9, `a11y` 33, all passing. The only diffs left are the known test-expectation ones: avatar initials in the row text, and bar widths serialized to 6 digits. Contrast: 1,048 text nodes per theme, **0 below AA**, lowest pairs unchanged. |
| R7 | Docs (`36ecfa1`) | The plan lists `CardHeader.tsx` and the `AppLayout.tsx` change with their reasons. T2 names both. `context.md:13` records what 009 delivered. Spec AC8 now says "an invalid period falls back to Mensal and an invalid offset to the current period of the chosen type", which matches E9. `SKILL.md:43` names Moradia/`chart-1` as the single amber-like category. |
| R8 | Backend, tracked files, servers | `pytest`: **743 passed**. No `.env`, `*.db`, `node_modules` or `dist` tracked. uvicorn and `vite preview` stopped; ports 8000 and 4173 do not answer. `git status` was clean before this section was appended. |

### Status of each finding

- **M1: Closed** (R2, R5).
- **m1: Closed** (R3).
- **m2: Closed** (R7).
- **n3, n4: Closed** (R7).
- **n1, n2, n5, n6:** unchanged and accepted as informational.
- **Missed in the first audit:** my E3 treated the `sharePercents` throw on a sum above about 9×10¹³ cents as correct. In the app that throw is fatal (see n8). About 90 entries of R$ 10 bilhões reach it on the shared demo. The BigInt change fixes it, and R4 confirms the result is exact.

### New findings

- **m3. An expanded item's date disappears when the description is long.** Minor.
  - `frontend/src/app/components/CategoryBreakdown.tsx:90-92` puts the description and the date in one truncated span. Since M1's fix the row truncates instead of widening the page, so the ellipsis eats the date first.
  - Seeded data, current month, with every row open: at 360 px 3 of 13 items lose their date ("Janta no restaurante japo…", "Mercado da semana, 20 …"); at 390 px 1 of 13. The year view loses 9 of 49 at 360. At 768 px none are cut (R2).
  - AC9 asks for "description, short date and own share" on each item, and `prototype-monthly-spending.png` shows "Janta no restaurante japonês, 20 out" whole at 390.
  - **Fix:** split the span so only the description shrinks: `<span className="min-w-0 truncate">{item.description}</span><span className="shrink-0">, {formatShortDate(item.occurred_on)}</span>`, inside a `min-w-0 flex-1 flex` wrapper. Optionally drop `pr-7` to 0 on these rows. The chevron column has no content in item rows, and the prototype aligns item amounts with the category amounts.
- **n7. The donut amount goes below the 12 px type floor for extreme totals.** `DonutChart.tsx:86-104`:
  - Início, md and up: 11 px from R$ 100 milhões, 10 px from R$ 1 bilhão, down to 8 px.
  - Gastos, also on phones: 11 px from R$ 10 bilhões, down to 9 px.
  - `SKILL.md:77` says "never go below 12 px" on mobile. On phones this only happens at R$ 10 bilhões or more, and the alternative is overflow, so I accept it.
  - The Início steps are stricter than needed: at 12 px, "R$ 999.999.999,99" measured 114 px in the 124 px hole. If wanted, keep 12 px through 17 characters.
- **n8. A total above `MAX_SAFE_INTEGER` cents (R$ 90 trilhões) still crashes the screen.**
  - The JSON number arrives inexact. `sharePercents` (`charts.ts:18`), and `formatBRL` (`money.ts:19`) for any amount, throw during render. React Router then replaces the whole layout with its default English page "Unexpected Application Error!".
  - Verified on Início and Gastos at 390 and 1280 with a mocked `total_cents: 9007199254740993`.
  - Reaching it needs about 9,008 entries of R$ 10 bilhões in one period, so it takes deliberate scripted abuse, and the DB resets on restart. The same class of crash applies to `balance_cents` from 008. Out of 009's scope.
  - **Suggested for 010+:** add an `errorElement` with a pt-BR message on the layout route, or a per-card error boundary that reuses `ErrorState`. A backend cap on period or balance totals would also close it.

### Re-audit verdict

**PASS, with 1 minor open (m3).** All 15 acceptance criteria and the Data Rules hold at `HEAD` (`7c62645`):
- the phone layout no longer scrolls sideways in any of 512 expanded states or the 112-screenshot scan;
- the donut total fits both rings up to `MAX_SAFE_INTEGER` cents;
- percentages are exact for any safe totals and identical to the previous code on ordinary lists;
- build, contrast, focus, targets, reduced motion, copy, tracked files and the 743 backend tests are all clean.

m3 hides part of the AC9 content (the item date) at phone widths. It is a one-span change. Fix it before 009 merges into `dev`, then run a closing check: the R2 script plus a count of items whose date is cut. Per the coordinator's rule (PASS with no open minors), **T6 stays unchecked** until m3 is closed. n7 and n8 are informational.
