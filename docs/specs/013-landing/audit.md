# 013 Landing Page — Audit Report

Auditor: `auditor` agent | Date: 2026-10-29 | Branch: `feature/mvp-plan` | Commits audited: `c218ffc` (static landing and route), `7ef4dd6` (GSAP motion), `93a2321` (docs sync), `d7c20e1` (visual polish), diffed against `dev` (`c3fc119`). The `backend/` diff is empty.

Runtime: Node 22, Chromium 1194 through Playwright (`require("playwright")`, no browser installed). `vite preview` on `:4173` after `npm run build`. API on `:8000` (`FRONTEND_ORIGIN=http://localhost:4173`, scratch DB) for `/entrar` and the app smoke. `dev` was built in a scratch worktree (`git worktree add --detach … dev`) for the bundle and `/entrar` comparisons, and was served on `:4173` in turn so that CORS matched. Scratch directory: `/tmp/claude-0/-home-claude-splitpay-fintech/03833dd2-2eab-509b-b278-e168f70beef2/scratchpad/audit013/` (written `$A` below). All scripts, screenshots and data are there and none are in the repo. ScrollTrigger is not reachable from `window`, so the leak checks served the landing chunk with one extra statement (`window.__ST = ScrollTrigger`) through `context.route`. Only that test copy changed; the build did not.

## Evidence Gathered

