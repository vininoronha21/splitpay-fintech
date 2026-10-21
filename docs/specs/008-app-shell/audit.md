# 008 App Shell — Audit Report

Auditor: `auditor` agent | Date: 2026-10-21 (Brasília) | Branch: `feature/mvp-plan` | Commits audited: `7157498..c3ed553` (`51ccbee` docs sync, `cc1efc2` typed client, `33764e9` tokens/font/favicon/money, `f1762df` UI primitives, `1588854` shell/routes/entry page, `c3ed553` tasks). The `backend/` and `sql/` diffs are empty.

Runtime: Node 22.22.0, Chromium 1194 (Playwright, kept in the scratch directory), Python `.venv` from `backend/`. Scratch directory below: `/tmp/claude-0/-home-claude-splitpay-fintech/03833dd2-2eab-509b-b278-e168f70beef2/scratchpad/audit008/` (abbreviated `$A`). Every script, screenshot and the throwaway harness live there, never in the repo.

## Evidence Gathered

| # | Check | Command / method | Result |
| --- | --- | --- | --- |
| E1 | Strict build | `cd frontend && npm run build` (`tsc -b && vite build`; `strict` and `noUncheckedIndexedAccess` on) | **Passes**, 1943 modules, no TS errors. |
| E2 | Static greps | `rg` over `frontend/src` | No `any`, `as unknown as`, `@ts-ignore`/`@ts-expect-error`/`eslint-disable`. One cast: `body as T` at the trusted API boundary (`services/api.ts:134`), as the spec's "no runtime validation" decision intends. Hex only in `theme.css` and `BrandMark.tsx:27-29`. `rgba(` in components: the known amber button shadow (`Button.tsx:19`) plus two copies of it (`AppLayout.tsx:136`, `NotFound.tsx:18`) and `rgba(0,0,0,.08)` (`LoginScreen.tsx:128`), see n6. No `parseFloat`, `toFixed`, `Math.round` or `* 100` in money code. The only `fetch(` is `services/api.ts:116`. |
| E3 | Money self-check | `$A/money-check.ts`, run with `node --experimental-strip-types` against `frontend/src/lib/money.ts` | **700,060 assertions, 0 failures.** Format: 0, 1, 99, 100, 101, 123456, 99999, −1, −123456, −0, ±10¹², `MAX_SAFE_INTEGER`, all with U+2212 for negatives. Throws on 1.5, NaN, ±Infinity, 0.1+0.2, 2⁵³, 1e21. Parse: "1.234,56", "1234,5", "1234", "0", "0,01", "R$ 1.234,56", "R$1.234,56", "12,", "1.000" → cents; "abc", "-5", "−5", "1,234", "", ",50", "1.23,45", "12.34", "1.2345", "1e3", "+5", Arabic and full-width digits, "NaN", 30 nines → `null`. Round trips: every value 0..100,000 plus 200,000 random values below 10¹² (with prefix, without prefix, without dots). |
| E4 | Typed client vs live API | `uvicorn` on `:8000` (`FRONTEND_ORIGIN=http://localhost:4173`, scratch DB), `/openapi.json` diffed by script against `types/api.ts`; `services/api.ts` read against every operation | **21 operations, 21 functions**, every path, method and query param (`status`, `description`, `period`, `offset`) matches. All 28 component schemas (25 by script, `SplitCreate` and the error envelope by hand): every field present, no extra fields, required/optional and nullability identical. `SplitCreate` is a union discriminated by `mode` that matches the backend validator. DELETE 204 resolves `void`; aborts rethrow; network errors → `ApiError("network_error")` with a pt-BR message. |
| E5 | Entry page (AC1) | `$A/ac1.cjs`, `$A/sair.cjs`, `$A/names.cjs` at 390×844 | Fits exactly (scrollHeight 844 = viewport, also with an error shown). Balance prefilled `2.500,00` from `GET /profile`. Empty and spaces-only name → "Informe seu nome." with focus on the field; 41 chars → "Use até 40 caracteres."; "1,234" → "Informe um valor válido."; no request sent. Money field strips "-", letters. Unchanged balance (also typed as `2500`) → **no PATCH**; changed → one `PATCH /profile {"initial_balance_cents":310050}`. Mocked 422 → "Dados inválidos na requisição." under the balance field, stays on `/entrar`. API down → "Não foi possível conectar ao servidor. Tente novamente." under the field. Name saved trimmed in `splitpay.name`. Guard: all six app routes and `/` → `/entrar` without a name; `/entrar` with a name → `/inicio`; "Sair" clears the key, Back and reload land on `/entrar`. Blocked `localStorage` (getter throws): login, navigation and theme switch still work in memory. **Zero-width-only name is accepted** (m2). |
| E6 | Prototype comparison | `docs/assets/prototype-login.png` vs `$A/entry-390-light.png` (viewed) | Same structure, copy, hero glow, grid, logo, wordmark, sheet, uppercase labels, hint, amber button with chevron and footer line. 1280 layout: hero left, sheet right (`$A/entry-1280.png`). Dark: `$A/entry-390-dark.png`. |
| E7 | Navigation and routes (AC2, AC3) | `$A/scan.cjs` (all routes) and `$A/nested.cjs` | Below 768 px only the fixed tab bar is visible; from 768 px only the top nav (logo, four links, "Novo gasto", initials). `aria-current="page"` on exactly the active item for Início, Extrato, Amigos, Configurações; none on the two routes without a tab. Titles only on the placeholders; Configurações shows Aparência and Sair. `/` → `/inicio`; `/rota-que-nao-existe`, `/inicio/x`, `/entrar/x` → "Página não encontrada" with "Voltar para o Início" (→ `/inicio`). |
| E8 | Themes and flash (AC4) | `$A/ac4.cjs`: the app module answered with an empty script, so the page is inspected before any module code runs; 5 saved values × OS light/dark | Before the module: no saved value or `claro` or `bogus` → `data-theme="light"`, body `rgb(244,244,245)` even with OS dark; `escuro` → `dark`, body `rgb(11,11,12)`, `color-scheme: dark`; `automatico` → `auto`, follows the OS. Identical after the app loads, so there is no flash. Control: radiogroup named "Aparência", Claro checked by default, roving tabindex; Escuro persists `splitpay.theme=escuro` across reload; ArrowRight → Automático follows `emulateMedia` live (dark ↔ light); Home → Claro. |
| E9 | Hide values (AC6) | Throwaway harness `$A/../harness/` (Vite build outside the repo importing `Money`, `HideValuesButton` and every primitive), `$A/ac6.cjs` | Shown: `R$ 1.234,56`, `R$ 0,00`, `−R$ 50,99`, `+R$ 2.500,00`, `R$ 10.000.000.000,00`. One click on either eye masks all six amounts as `R$ ••••` (`role="img"`, "Valor oculto"), both buttons switch to eye-off and "Mostrar valores", `splitpay.hideValues=true` survives reload, the second button restores everything. `.num` gives `nowrap` and tabular figures. A long name truncates beside an unwrapped amount. Screenshots `$A/harness-shown.png`, `$A/harness-hidden.png`, `$A/harness-dark.png`. |
| E10 | Layout scan (AC10) | `$A/scan.cjs`: 9 routes × 360/390/768/1280 × light/dark = **72 full-page screenshots** in `$A/scan/`, name of 40 characters | **0 horizontal scroll at any width, 0 clipped or overflowing text boxes, 0 overlapping text boxes, 0 content under the tab bar, 0 nav visibility errors.** No ellipsis needed anywhere (the only name on screen is the avatar's initials). Viewed: `claro-360-_configuracoes`, `escuro-360-_configuracoes`, `claro-768-_inicio`, `escuro-768-_configuracoes`, `escuro-360-_rota-que-nao-existe`. |
| E11 | Accessibility (AC11) | `$A/a11y.cjs`, `$A/rm.cjs`: Tab through `/entrar`, `/configuracoes`, `/inicio`, 404 at 390 and 1280 in both themes | Every focus stop shows a 2 px solid ring (`#b45309` light, `#fbbf24` dark, offset 2). Smallest targets 44 px high (nav links, segments); tabs 98×60; buttons and inputs 48; money box 60. Text input 16 px, money input 26 px. Skip link "Pular para o conteúdo" is the first stop and moves focus to `main#conteudo`. Two `nav` landmarks named "Principal" (one hidden per breakpoint). With `reducedMotion: reduce` every `transition-property` is `none` and the skeleton has no animation (it pulses without the preference). |
| E12 | Contrast | `$A/contrast.py`, WCAG 2.x, dark soft tokens composited over the actual base (`surface`, `bg`, `nav`) | **32 pairs per theme (text, focus ring, icon), 0 failures.** Lowest: light `success` on `bg` 4.56, `accent-text` on `bg` 4.57, `accent-text` on white 5.02; dark `muted` on `neutral-soft` 5.81. Focus ring vs adjacent surfaces ≥ 4.57 (light) and ≥ 10.6 (dark). |
| E13 | Copy scan | `rg "[—–·→…]" frontend/src frontend/index.html frontend/public` | **Empty.** Every visible string read (routes, nav, entry page, errors, 404, settings, states): natural, professional pt-BR. |
| E14 | Scope, deps, tracked files | `package.json`, lockfile diff, `npm view … time`, `git ls-files` | New deps only `@fontsource-variable/inter` `5.3.0` (published 2026-07-19) and `lucide-react` `1.52.0` (2026-10-04, 17 days before install), both exact. Lockfile otherwise only flips three `@types` entries to `devOptional`. No `.env`, `*.db`, `node_modules` or `dist` tracked (only the two `.env.example`). Nothing from `goal.md` Out of Scope; no screen content from 009–012. |
| E15 | Backend untouched | `git diff 7157498..HEAD --stat -- backend sql`; `cd backend && .venv/bin/pytest -q` | Diff **empty**; **743 passed**. |
| E16 | Servers stopped | `kill` of uvicorn (graceful shutdown in log), `vite preview`, harness `http.server`; `ps`/`ss` afterwards | None running; ports 8000, 4173 and 4180 free. `git status` clean apart from this file. |

## 1. Spec Compliance

- [x] **AC1: Pass, with m2.** Entry page matches the prototype and fits 390×844 (E5, E6). Name in `localStorage`, PATCH only when the balance changes, API errors under the field, redirect guard and Sair all hold. The length rule counts code points after `trim()`, so a name made only of zero-width characters gets in, and 25 decomposed "é" (25 visible characters) are rejected (m2).
- [x] **AC2: Pass.** Tab bar below `md` with icon plus label, `aria-current`, safe-area padding; top nav from `md` with logo, links, "Novo gasto" and initials; content clears the bar (E7, E10).
- [x] **AC3: Pass.** All seven routes, title-only placeholders, `/` redirect, pt-BR not-found (E7).
- [x] **AC4: Pass.** Light default even on a dark OS, three options, persisted, applied before any module code runs, `prefers-color-scheme` followed live, every text pair AA (E8, E12).
- [x] **AC5: Pass.** `BrandMark` on the entry page, top nav and 404; `public/favicon.svg` has the same three shapes and colors.
- [x] **AC6: Pass, with m3.** `Money` and `HideValuesButton` behave as specified (E9). The button sets `aria-pressed` while also swapping its label (m3).
- [x] **AC7: Pass.** One typed function per operation, types identical to the live OpenAPI (E4), no `any`, only `services/api.ts` calls `fetch` (E2).
- [x] **AC8: Pass.** E3.
- [x] **AC9: Pass.** Skeleton, error card with "Tentar novamente", empty state; Button (primary, ghost, plus danger for Sair), TextField, MoneyField, Card, Segmented, Chip, StatusPill (three real statuses only), Avatar (E9 harness). Avatar initials break on emoji (m4).
- [x] **AC10: Pass.** 72 screenshots, zero issues (E10).
- [x] **AC11: Pass.** E11.
- [x] **AC12: Pass.** E13.
- [x] **AC13: Pass.** E1.

**Data Rules: Pass.** Name, theme and hide values only in `localStorage`, each access in try/catch with an in-memory fallback (E5 blocked-storage run); nothing reaches the API except the initial balance. Balance shown with `formatBRL` and parsed with `parseBRL`. Light and dark token values in `theme.css` equal the spec table, including the chart palettes.

## 2. Security & Data Consistency

- [x] **Money.** Integer cents end to end; parsing works on the digit string (E3). The PATCH body is an integer (E5).
- [x] **No secrets or data files committed** (E14). The API base URL comes from `VITE_API_URL`.
- [x] **Errors.** API messages are shown as text (React escapes them); unknown and network errors get fixed pt-BR messages.
- [x] **Backend.** Unchanged and green (E15); `checks.sql` does not apply (no data change).

## 3. Structural & Stack Rules

- [x] **TypeScript.** Strict, no escapes (E1, E2).
- [x] **Dependencies.** Exactly the two planned packages, pinned and older than two weeks (E14).
- [ ] **Files and docs.** `userName.ts`, `ui/focus.ts`, `ui/index.ts` and `SettingsScreen.tsx` sit in allowed folders but are missing from the plan's file list and from the `lib/` line of `repository-structure.md` (m5). `context.md` still describes the old frontend (m6). The design skill keeps two rules that contradict this spec (m7).
- [ ] **Process.** `spec.md:3` and `plan.md:3` still say `Status: draft`, while 001–007 record `approved` before product code (m1).
- [x] **Commits.** Conventional, scoped, one logical change each, docs sync before code.

## Findings

### Blocker

None.

### Major

None.

### Minor

- **m1. Spec and plan are still marked draft.**
  - `docs/specs/008-app-shell/spec.md:3` and `plan.md:3` say `Status: draft`. CLAUDE.md requires an approved spec and plan before product code, and every earlier spec records `approved`.
  - **Fix:** if Vinicius approved the revised spec (`7157498`), set both to `approved` in a `docs(spec)` commit. If he did not, this is a blocker: stop and get the approval before merging.
- **m2. The name rule does not count visible characters.**
  - `frontend/src/lib/userName.ts:24-29` uses `trim()` and `Array.from(...).length`. `"​"` (zero-width space) is accepted and the user enters with an invisible name (E5). A decomposed `"é"` counts 2, so 25 visible letters are rejected. The backend already defines "invisible" (`backend/app/text.py`: categories Cc, Cf, Zs, Zl, Zp plus Hangul fillers and U+2800).
  - **Fix:** trim with the same definition (`/^[\p{Cc}\p{Cf}\p{Z}ᅟᅠㅤﾠ⠀]+|…+$/gu`), then count with `new Intl.Segmenter("pt-BR", { granularity: "grapheme" })`. Apply the same trim in `saveUserName` and `readUserName`.
- **m3. The eye button announces a contradictory state.**
  - `frontend/src/app/components/HideValuesButton.tsx:24-25` sets `aria-pressed={hidden}` and also switches the label. With values hidden a screen reader says "Mostrar valores, pressed": pressed reads as "showing values". WAI-ARIA toggle buttons keep a fixed label when they use `aria-pressed`.
  - **Fix:** remove `aria-pressed` and keep the swapping label the spec asks for.
- **m4. Avatar initials split emoji and other astral characters.**
  - `frontend/src/app/components/ui/Avatar.tsx:31` uses `charAt(0)` and `slice(0, 2)` (UTF-16 units). "Ana 😀" renders `A�` in the top nav (`$A/avatar-emoji.png`), "👨‍👩‍👧 Silva" gives a lone surrogate plus "S".
  - **Fix:** take the first grapheme of each word (`Intl.Segmenter`, or at least `Array.from(word)[0]`).
- **m5. File lists lag behind the code.**
  - `docs/development/repository-structure.md:93` names `money.ts`, `storage.ts` and `preferences.ts` but not `userName.ts`. The plan's file list (`plan.md:12-24`) also omits `userName.ts`, `ui/focus.ts`, `ui/index.ts` and `SettingsScreen.tsx`.
  - **Fix:** add `userName.ts (fake login name)` to the `lib/` line, and add the four files to the plan's file list with a few words each.
- **m6. `context.md` still describes the 001 frontend and a dark identity.**
  - `docs/context.md:13-14`: "`frontend/` is a Vite + React + TypeScript scaffold that calls `/health`" and "The visual identity is a dark theme with a yellow accent". Both are now false, and the presentation reads from this file.
  - **Fix:** in Current State, record that 008 delivered the app shell (fake login, navigation, themes, typed client) and that light is the default with dark selectable, from the approved `prototype-*.png` captures.
- **m7. The design skill still teaches a focus ring that fails in light mode, and a stale font note.**
  - `.claude/skills/splitpay-design-language/SKILL.md:127` and `references/components.md:49` prescribe `focus-visible:outline-accent`: `#fbbf24` on white is 1.7:1, below the 3:1 required for focus indicators. The code correctly uses `accent-text` (`ui/focus.ts:5`). `SKILL.md:97` says "focus ring in `accent`", `components.md:81` uses `focus-visible:ring-accent/40` and `placeholder:text-muted/70`. `SKILL.md:64` still says Inter is "not loaded by `frontend/index.html`".
  - Screens 009–012 follow the skill, so these rules would undo AC11 and AC4.
  - **Fix:** change the three recipes to `focus-visible:outline-accent-text` (`focusRing` from `ui/focus.ts`), drop the `/70` placeholder, and replace the Type note with "Inter Variable is loaded from `@fontsource-variable/inter` (spec 008)".

### Informational

- **n1. Hide values does not mask the entry page balance.** After "Sair" with values hidden, `/entrar` shows the initial balance in clear text. The field is editable, so masking it would be odd, but AC6 says every amount goes through `Money`. Record the exception in the spec, or leave as is.
- **n2. A focused field in error turns amber, not red.** `MoneyField.tsx:41` and `TextField.tsx:82` apply `focus(-within):border-accent` over `border-danger`. Focus moves to the field after an error, so the red border is never seen (`$A/entry-390-api-error.png`). The red message and `aria-invalid` still carry the error. Prefer `border-danger` while `error` is set.
- **n3. "Entrar" looks enabled while the profile loads, but does nothing.** `LoginScreen.tsx:78` returns early when `loading`. Use `disabled={loading || submitting}`.
- **n4. `theme-color` follows the OS, not the chosen theme** (`index.html:6-7`). With Escuro on a light OS the browser bar stays light. The inline script could rewrite the meta. Relevant for 014 (PWA).
- **n5. `HideValuesButton.tsx:28` has `transition-colors` without `motion-reduce:transition-none`.** It is a color fade, not motion, so it is harmless, but every other control has the guard.
- **n6. Duplicated button styling with hardcoded shadow colors.** The primary button classes, including `rgba(251,191,36,.18)`, are copied into the "Novo gasto" link (`AppLayout.tsx:134-138`) and the 404 link (`NotFound.tsx:16-20`), and the sheet uses `rgba(0,0,0,.08)` (`LoginScreen.tsx:128`). Export a `buttonClasses(variant, size)` helper from `ui/Button.tsx` and use it for links.
- **n7. Input borders are 1.27:1 (light) and 1.19:1 (dark) against `surface`.** AC4 only covers text pairs and every field has a visible label, so this passes the spec. WCAG 1.4.11 asks 3:1 for component boundaries; worth a darker `border` step for inputs in 010.
- **n8. `parseBRL` accepts amounts above the API limit** (10¹² cents), which then return the generic "Dados inválidos na requisição." A client-side check with a specific message would be clearer.
- **n9. No mobile entry to `/novo-gasto` and `/gastos-do-mes` yet.** Expected: 009 adds them from Início. The desktop "Novo gasto" link has no `aria-current` on its own page.
- **n10. `EmptyState`'s icon circle (`neutral-soft`) equals `bg` in light mode**, so it disappears outside a card. Use `surface` or `track` there.

## Verdict

**PASS**

All 13 acceptance criteria and the Data Rules hold under real runs. The evidence: the strict build passes. 700,060 money assertions pass. The typed client equals the live OpenAPI on 21 operations and 28 schemas. The entry page matches the prototype and fits 390×844, and PATCH is sent only on change. Themes apply before any module code with no flash. The layout scan finds zero overlap, overflow or horizontal scroll in 72 screenshots. Focus rings, 44 px targets, 48 px/16 px inputs, reduced motion and every contrast pair are verified. The copy scan is empty, the dependencies are pinned, and the backend is untouched with 743 tests passing.

No blocker or major. Fix m1–m7 before 008 merges into `dev`. m1 is a record-keeping fix only if the approval exists; without it, it is a blocker. m7 matters most for the next specs, because they build from the skill.

## Re-audit (fix verification)

Auditor: `auditor` agent | Date: 2026-10-21 | Commits checked: `fb26537` (docs: m1, m5, m6, m7) and `b82154e` (code: m2, m3, m4, n2, n5, n6). Each fix was checked at `HEAD` with my own evidence, not the commit messages. Scratch: `$A/re/`, `$A/scan2/`, `$A/name-check.mts`, `$A/re-*.cjs`, harness `$A/../harness/`.

### Evidence

| # | Check | Result |
| --- | --- | --- |
| R1 | `npm run build` and the static greps from E2 | **Passes.** No `any`, `as unknown as` or `@ts-ignore`. The copy scan is still empty. Hex only in `theme.css` and `BrandMark`. Remaining `rgba(` in components: the planned button shadow (`Button.tsx:19`, now the only copy) and the sheet shadow at `LoginScreen.tsx:128` (n6, now partly fixed). |
| R2 | Name rule, `node --experimental-strip-types $A/name-check.mts` against `lib/userName.ts` and `lib/text.ts` | **36 cases, 0 failures.** Rejected as empty: `""`, spaces, U+200B, U+FEFF, U+2060, U+200E, U+00AD, U+00A0, U+3000, U+3164, U+115F+U+1160, U+FFA0, U+2800, tabs and newlines, U+2028/2029, U+0000. Accepted at exactly 40 and rejected at 41: ASCII letters, decomposed `e`+U+0301, 😀, 👨‍👩‍👧, 🇧🇷. Edge padding of invisible characters is not counted. **Parity with the backend:** `trimInvisible` agrees with `backend/app/text.py` `trim_invisible` on all **1,112,064** Unicode scalar values (**0 differences**). |
| R3 | Name rule in the browser (`$A/re-names.cjs`) | U+200B, U+200B U+200B space and U+00A0 now stay on `/entrar` with "Informe seu nome.". 25 decomposed "é" now get in. Emoji names get in. |
| R4 | Initials in the harness and the top nav | "Ana 😀" → `A😀`, "👨‍👩‍👧 Silva" → `👨‍👩‍👧S`, "🇧🇷 Brasil" → `🇧🇷B`, "élan Souza" (decomposed) → `ÉS`, "​Ana ​Lima​" → `AL`, "ana lima" → `AL`, "  " → `?`. No lone surrogate anywhere. Top nav at 1280 px shows `A😀` (`$A/re/avatar-emoji.png`). |
| R5 | Eye button (harness) | No `aria-pressed` on either button. The label is "Ocultar valores" with the eye icon, then "Mostrar valores" with eye-off after a click. All 6 amounts are masked, and a second click restores them. |
| R6 | Error border while focused (n2) | A TextField with an error and focus has border `rgb(185,28,28)`. The MoneyField after a 422 keeps a red border with the amber focus outline outside it (`$A/re/entry-390-api-error.png`). |
| R7 | Entry page, guard, Sair, blocked storage (`re-ac1`, `re-sair`) | Results are identical to E5: fits 390×844, all messages, PATCH only on change, errors under the field, guard and Sair correct, works with blocked storage. |
| R8 | Themes (`re-ac4`) | Results are identical to E8: before any module code runs, data-theme and body background are right for all 10 combinations, with no flash. Persistence, keyboard and live Automático all work. |
| R9 | Layout scan (`re-scan`, `$A/scan2/`, 72 screenshots) | **0 horizontal scroll, 0 overflow, 0 overlap, 0 content under the tab bar, 0 nav errors** at 360/390/768/1280 in both themes. Viewed: `claro-768-_inicio`, `escuro-1280-_configuracoes`, `escuro-360-_rota-que-nao-existe`. "Novo gasto" (now `buttonClasses({ size: "sm" })`) is 135×44 and fits at 768. |
| R10 | Focus, targets, reduced motion (`re-a11y`, `re-rm`) | Every focus stop has a 2 px ring and none is under 44 px. The "Novo gasto" and 404 links keep their ring. With `reduce`, no transition or animation is left, including `HideValuesButton` (n5). |
| R11 | Skill input recipe, compiled with Tailwind in the harness (`references/components.md:81`), focused by keyboard | **No visible focus ring:** `outline-style: none`, 0 px. `focus:outline-none` sets `--tw-outline-style: none`, and `focus-visible:outline-2` reads that variable, so the ring never appears. |
| R12 | Docs | `spec.md:3` and `plan.md:3` now say `approved`. `repository-structure.md:93` lists `userName.ts` and `text.ts`. `plan.md` lists `userName.ts`, `SettingsScreen`, `focus.ts` and `index.ts`, but not `lib/text.ts`. `context.md:12-14` describes the shell and the light default. `SKILL.md:64`, `:97`, `:127` and `components.md:49` are fixed. |
| R13 | Backend, tracked files, servers | The `backend`/`sql` diff since `7157498` is empty. **743 passed.** No `.env`, `*.db`, `node_modules` or `dist` is tracked. uvicorn, vite preview and the harness server are stopped. |

### Status of each finding

- **m1: Closed.** Both files say `approved`. The coordinator reports Vinicius's approval ("continue", 2026-10-21).
- **m2: Closed** (R2, R3).
- **m3: Closed** (R5).
- **m4: Closed** (R4).
- **m5: Closed.** The four files are listed. The new `lib/text.ts` is only missing from the plan (n11).
- **m6: Closed** (R12).
- **m7: Partly open.** The focus-ring rules in `SKILL.md` and the primary button recipe are fixed. The new input recipe at `references/components.md:81` has no focus ring at all (R11). That is worse than before, because the old recipe at least showed a faint ring.
  - **Fix:** remove `focus:outline-none`, keeping `focus:border-accent-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-text`. Better, point the recipe at `ui/TextField`, as `SKILL.md:97` already does.
- **n2: Closed** (R6).
- **n5: Closed** (R10).
- **n6: Mostly closed.** One `buttonClasses()` now feeds `Button`, the "Novo gasto" link and the 404 link. `rgba(0,0,0,.08)` remains at `LoginScreen.tsx:128` and is still informational.

### New finding (missed in the first audit)

- **m8. Other skill recipes still use amber text and small targets that this spec rules out.**
  - `.claude/skills/splitpay-design-language/references/components.md` still has:
    - `text-accent` for text at `:38` (stat value), `:84` ("Money field: large number in `accent`"), `:94` (avatar initials on `bg-accent/15`), `:125` (active tab) and `:138` (hero last word);
    - a segmented control with `h-8` buttons and `aria-pressed` at `:111`;
    - an 11 px tab label at `:125`.
  - In light mode `#fbbf24` on white is 1.7:1, below AA even for large text (3:1). `SKILL.md`'s own Themes section says amber text must be `accent-text`. The shipped `Segmented` is a 44 px radiogroup, and `SKILL.md` says never below 12 px.
  - 009–012 build from these recipes, so they would break AC4 and AC11 on the next screens. The shipped code is not affected.
  - **Fix:**
    - Replace text uses of `text-accent` with `text-accent-text`, or with `text-text` for the money field as `MoneyField` does.
    - Use `bg-accent-soft text-accent-soft-text` for initials.
    - Make the active tab `aria-[current=page]:text-accent-text` at `text-xs`.
    - Point the segmented recipe at `ui/Segmented` (44 px, `role="radio"`).

### Informational

- **n11.** `lib/text.ts` (new in `b82154e`) is listed in `repository-structure.md` but not in the plan's file list (`plan.md:14`). Add one line.
- n1, n3, n4, n7, n8, n9 and n10 are unchanged and still informational.

### Re-audit verdict

**PASS, with 2 minors open (m7 partly, m8).** All 13 acceptance criteria still hold at `HEAD`:
- the build is clean;
- the name rule now matches the backend's definition of "visible" on every code point;
- the initials keep whole graphemes;
- the eye button's ARIA is consistent;
- the layout scan is clean in 72 screenshots;
- themes, focus, targets and reduced motion are unchanged and correct;
- the backend is untouched.

The two open minors are in the design skill only, but they would carry regressions into 009–012. Fix them before 008 merges into `dev`. **T6 stays unchecked in `tasks.md`** until they are closed and verified, per the coordinator's rule (PASS with no open minors). I did not edit `tasks.md`: my role file allows only `audit.md`.

### Closing check (`e3f8019`)

Scope: `references/components.md` and `plan.md` from `e3f8019`. `HEAD` is `e3f8019`, and `frontend/` has not changed since the re-audit. The sheet's upward shadow at `LoginScreen.tsx:128` stays by decision (n6 accepted).

| # | Check | Result |
| --- | --- | --- |
| C1 | The input recipe at `components.md:81`, compiled with Tailwind in the harness and focused with Tab, then with the mouse, in light and dark | **Ring visible:** `solid 2px` `rgb(180,83,9)` (light) and `rgb(251,191,36)` (dark), offset 2 px; border `accent-text` on focus. Screenshots `$A/re/skill-input-focus-light.png` and `-dark.png`. |
| C2 | `rg 'text-accent([^-]\|$)'` over `SKILL.md` and `references/` | Only `:138`, now scoped to the dark hero, with `text-accent-text` named for light surfaces. Lines 38, 94 and 125 now use `accent-text`/`accent-soft-text`. |
| C3 | `rg 'in \`accent\`'` | **`components.md:84` is unchanged:** "Money field: large number in `accent` (`text-3xl …`)". This line was listed in m8. |
| C4 | `rg 'h-8\|aria-pressed\|text-\[1[01]px\]'` | The segmented recipe now points to `ui/Segmented`, with no `h-8`. `aria-pressed` remains only on the category chip (`:71`), which is correct for a toggle chip and matches `ui/Chip`. The tab label is now `text-xs`. **`text-[11px]` remains** on the count badge (`:74`). |
| C5 | Targets in the recipes | **The ghost button (`:55`) is `h-9` (36 px) and the category chip (`:71`) is `h-10` (40 px)**, both interactive and under the 44 px rule in `SKILL.md`. The shipped `Button` `sm` and `Chip` are 44 px. `size-8` (`:36`) and `size-10` (`:94`) are decorative and fine. |
| C6 | `rg '[—–·→←↑↓…]'` and out-of-scope wording | The arrow in the timeline line is gone. **`components.md:97` still has `24 Abr · 3 pessoas`:** a "·" separator, which the copy rule bans, and "3 pessoas", a group split, which `goal.md` puts out of scope. The only other hit is `SKILL.md:60`, which names the banned characters. |
| C7 | `plan.md` | Lists `lib/text.ts`. **n11 closed.** |
| C8 | Servers and repo | The harness server is stopped and nothing is running. `git status` shows only this file. |

**Status**
- **m7: Closed** (C1).
- **n11: Closed** (C7).
- **m8: Partly open.** `:84` still says amber (C3). This pass also found more recipe issues of the same kind. I should have caught them in the first audit:
  - `:55` ghost button is `h-9`, and `:71` chip is `h-10`, both under 44 px (C5).
  - `:74` badge is 11 px, under the 12 px floor (C4).
- **m9 (new).** `components.md:97` example meta `24 Abr · 3 pessoas` uses the banned "·" and shows a group split (C6). Screens copy recipes, so this would put out-of-scope copy into 011.

**Fixes (all in `references/components.md`):**
- `:84`: "large number in `text`".
- `:55`: `min-h-11` with `text-sm`, or "use `Button` `size="sm"` (44 px)".
- `:71`: `min-h-11`, or "use `ui/Chip`".
- `:74`: `text-xs`.
- `:97`: `Jantar, 24 out`, or a 1-to-1 example such as `24 out, com Ana`.

After these, the closing check is the same `rg` lines plus a recompile, and needs no runtime run.

### Final verdict

**PASS, with 2 minors open (m8 partly, m9).** All 13 acceptance criteria, the Data Rules and every code finding are closed and verified at `HEAD`. The open items are 5 lines of design-skill guidance; none is in shipped code. Per the coordinator's rule, T6 stays unchecked in `tasks.md` until they are fixed.

### Closing check 2 (`ae0bc8b`)

`ae0bc8b` changes only `references/components.md` (5 lines). `frontend/` is unchanged since the re-audit.

| # | Check | Result |
| --- | --- | --- |
| D1 | `rg 'text-accent([^-]\|$)'` and `rg 'in \`accent\`'` over `SKILL.md` and `references/components.md` | Only `:138`, the dark-hero-only note, and `SKILL.md:127`, which is the `outline-accent-text` rule. `:84` now reads "large number in `text`". |
| D2 | `rg '\bh-(6\|7\|8\|9\|10)\b'`, `rg 'text-\[(9\|10\|11)px\]'`, `rg 'outline-none'` | **No hits.** |
| D3 | `rg '[—–·→←↑↓…]'` and out-of-scope words (`pessoas`, `Em atraso`, `Lembrar`, `Pendente`) | Only the rule text in `SKILL.md:60` and `:96`. `:97` now reads `24 out, com Ana` (1-to-1, no separator). |
| D4 | Recompiled with Tailwind in the harness: ghost button (`:55`), category chip (`:71`), count badge (`:74`) and input (`:81`), in light and dark | Ghost 44 px high, 14 px text. Chip 44 px high, 14 px text, selected `accent-soft-text` (`#92400e` light, `#fbbf24` dark). Badge 12 px text. The input, focused by Tab, shows `solid 2px` `#b45309` (light) and `#fbbf24` (dark). |
| D5 | Servers and repo | Nothing running. `git status` shows only this file. |

**Status:** m8 and m9 are **closed**. Every finding from m1 to m9 is closed. The remaining informational notes are accepted as is: n1, n3, n4, n7, n8, n9, n10, and n6 for the sheet shadow.

### Final verdict

**PASS, with no open blocker, major or minor findings.** All 13 acceptance criteria and the Data Rules hold at `HEAD` (`ae0bc8b`), and the design skill now matches spec 008. T6 can be marked done.
