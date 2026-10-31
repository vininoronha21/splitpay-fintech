# 016 Landing v2 and User Menu — Audit

Auditor: `auditor` (read-only on product code) | Date: 2026-10-31 | Branch: `feature/mvp-plan` at `ddfae45` (commits `5390397`, `e3e4491`, `ddfae45`)
Scope: AC1 to AC10 of `spec.md`, the user menu (`UserMenu.tsx`, `AppLayout.tsx`, `BalanceHeader.tsx`, `LoginScreen.tsx`), everything in `frontend/src/app/landing/`, and the doc sync.

Scripts and screenshots are in the session scratchpad, folder `016audit/` (called `$A` below). The production build ran under `vite preview` on port 4173. The API ran on port 8000 with `FRONTEND_ORIGIN=http://localhost:4173` and a scratch `DATABASE_PATH`. Playwright used the preinstalled Chromium. Both servers were stopped by PID afterwards. No committed file other than this one was changed.

## Evidence

| # | Check | How | Result |
| --- | --- | --- | --- |
| E1 | Build, strict TS, pytest (AC10) | `npm run build`; `pytest` | Build clean. `git diff 6e4ba39 ddfae45 -- backend` is empty; **807 passed**. |
| E2 | AC1 arrow | Source, screenshots | One CTA (`LandingScreen.tsx:28-42`), `ArrowRight` with no rotation. `rg "ArrowUpRight\|-rotate-"` in `app/` is empty. Straight arrow in `$A/shots/rm-claro-1280-full-part0.png`. **Pass.** |
| E3 | AC3 academic copy | `rg -i "acad[eê]mic\|FIAP" frontend/src frontend/index.html frontend/public` | Empty. Login footer is now "Dados de demonstração compartilhados." `goal.md` keeps the context. **Pass.** |
| E4 | AC2 user menu (`$A/menu.cjs`, `$A/ring.cjs`) | 360, 390, 768 and 1280, light and dark, 8 runs. Keyboard (Enter, Space, Tab, Escape), pointer, outside click, both items | One visible trigger per viewport: the greeting on the amber header below md (`aria-label` "Boa noite, Maria Eduarda Albuquerque, menu do usuário", 340×44 at 360) and the avatar from md ("…, menu do usuário", 44×44). `aria-expanded` and `aria-controls` are set. Enter and Space open the menu. Tab reaches both items (48 px tall). Escape closes it and focus returns to the trigger. Tabbing past the last item, an outside click and choosing an item all close it. "Voltar para a página inicial" goes to `/` and keeps the name. "Trocar usuário" goes to `/entrar` and clears `splitpay.name`, the same code as Sair (`SettingsScreen.tsx:25-26`). Popover inside the viewport at 360 with no page scroll. No console errors. **Pass.** |
| E5 | AC2 focus rings and contrast | Settled computed `outline-color` against the nearest opaque background | Trigger on amber: `#111111` on `#fbbf24` **11.31:1**. Avatar trigger: `#b45309` on white **5.02:1** (light), `#fbbf24` on `#0b0b0c` **11.8:1** (dark). Items: `#b45309` on white **5.02:1**, `#fbbf24` on `#18181b` **10.6:1**. All are 2 px solid. Screenshots: `$A/shots/menu-claro-360.png`, `$A/shots/ring-escuro-1280.png`. (Read right after focus, the color is mid-transition, because `transition-colors` also animates `outline-color`. It settles within 150 ms.) **Pass**, see n1. |
| E6 | AC4 section order and content | DOM headings, full-page screenshots in reduced motion | Order: hero h1, Funcionalidades (5 h3), Por que é diferente (3 h3), A startup (Missão, Para quem é, Modelo de negócio, Próximos passos with 3 h4), Como funciona. No problem section, no final CTA. The hero CTA and header link stay the way into the demo. **Pass.** |
| E7 | AC4 claims checked against the product | `backend/sql/seed.sql`, `docs/context.md` Business Rules, app components | 31 default rules (matches `DEFAULT_RULE_COUNT`). `janta`, `combustivel`, `uber` and `bar` are default rules. `bar` does not match "Barbearia" (BR 8). The remainder cent goes to the payer, who is always the user (BR 6/7). Parcela, forma de pagamento and observações are in `TransactionDetailScreen.tsx:193-197`. "Pago em 23 out" follows the app's `StatusPill` label. "O modelo de dados já guarda uma parte por pessoa" matches BR 6. The startup copy has no metrics, users, revenue, partners or testimonials. The business model and the roadmap carry a "Proposta" tag, with a closing sentence (`StartupSection.tsx:156-158`). **Pass.** |
| E8 | Sample numbers, integer cents | `FeatureScreens.tsx`, `WhyDifferent.tsx`, final DOM text | Split 18790: equal 9395/9395, 30% floor(5637)/13153, fixed 5000/13790 (BR 7). Receivables 9395, 3200 and 2800 are half of 18790, 6400 and 5600. A receber 9395 and já recebido 3200 (acertado in neither, BR 1). Balance chain: 695647 − 4250 = 691397, then + 15000 = 706397, which equals the hero sample R$ 7.063,97. Donut 192860 at 62/21/10/7 % (largest remainder, sum 100). Friend bars are scaled to the maximum. Why card: 10001 gives 5000 + 5001, and 18790 gives +9395 received. Counters tween integer cents with `snap: 1` through `formatBRL`. **Pass**, except the display defect M1 and the transient m1. |
| E9 | AC5 motion (`$A/landing.cjs`, `$A/tour.cjs`) | Scrolled capture at 360/1280, tour steps at 768, 1280 and 1366×650 | Pinned, scrubbed tour with progress bars and label snap from md with height ≥ 640 (2 pin spacers). The statement is pinned and scrubbed word by word. Hero parallax (lg), startup parallax (md), staggered `ScrollTrigger.batch` reveals, a roadmap line drawn by scrub, the Como funciona rail, counters, the typed description and growing bars. When the stage would not fit (1366×650), it falls back to the stacked list (1 pin, the statement). Only `transform` and `opacity` animate. Layout reads (`measure`) run only on refresh, and tilt uses `quickTo`. Screens: `$A/shots/mt-1280.png`, `mt-768.png`, `mt-1366.png`, `m-*-360.png`. **Pass.** |
| E10 | Hover tilt only on fine pointers (`$A/tilt.cjs`) | Hover a why card | 1280 mouse: `matrix3d(…, -6)` (tilt plus a 6 px lift). 768 touch (`hasTouch`, `isMobile`): `none`. Reduced motion with a mouse: `none`. **Pass.** |
| E11 | Cleanup on unmount and route change (`$A/cleanup.cjs`, `$A/tilt.cjs`) | 1280. Scroll mid-tour (pinned), click the header "Entrar" (SPA), scroll, Back, scroll the whole page. Three SPA round trips per context | On `/entrar`: **0 pin spacers**, `html` and `body` `style` empty (the `scroll-behavior` that ScrollTrigger adds is removed), only the 4 static backdrop styles under `#root`, page height 800. After Back: 2 pin spacers (not 4), and the same 117 styled nodes as a fresh load. After 3 round trips: still 2. The only text at opacity 0 is the 4 inactive tour steps (expected in the stage). No console errors or warnings. GSAP is not exposed on `window`, so the instance count is inferred from the spacers and the inline styles. **Pass.** |
| E12 | AC6 reduced motion | `reducedMotion: 'reduce'`, 8 runs | 0 pin spacers, **0** inline transform or opacity styles under `main`, 0 text nodes at opacity 0, and every counter at its final value (R$ 7.063,97, 187,90, 93,95, 1.928,60, 100,01, 50,00, 50,01, +93,95). There is no CSS rule that hides content: the only `opacity-0` classes are the inactive split thumbs and the flash layer, which are hidden in their final state too. From-states are set only inside the `no-preference` matchMedia branches. **Pass.** |
| E13 | AC7 responsive (`$A/landing.cjs`) | 360, 390, 768 and 1280, light and dark, motion and reduced, 16 runs, scanned every half viewport | **0 issues**: no page horizontal scroll, no element outside the viewport, no clipped `.num`. Screenshots checked by eye: no overlap, readable in both themes. |
| E14 | AC7 accessibility | DOM | Headings in order (h1, h2, h3, h4 only under "Próximos passos"). The 5 `[data-motion="device"]` have `aria-hidden="true"`, with a `figcaption.sr-only` that carries the numbers. Why visuals, backdrops, the roadmap line and icons are `aria-hidden`. New text pairs: `hero-text/72` on `#0b0b0c` about 9.8:1, `accent` on the hero 11.8:1, and `muted`/`text` on tokens already validated. The automated text scan (`$A/contrast.cjs`) only flagged false positives (unparsed `oklab` colors and absolutely positioned backgrounds), and the screenshots confirm them. **Pass.** |
| E15 | AC8 bundle | `npm run build` now vs `6e4ba39` (built from `git archive` in `$A/base`) | GSAP and ScrollTrigger are only in `LandingScreen-*.js`. Landing chunk **61.08 kB gzip** (was 51.42 kB), under 200 kB. App `index-*.js` 117.06 kB gzip (was 116.26 kB): the +0.8 kB is `UserMenu`, not GSAP. See i1. **Pass.** |
| E16 | AC9 copy | `rg "[—–·→…]" frontend/src`, emoji range scan, reading every string | Dash scan empty. Emoji only in two code comments (`lib/text.ts:23`, `ui/Avatar.tsx:28`), not UI. The pt-BR reads natural and professional, with no AI tells. **Pass.** |
| E17 | Docs | `context.md`, `repository-structure.md`, `tasks.md` | `context.md` and the `landing/` line match the code. `plan.md`'s file list is stale (n3). |