| # | Check | Command / method | Result |
| --- | --- | --- | --- |
| E1 | Strict build | `cd frontend && npm run build` | **Passes** (`tsc -b && vite build`, 2000 modules, no TS errors). |
| E2 | Static greps | `rg` over `src/app/landing/`, `HeroBackdrop.tsx`, `routes.tsx` and the added lines | No `any`, `@ts-*`, `eslint-disable` or type casts. No `toFixed`, `parseFloat`, `parseInt`, `Math.round`, `innerHTML`, `dangerouslySetInnerHTML`, `fetch(` or `localStorage`. Every amount is integer cents through `formatBRL`/`Money` (`SAMPLE_BALANCE_CENTS = 706_397`, `9_395`, `18_790`). The only literal colors are the documented amber CTA shadow and one black preview shadow `rgba(0,0,0,.45)` (n5). |
| E3 | Copy scan | `rg "[—–·→…]" frontend/src` | **Empty** (exit 1). |
| E4 | Spec copy verbatim (`$A/func.cjs`) | `innerText` of the rendered page, with and without a saved name, compared with every string in AC2-AC7 and the footer | **All 36 strings present**, character for character, including "Janta no japonês", "Com Ana Lima", "−R$ 187,90", "Aguardando reembolso", "R$ 93,95" and "Valores de exemplo". The eyebrow source text is "Projeto acadêmico FIAP", but CSS `uppercase` displays it in capitals (n1). There are no testimonials, counts, metrics or user numbers. The only figures are the three sample amounts, under the "Valores de exemplo" caption. |
| E5 | Dependencies | `git diff dev.. -- frontend/package*.json`; `npm ls`; `npm audit --omit=dev` | `package.json` adds exactly `"gsap": "3.15.0"` and `"@gsap/react": "2.1.2"` (no caret). The lockfile adds only those two packages, with registry `resolved` and `integrity`, and the root `dependencies` match. `npm ls` resolves `gsap@3.15.0` (deduped under `@gsap/react`). **`npm audit --omit=dev`: found 0 vulnerabilities.** |
| E6 | GSAP isolation | `rg 'from "gsap\|@gsap'` over `src`; grep of the built chunks | GSAP is imported only in `src/app/landing/useLandingMotion.ts`. In `dist/`, `LandingScreen-*.js` has 37 GreenSock/ScrollTrigger hits and `index-*.js` has **0**. `index.html` has no modulepreload of the landing chunk. |
| E7 | App entry size vs `dev` (zlib level 9, same `node_modules`) | `dev` `c3fc119` built in a scratch worktree | JS entry 112,971 → 113,742 B gzip (**+771 B**). CSS 9,208 → 10,102 B gzip (+894 B, because Tailwind writes one stylesheet). Entry JS plus CSS: **+1,665 B, under 2 kB** (n4). The landing chunk is 130.7 kB raw, 51.3 kB gzip. |
| E8 | Backend untouched | `git diff dev.. -- backend`; `.venv/bin/pytest -q` | Empty diff; **743 passed**. No `.env`, `*.db`, `node_modules` or `dist` tracked. |
| E9 | Route, header and CTA targets (`$A/func.cjs`) | 390 px, no name and with `splitpay.name` | No name: header shows "Entrar" → `/entrar` and both CTAs → `/entrar`. With a name: "Abrir o app" → `/inicio` and both CTAs → `/inicio`. Clicking the hero CTA lands on the target. "Pay" is `rgb(251,191,36)`. The header is `position: absolute` (not sticky or fixed). **0 `nav` elements on `/`** (no tab bar or top nav). 110 checks, 0 failures apart from the two uppercase notes in E4. |
| E10 | "Como funciona" and footer | same script | Clicking the link puts `#como-funciona` at `top` = 0 ± 2 px, and the URL ends in `#como-funciona`. Footer: `https://github.com/vininoronha21/splitpay-fintech` and `http://localhost:8000/docs` (`API_DOCS_URL` from `services/api.ts`). Both have `target="_blank"`, `rel="noopener noreferrer"` and an sr-only "(abre em nova aba)". A direct load of `/#como-funciona` stays at the top (n3). |
| E11 | Semantics | same script | One `h1` (the hero title, `aria-labelledby` of the hero). `h2`s: "O que dá para fazer", "Como funciona", "Pronto para testar?". One each of `header`, `main` and `footer`. The preview drawing is `aria-hidden="true"`, and a sibling `sr-only` sentence describes it ("Exemplo da tela inicial do SplitPay: saldo disponível de R$ 7.063,97, …"). `figcaption` "Valores de exemplo" is exposed. **0 focusable elements inside any `aria-hidden` subtree** (`TransactionRow` has no `href` here, so it is not a link). 5 feature cards and 3 steps. |
| E12 | Counter (`$A/motion.cjs`) | `MutationObserver` on the balance text node from document start | 50 frames: the first is "R$ 0,00", the values never decrease, the last is **"R$ 7.063,97"**, and every frame parses as `R$ d.ddd,dd` integer cents (no float output). Each hero part is left with no inline `style` after the entrance. Inline properties written to `data-motion` elements are only `transform`, `translate`, `rotate`, `scale`, `transform-origin` and `opacity`. |
| E13 | Hide values | `splitpay.hideValues = "true"`, sampled 12 times over 1.4 s | The balance stays "R$ ••••" the whole time, with **0 counter writes**. The preview shows no digits other than the sample date "24 out". |
| E14 | Reduced motion, first paint (both themes) | `reducedMotion: "reduce"` and a `MutationObserver` from document start, then a scroll to the bottom | The balance is "R$ 7.063,97" when the `h1` first appears. Every `data-motion` element has opacity 1, transform `none` and no `style` attribute. **0 style or text mutations** on `data-motion` elements through load and the full scroll. |
| E15 | Never hidden by CSS | walk of every `cssRules` entry, plus the class lists of `data-motion` elements | No CSS rule selects `[data-motion]`, and no `data-motion` element has `opacity-0`, `invisible` or `hidden`. The "from" states exist only inside the `no-preference` branch of `gsap.matchMedia`. With `javaScriptEnabled: false` the SPA renders an empty `#root`, which is expected for this stack. AC9's "no JS" holds because the markup and CSS are the final state (E14, E19). |
| E16 | Media query flip mid-entrance (`$A/flip.cjs`) | `emulateMedia({ reducedMotion: "reduce" })` at 150, 450 and 700 ms | Each time (counter mid-value, e.g. "R$ 3.901,45"), the page goes straight to the final state: balance "R$ 7.063,97", all `data-motion` final, **`ScrollTrigger.getAll()` = 0**, no error. This exercises the cleanup that writes the final value back (plan, Changes during T1 and T2). |
| E17 | Unmount mid-animation and ScrollTrigger cleanup (`$A/net.cjs`) | Header link clicked 250 ms after load, without and with a name | 9 triggers on `/`. After leaving (to `/entrar`, or to `/inicio` with the counter at "R$ 261,60"): **`getAll().length` = 0**. A resize and scroll on the app screen then cause no error. Back to `/`: the counter ends at R$ 7.063,97 with 9 triggers (not doubled). Forward again: 0. No page error, console error or warning. |
| E18 | Route chunks (`$A/net.cjs`, `$A/smoke.cjs`) | Network log on direct loads, plus a tab bar round trip | Direct loads of `/inicio`, `/entrar` and `/extrato` **request no `LandingScreen`/GSAP file**. `/` requests it exactly once. The whole app smoke (E24) never requests it. `/` itself makes **0 requests to the API** (`$A/noapi.cjs`). The dark `hydrateFallbackElement` renders `bg-hero` (`rgb(11,11,12)`) while the chunk is delayed 1.5 s. If the chunk fails to load, the pt-BR `RouteError` shows. |
| E19 | Layout scan (`$A/scan.cjs`, `$A/scan/`) | 360, 390, 768, 1280 × light and dark × {settled after a full scroll, reduced motion} = **16 full-page screenshots** | No horizontal scroll, no clipping, every `data-motion` element final, no page error. The text-overlap detector reported one pair in every state, the `h1` text node against its own amber span on the next line. That is a false positive: line-height 1.1 (39.6 px at 36 px font) is smaller than the 44 px glyph box, so the range rectangles of adjacent lines overlap by about 4 px while the glyphs do not touch (`$A/crop-*.png`, `$A/h1.cjs`). **Settled and reduced screenshots are pixel-identical in all 8 width/theme pairs**, so the page after motion equals the static markup. |
| E20 | Layout rules (`$A/geo.cjs`) | 390, 768, 1024, 1280, 1600 | Content width is 1140 px at 1280 and 1600 (976 px at 1024, inside the 24 px gutters). Sections have 64 px padding below `lg` and 120 px from `lg`. The hero is 108/64 px and 168/120 px under the absolute header. The preview sits beside the text from `lg` (1024) and under it below that. Features: 1 column at 390, 2 at 768, and 3 at 1024 and up with US01 752 px wide against 364 px (spanning two). The hero background is `#0b0b0c` in both themes. |
| E21 | Keyboard sweep (`$A/kbd.cjs`) | Tab from the top at 360, 390, 768, 1280 × both themes × no name and with a name | **96 stops, 304 checks, 0 failures.** Order: header button, hero CTA, "Como funciona", closing CTA, "Código no GitHub", "Documentação da API". Every stop matches `:focus-visible` with a 2 px solid outline, stays in view and is at least 44 px (header 83×44, CTAs 306×52, footer links 44 px high). Hero rings are amber `#fbbf24` (11.8:1 on `#0b0b0c`). The rings below the hero are `accent-text` in light and amber in dark. |
| E22 | Contrast (`$A/contrast.py`) | For every visible text run in the 8 reduced screenshots: a second full-page shot with text made transparent, the text color (with its alpha) composited on every background pixel under the run, then the 2nd percentile | **0 failures across 88 distinct text/theme pairs.** The lowest are "Saldo disponível" (`on-accent`/72 on amber) **5.86**, the closing note in dark (`muted` on `surface`) 5.87, the "Aguardando reembolso" pill 6.37, and the US01 text (`on-accent`/80) 7.34. Over the glows: header "Entrar" **7.50** and the hero lead (`hero-text`/72) **8.81** at 1280, where the glow is largest, and "Valores de exemplo" 9.78. Every large title is ≥ 11.3. |
| E23 | `/entrar` unchanged (`$A/entrar.cjs`, `$A/entrar/`) | Viewport screenshots of `/entrar` from `dev` and from the feature branch, both served on `:4173` against the same API, at 360, 390 and 1280 in both themes | **Pixel-identical in all 6 pairs** (`ImageChops.difference(...).getbbox()` is `None`), and the hero `section` markup has the same length. The `HeroBackdrop` extraction with `variant="entry"` reproduces the old decoration exactly. |
| E24 | App smoke (`$A/smoke.cjs`) | Saved name; direct loads, then the tab bar | Início, Novo gasto, Extrato, Configurações, Amigos and Gastos do mês each render one `h1`, a `nav` and no error card. The Início balance equals `GET /balance`. The tab bar round trip works, `*` still shows "Página não encontrada", and there is no page error. **22 checks, 0 failures.** No in-app link points to `/` (`rg 'to="/"'` is empty), so nothing that used to reach Início through the old redirect now lands on the landing page. |
| E25 | Fast jumps (`$A/jump.cjs`) | Full motion, 390 and 1280: "Como funciona", then `End`, then the top. Also `End` 200 ms after load | Every feature card and step ends at opacity 1 (the `passed` branch of `reveal` clears cards jumped over). No errors. |
| E26 | 4x CPU throttle (`$A/net.cjs`) | `Emulation.setCPUThrottlingRate 4`, `longtask` observer, at 390 and 1280 | **No long task during the entrance or a 5,000 px wheel scroll.** The only long tasks come before the `h1` appears (script evaluation: 102/154 ms at 390, 104/206 ms at 1280). The counter ends at R$ 7.063,97. |
| E27 | Servers and repo | Stopped uvicorn and both previews; removed the scratch worktree; `curl` both ports | Both ports refuse (`000`). `git worktree list` shows only the main checkout. `git status` was clean before this file was written. |