## Findings

### Major

**M1. The Novo gasto replica shows "R$ R$ 187,90".**
- **Where.** `frontend/src/app/landing/FeatureScreens.tsx:66-67`. A literal `<span>R$</span>` is followed by `<Amount>`, and `formatBRL` already returns `"R$ 187,90"`.
- **Evidence.** It is visible in every theme and viewport, on the first feature screen of the tour, and it repeats during the count-up as "R$ R$ 164,41" (`$A/shots/rm-claro-1280-full-part0.png`, `$A/shots/mt-1280.png`). The real `MoneyField` shows a small "R$" prefix and digits only (`ui/MoneyField.tsx:58`).
- **Why major.** AC4 asks for faithful replicas, and the section says the screens are shown "do jeito que aparecem no app". It is the most visible money value on the landing, in a money-precision pitch.
- **Fix.** Either change closes it:
  - Drop the `R$` span and keep `Amount` as is (simplest).
  - Keep the prefix and render digits only. That needs a digits-only variant of `Amount` and of `moneyWriter` in `screenMotion.ts`, so the count-up does not add "R$" back.

### Minor

**m1. While the cents example counts up, its "Soma" row contradicts the card.**
- **Where.** `WhyDifferent.tsx:248-263`. Total, Parte da Ana and Sua parte count from 0, but Soma is static at R$ 100,01.
- **Evidence.** Mid-tween the card reads Total R$ 67,79, Ana R$ 26,78, você R$ 17,83, Soma R$ 100,01 (`$A/shots/m-escuro-360.png`, second row). The card's own claim is "a soma sempre fecha".
- **Fix.** Either change closes it:
  - Do not count this card. Reveal its rows instead, for example by dropping `from={0}`.
  - Count only the two parts and derive Total and Soma from them on every frame.

### Nits

- **n1. The inset ring comment does not hold.**
  - **Where.** `UserMenu.tsx:25-30`. `focus-visible:-outline-offset-2` loses to `focusRing`'s `focus-visible:outline-offset-2`, so the computed offset is `2px`, not `-2px`.
  - **Impact.** The ring still fits inside the 6 px popover padding and passes contrast (E5).
  - **Fix.** Remove the dead class and the comment, or build `ITEM_CLASS` without `focusRing`, so that the negative offset applies.
- **n2. The "Proposta" tag is below the type floor.** It is `text-[11px]` (`StartupSection.tsx:57`), and the design language says never below 12 px. Fix: use `text-xs`.
- **n3. Docs are slightly stale.**
  - `plan.md` "Files" does not list `LandingParts.tsx` and `screenMotion.ts`, and does not say that `FeatureGrid.tsx` was removed.
  - `.claude/skills/splitpay-design-language/references/components.md:139` still suggests a "Projeto FIAP" strip, against the intent of AC3.
- **n4. One why-card row reads as part of the janta bill.** In `WhyDifferent.tsx:309`, "Já acertamos com Carlos R$ 0,00" sits under the janta paid with Ana. Consider "Já acertamos com Carlos, saldo sem mudança", without the R$ 0,00 amount.

### Informational

- **i1. Bundle growth.** The app chunk grew by 0.8 kB gzip (the user menu, required by AC2). The shared CSS grew by 0.6 kB gzip, because Tailwind emits the landing classes into the single stylesheet. GSAP is absent from the app chunk, so AC8's intent holds.
- **i2. Desktop trigger name.** The desktop avatar shows initials ("AN"), and its name is "Ana, menu do usuário". This is the same pattern as the avatar before 016.
- **i3. Tour replays.** In the pinned tour, a screen's animation replays each time its step becomes active again (scrolling back). This is by design.