## 1. Spec Compliance

- [x] **AC1: Pass.** `/` is the landing page for everyone, with no tab bar or top nav (E9). `/entrar` is pixel-identical to `dev` (E23), and the app routes still work (E24).
- [x] **AC2: Pass.** Roundel and "Split**Pay**" in amber. The button reads "Entrar" or "Abrir o app" depending on `readUserName()`. The header is not sticky (E9).
- [x] **AC3: Pass.** Eyebrow, title, lead, CTA with the header's target, "Como funciona" scrolling to the section. The preview uses `Money`, `TransactionRow` and `StatusPill` with fixed cents and the caption. Side by side from `lg` (E4, E9, E10, E20). The row's meta line reads "Com Ana Lima, 24 out" because the real component adds the date (n2).
- [x] **AC4: Pass.** Five cards with icon, title and the spec sentence. 1 / 2 / 3 columns, and US01 spans two from `lg` (E4, E20). At `md` US01 also spans the full row (n2).
- [x] **AC5: Pass.** `id="como-funciona"` and three numbered steps on an 11 px rail (E4, E19).
- [x] **AC6: Pass.** "Pronto para testar?", the same CTA, the note (E4).
- [x] **AC7: Pass.** Text, both URLs, `target` and `rel` (E10).
- [x] **AC8: Pass.** One hero timeline with `y: 24, opacity: 0, 0.6 s, stagger 0.08, power2.out`. The cents counter runs 0.8 s through `formatBRL`. Reveal-once uses `ScrollTrigger.batch` (`top 85%`, `once`, stagger 0.1). The rail uses `scaleY` with scrub. Only transform and opacity change, nothing loops, and nothing blocks input (E12, E17, E25, E26).
- [x] **AC9: Pass.** Final state at first paint with zero mutations under reduced motion. No CSS hides content. A media flip mid-entrance lands on the final state (E14, E15, E16).
- [x] **AC10: Pass.** GSAP is only in the landing chunk, app routes never request it, and the entry grows +1,665 B gzip (E6, E7, E18).
- [x] **AC11: Pass.** The hero is dark in both themes. Max width 1140 and padding 64/120. 16 clean scans after the motion settles and with reduced motion (E19, E20).
- [x] **AC12: Pass.** One `h1`, section `h2`s, landmarks, `aria-hidden` preview with a hidden description, 44 px targets, visible focus, AA in both themes including over the glows, clean copy, nothing invented (E3, E4, E11, E21, E22).
- [x] **AC13: Pass.** E1.