## Verdict

**CHANGES REQUIRED.** Open items:
- **M1** (duplicated "R$" in the Novo gasto replica);
- **m1** (transient sum mismatch in the cents example);
- the nits **n1 to n4**.

Every other acceptance criterion passed with evidence:
- AC1 to AC3;
- AC4, apart from M1;
- AC5 to AC9;
- the AC10 build and pytest.

After the fixes, re-run `npm run build`, the dash scan and `$A/landing.cjs`, and look at the split screen in `$A/tour.cjs`.

## Closing audit

Date: 2026-10-31 | Branch: `feature/mvp-plan` at `2112a8f` ("fix(web): apply 016 audit findings"). The fixes changed 6 files and 8 lines and touched no backend file. The servers were restarted the same way as before (fresh scratch database) and stopped by PID afterwards. Scripts are `$A/fixes.cjs` plus the earlier scripts, re-run.

### Findings

| Finding | Change | Verification | Status |
| --- | --- | --- | --- |
| M1 | The literal `R$` span was removed (`FeatureScreens.tsx:66`) | 1280 light and 390 dark, sampled every 150 ms while the count-up runs: "R$ 49,39", "R$ 111,76", "R$ 173,42" … "R$ 187,90", then "R$ 187,90" when settled. "R$" appears once in every frame. Split shares are R$ 93,95 / R$ 93,95, "Metade para cada um". Screenshots: `$A/shots/fix-split-during-1280.png`, `fix-split-after-1280.png`, `fix-split-during-390.png`, `fix-split-after-390.png` | Closed |
| m1 | `from={0}` was removed from Total and both parts (`WhyDifferent.tsx:100-108`) | Five samples, 150 ms apart, as the card enters: always "Total R$ 100,01, Parte da Ana R$ 50,00, Sua parte R$ 50,01, Soma R$ 100,01". Screenshots: `$A/shots/fix-cents-1280.png`, `fix-cents-390.png` | Closed |
| n1 | The comment now says the ring sits just outside the item (`UserMenu.tsx:25`) | It matches the computed `outline-offset: 2px`. The ring fits the popover padding and passes contrast (E5) | Closed |
| n2 | The tag uses `text-xs` (`StartupSection.tsx:57`) | Both "Proposta" tags compute to `12px` | Closed |
| n3 | The `plan.md` file list was updated, and `components.md:139` was reworded | The plan lists `LandingParts.tsx`, `FeatureScreens.tsx`, `screenMotion.ts` and the other landing files. The trust strip line now says "no academic wording in the UI (spec 016)" | Closed |
| n4 | The row now reads "Uber com Carlos, acertado" | It no longer reads as part of the janta bill. R$ 0,00 stays as the change to the balance (BR 1) | Closed |

### Regression

| Check | Result |
| --- | --- |
| `npm run build` | Clean. Landing chunk 61.05 kB gzip. App `index` 117.06 kB gzip, unchanged. GSAP only in `LandingScreen-*.js`. |
| `rg "[—–·→…]" frontend/src`, academic copy scan | Both empty. |
| User menu, 8 runs (`$A/menu.cjs`) | Same as E4: one trigger per viewport, 44 px. Enter and Space open the menu, the items are 48 px, and Escape returns focus to the trigger. Tab out, an outside click and choosing an item all close it. The items go to `/` and to `/entrar` (name cleared). The popover fits at 360. No errors. |
| Landing scan, 16 runs (`$A/landing.cjs`) | 0 overflow, overlap or clipping issues. Motion: 2 pins from md, 0 below. Reduced motion: 0 pins, 0 inline transform or opacity, 0 hidden text, every value final. No console errors. |
| Tour (`$A/tour.cjs`) | 768 and 1280: pinned stage, 5 steps, then the statement. 1366×650: stacked fallback. Screenshot: `$A/shots/mt2-1280.png`. |
| Cleanup (`$A/cleanup.cjs`, `$A/tilt.cjs`) | On `/entrar`: 0 pin spacers and clean `html`/`body` styles. After Back and after 3 SPA round trips: still 2 pins. Tilt only with a fine pointer. No errors. |

### Verdict

**PASS with nothing open.**