**Data Rules: Pass.** The landing makes no API request (E18). Sample values are integer cents formatted by `formatBRL` (E2, E12) and captioned as examples. CTA targets come from `readUserName()` (E9).

**Test Strategy (plan): Pass.** Every item was run independently: chunk sizes, CTA targets, the scroll link, footer `target`/`rel`, the counter final value, reduced motion on first paint, no GSAP on `/inicio`, the layout scan in both modes, the keyboard sweep, the copy scan and contrast (E1-E26).

**Changes during T1 and T2: Accepted.** (1) `HeroBackdrop` is shared, and `/entrar` stays pixel-identical (E23). (2) `API_DOCS_URL` keeps the base URL logic in `services/api.ts` (E10). (3) The dark `hydrateFallbackElement` prevents a light flash (E18). (4) The counter writes into React's text node and puts the final value back when interrupted (E16, E17). (5) T3: `ScrollTrigger.batch` reveals and the `landing` glow variant (E19, E25). The default `entry` variant is unchanged (E23).

## 2. Security & Data Consistency

- [x] **Money.** Integer cents end to end. No float formatting, and every counter frame is a valid `formatBRL` string (E2, E12).
- [x] **No backend change**; `pytest` 743 passed. `checks.sql` does not apply (E8).
- [x] **External links** open with `noopener noreferrer`. The page renders no user or API text, and there is no `innerHTML` (E2, E10). The counter writes `nodeValue` only.
- [x] **Dependencies.** Exactly the two approved pins, and `npm audit --omit=dev` is clean (E5). The GSAP standard license is recorded in the lockfile and the spec.

## 3. Structural & Stack Rules

- [x] **TypeScript.** Strict build with no escapes (E1, E2).
- [x] **Files.** `app/landing/` is new and recorded in `repository-structure.md` with its reason (its own chunk) and the "only folder that imports GSAP" rule. `HeroBackdrop` is listed among the shared pieces. `context.md`, `SKILL.md` and `references/motion.md` record 013 and the pinned versions.
- [x] **Scope.** No testimonials, pricing, sign-up, PWA or app-screen motion. 1-to-1 wording only.
- [x] **Process.** The spec was approved (`2eda51d`) before the first code commit (`c218ffc`). Commit notes are in n6.

## Findings

### Blocker

None.

### Major

None.

### Minor

None.

### Informational

- **n1. The eyebrow shows in capitals.** The source text is the spec's "Projeto acadêmico FIAP" (`LandingScreen.tsx:104`), and the class `uppercase` (`:101`) displays it as "PROJETO ACADÊMICO FIAP". Screen readers get the sentence-case text. The design skill allows uppercase display labels, so this follows the identity, but it is not a letter-for-letter copy of the spec. Optional: drop `uppercase` and `tracking-wide`, or add "shown in uppercase" to AC3 so the spec and the screen agree.
- **n2. Small layout and wording deviations from the literal spec, both reasonable.**
  - The preview row's meta line is "Com Ana Lima, 24 out", not just "Com Ana Lima". `TransactionRow` always adds the date (`TransactionRow.tsx:30`), and the sample date is fixed (`HeroPreview.tsx:19`).
  - At `md`, US01 takes the whole first row (`md:col-span-2`, `FeatureGrid.tsx:58`), so the five cards read 1 + 2 + 2 instead of leaving a lone card.
  - Optional: say both in the spec when the 013 docs are next touched.
- **n3. A direct load of `/#como-funciona` does not scroll to the section.** The lazy route renders after the browser has already tried the fragment, so `scrollY` stays 0 (E10). The in-page link, which is what AC3 asks for, works. Optional: after mount, `document.getElementById(location.hash.slice(1))?.scrollIntoView()` when a hash is present, before the motion hook measures.
- **n4. The landing's Tailwind classes ship in the app stylesheet.** That is 894 B of the 1,665 B entry growth (E7). Tailwind writes one CSS file, so this is expected and inside the AC10 budget. No action.
- **n5. One literal color in a component.** `HeroPreview.tsx:39` uses `shadow-[0_24px_64px_rgba(0,0,0,.45)]`. The design skill says components never hardcode colors, and this shadow is neither a token nor the documented amber shadow. It is a neutral shadow on the always-dark hero, so the visual impact is nil. Optional: a `--shadow-hero-card` token, or a comment like the CTA's.
- **n6. Commits.**
  - `d7c20e1` is typed `style(web)` but changes behavior: reveal-once moves to `ScrollTrigger.batch`, and it adds the `passed` jump handling.
  - `d7c20e1` and the code commits also edit `plan.md`/`tasks.md`.
  - The T4 docs commit (`93a2321`) lands before T3 (`d7c20e1`).
  - This is the same pattern as 009 n5 to 012 n6, against "one logical change per commit".

## Verdict

**PASS with nothing open.** No blocker, major or minor finding. n1-n6 are informational and optional.

Every acceptance criterion, the Data Rules, the plan's Test Strategy and the five "Changes during T1 and T2" hold under my own runs:
- strict build, clean greps and copy scan, and every spec string on the page;
- exactly `gsap@3.15.0` and `@gsap/react@2.1.2`, with 0 audit findings;
- GSAP only in the landing chunk, and an entry growth of +1,665 B gzip;
- CTA and header targets for both login states, and no tab bar;
- `/entrar` pixel-identical to `dev` at 3 widths in both themes;
- the counter steps through integer cents to "R$ 7.063,97", and hide values keeps the mask;
- reduced motion is final at first paint with zero mutations, and a media flip, an unmount and fast jumps all land on the final state;
- 0 ScrollTriggers left after leaving `/`;
- app routes never fetch the landing chunk;
- 16 layout scans with no scroll, clipping or overlap, and settled equal to reduced pixel for pixel;
- 96 keyboard stops with rings and 44 px targets;
- 88 contrast pairs at AA or better, including over the glows;
- no long task while animating at 4x CPU;
- the app smoke on all six screens, and `pytest` 743 passed.

T5 can be checked.
