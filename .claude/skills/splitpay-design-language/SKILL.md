---
name: splitpay-design-language
description: Complete SplitPay UI design language. Light theme by default with a dark option, amber brand (`frontend/src/styles/theme.css`, approved prototype `docs/assets/prototype-*.png`), extended with structure, components, type scale, chart patterns, accessibility and motion distilled from two Figma community fintech files. Use for ANY SplitPay UI work: Tailwind tokens, landing page, dashboard, extrato, forms, buttons, cards, badges, status pills, charts, bottom navigation, typography, spacing, responsive layout, PWA look, GSAP motion, contrast and accessibility review, even if the user never mentions Figma or "design system".
---

# SplitPay Design Language

Visual rules only. This skill never adds features, endpoints or copy, and never overrides `docs/goal.md`. It complements the `ui-ux-designer` agent: mobile-first, native-banking-app feel, light theme by default (dark selectable) with an amber accent, installable PWA.

## Source of truth order

1. `frontend/src/styles/theme.css` and the approved prototype captures in `docs/assets/prototype-*.png` (reviewed by Vinicius on 2026-10-21, spec 008). They are the identity: light surfaces by default, near-black in dark mode, amber accent `#fbbf24`, bank-style logo. The older `tela_*.png` captures are superseded where they disagree.
2. This skill: how to extend that identity consistently.
3. The Figma files: inspiration for structure and patterns, never a palette to import. Details and exact values in `references/figma-sources.md`.

If Figma and the existing theme disagree, the theme wins. Do not replace tokens that already exist.

## Decision: Figma palette is mapped, not adopted

The landing page file is dark teal + lime (`#e2ff54`) and the case-study file is blue/orange. SplitPay is near-black + amber. Importing either palette would fork the identity and break the screens already approved. So the Figma roles map onto existing tokens:

| Figma role | Figma value | SplitPay token |
| --- | --- | --- |
| Page background | `#001229` / `#001027` | `bg` `#0b0b0c` |
| Card / panel | `#004852`, `#f6f9f8` | `surface` `#18181b` |
| Hairline | `#e5e5e5`, `rgba(0,0,0,.06)` | `border` `#27272a` |
| Highlight word, key stat, primary CTA | lime `#e2ff54`, green `#00b512` | `accent` `#fbbf24` (text on it: `on-accent`) |
| Body text on dark | `#f9fafb` | `text` |
| Secondary text | `#dcdcdc`, `#a7a7a7` | `muted` |
| Success / money in / paid | `#33b469` | `success` |
| Error / money out / overdue | `#ed3a3a` | `danger` |
| Warning | `#ebbc2e` | new `--color-warning` when a screen needs it |
| Info | `#2f80ed` | new `--color-info` when a screen needs it |

Add a token to `theme.css` only when a screen needs it and no existing token fits, with a one-line comment. Never hardcode hex values in components.

## Themes (spec 008)

Light is the default; dark is selectable in Configurações (Claro, Escuro, Automático). Both come from the same token names, so components never branch on theme. Values are in `docs/specs/008-app-shell/spec.md` (Data Rules). Rules that matter when building:

- **Amber fills, darker amber text.** `accent` (`#fbbf24`) is for fills with `on-accent` text. Amber used as text or links in light mode is `accent-text` (`#b45309`, 5.0:1 on white); plain amber text on white is 1.7:1 and fails.
- **Status pills** use `*-soft` fills with `*-soft-text`: "Aguardando reembolso" accent-soft, "Pago" success-soft, "Acertado" neutral-soft.
- **Charts** use `chart-1` to `chart-6`, a categorical palette validated for colorblind readers in both themes. Never amber shades for categories, never green or red (they mean received and debit). Color follows the category, not its rank.
- **Light elevation:** a 1 px `border` plus a very soft shadow on cards; dark keeps border only.

## Brand

- **Logo** (`BrandMark`): black roundel, geometric amber S built from two three-quarter bowls with butt caps, and a short diagonal cut at the center (the "split"). Wordmark "SplitPay" in 800 weight, tight tracking; on dark backgrounds "Pay" is amber.
- **Entry page:** dark top with amber glow and a faint grid, large logo and wordmark, then a light sheet with the headline, name, initial balance and the amber "Entrar" button. No app preview.

## Screen patterns (from the prototype review)

- **Compact, bank-style screens** (Nubank/PicPay): the key numbers sit above the fold, and details open on their own screen.
- **Início** has these parts:
  - an amber header with the greeting, the balance and the eye button beside it;
  - a row of four shortcuts;
  - compact cards for the month's budget, the amount to receive, the top three categories and the latest entries.
- **Hide values:** every amount renders through the shared `Money` component, which shows `R$ ••••` while the eye is off.
- **Layout safety:** amounts never wrap (`.num`), and names and descriptions truncate with an ellipsis. Run an overlap and overflow scan at 360, 390, 768 and 1280 px in both themes before calling a screen done.
- **Copy:** natural, professional pt-BR. No em dash, en dash, "·" separator or arrow characters in UI strings; use commas or line breaks (e.g. "Transporte, 20 out").

## Foundations

**Type.** Keep `font-sans` (Inter stack from `theme.css`). It is declared but, at the time of writing, not loaded by `frontend/index.html`: loading it, or switching to Poppins as the Figma landing does, is a dependency decision for the feature's `plan.md`, not a styling detail. The scale and weights come from the Figma style guide:

| Role | px | Weight | Where |
| --- | --- | --- | --- |
| Display 1 / 2 | 64 / 56 | 900 / 800 | landing hero only, at `lg` and up |
| H1 / H2 | 48 / 40 | 700 | landing section titles, hero balance on desktop |
| H3 / H4 | 32 / 28 | 700 | page titles (desktop), big amounts |
| H5 / H6 | 24 / 20 | 700 | page titles (mobile), card titles |
| Subtitle 1 / 2 | 18 / 16 | 500 / 400 | lead text, list primary line |
| Body 1 / 2 | 16 / 14 | 400 | paragraphs, secondary lines |
| Button 1 / 2 | 16 / 14 | 500 | buttons |
| Caption | 12 | 400 | dates, helper text, chart ticks |

On mobile use H5 for screen titles and never go below 12 px. Money, balances, percentages and chart values use `tabular-nums`. Display headings may be uppercase with `tracking-[0.04em]`, as in the Figma hero; app screens use sentence case in pt-BR.

**Shape.** Large cards `rounded-[20px]`, nested or floating cards `rounded-2xl`, inputs and chips `rounded-xl`, pills and avatars `rounded-full`. Primary landing buttons `rounded-[44px]`.

**Spacing.** 4 px base. Card padding 20 to 24 px, gap between cards 12 px (mobile) to 24 px (desktop). Screen gutter 16 px on mobile. Landing sections: 64 px vertical padding on mobile, 120 px on desktop, 40 to 60 px between heading and content, content max width 1140 px.

**Elevation.** Dark UI relies on surface contrast plus a 1 px `border`, not shadows; light UI adds a very soft card shadow. Reserve shadow for floating chips and the primary amber button: `shadow-[0_3px_13px_rgba(251,191,36,.18)]` (adapted from the Figma `s1` effect `0 3 13`).

**Layout.** The reference screens are desktop captures (top nav, 3-column cards). Re-flow them: single column from 360 px, stat cards as a horizontal snap row or 1 column, tables become stacked list rows, and the 4 top-level destinations (Início, Extrato, Amigos, Configurações) become a bottom tab bar (the Figma IA also has exactly 4 top-level items). Verify at 360, 768 and 1280 px.

## Components

Recipes with Tailwind classes, anatomy and states are in `references/components.md`. Catalog:

- **Balance hero card** (amber fill, dark text, budget progress bar). Existing, keep.
- **Stat card** with icon chip and delta line. Existing, keep.
- **Segmented control** (Semanal / Mensal / Anual) for US04 period filters.
- **Chart card** (donut by category, bars by period), from the Figma "Saving Month" chart: muted bars, active bar accent plus floating value chip, 1 px grid, caption ticks.
- **Transaction row**: initials avatar, title, meta line, signed amount.
- **Status pill** (Aguardando reembolso, Pago, Acertado) with icon and tinted fill. No "Em atraso" (out of scope).
- **Form field** with uppercase label, focus ring in `accent`, large money input.
- **Category chip** group (single select).
- **Timeline** for adjustment history.
- **Bottom tab bar** with safe-area padding.
- **Landing blocks**: hero with grid background, pill eyebrow, CTA with circular arrow, bento feature grid, vertical step list, testimonial trio, footer.

Before creating any of these, check `frontend/src/app/components/` for an existing one and reuse it.

## Accessibility

Contrast was calculated (WCAG 2.x) for the dark tokens below; the light tokens in spec 008 were checked the same way (all text pairs pass AA, e.g. `muted` 7.6:1, `accent-text` 5.0:1, `danger` 6.5:1 on white):

| Pair | Ratio | Verdict |
| --- | --- | --- |
| `text` on `surface` | 16.97 | pass |
| `muted` on `surface` / `bg` | 6.91 / 7.68 | pass |
| `accent` on `bg` / `surface` | 11.79 / 10.61 | pass |
| `on-accent` on `accent` | 11.31 | pass |
| `success` on `surface` | 7.78 | pass |
| `danger` on `surface` / `bg` | 4.71 / 5.23 | pass, barely |
| `info` (`#2f80ed`) on `surface` | 4.58 | pass, barely |
| zinc-500 `#71717a` on `surface` | 3.67 | fail for text |
| zinc-600 `#52525b` on `surface` | 2.29 | fail |
| `text` on `danger` / `info` fill | 3.61 / 3.70 | fail below 18.66 px bold |

Rules that follow:

- Informational text uses `text` or `muted`. Dimmer grays only for decoration or disabled controls. The helper text on `tela_configs_financeiras` looks dimmer than `muted`: do not copy it.
- Status pills use a tinted background (`color/15`) with colored text and an icon, never white text on a solid red or blue fill.
- Never encode status by color alone: pair it with an icon and a label (the Extrato pills already do).
- Visible focus ring on every interactive element: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`.
- Touch targets at least 44 x 44 px. Inputs 48 px high.
- Honor `prefers-reduced-motion` (see `references/motion.md`).
- Bottom bar and sticky footers respect `env(safe-area-inset-bottom)`. PWA `theme_color` and `background_color` follow the active theme `bg` (`#f4f4f5` light, `#0b0b0c` dark).
- Every icon-only button has an `aria-label` in pt-BR. Charts expose their numbers as text or a table, not only as graphics.

## Money display rules

Amounts are integer cents end to end. Format only through `formatBRL` in `frontend/src/lib/money.ts`, rendered by the `Money` component (which also honors hide values); never `toFixed` on floats. Outflows `−R$ 210,00` in `text`, inflows `+R$ 87,50` in `success`, amounts to receive in `accent-text`. Keep a minus sign (`−`), not only color.

## Scope guard

The Figma IA lists Cards, Top up, Convert, Transfer, Payment, Referral and ATM centres, and the landing mentions crypto, loans and 30+ currencies. All out of scope (1-to-1 splits only, no real payments). Take visuals only. Figma copy is template residue (medical text, reversed e-mail, "Glose", "Design Monks"): never reuse it. UI copy and seed data are pt-BR.

## Applying this skill

1. Read `theme.css` and the relevant `docs/assets/prototype-*.png`.
2. Confirm the task sits inside an approved spec in `docs/specs/NNN-<feature>/`. Styling work still follows the SDD flow.
3. Reuse an existing component, or build from `references/components.md`.
4. Use tokens only. Build at 360 px first.
5. Add motion last, from `references/motion.md`. GSAP is not in `package.json` yet: adding it needs the problem it solves and a pinned version in `plan.md`.
6. Run `npm run build` in `frontend/` (strict TypeScript), check contrast for any new color pair in both themes, and run the overlap scan.
7. Explain each non-trivial visual choice as what, why and the simpler alternative rejected, so it can be repeated in the presentation.

## Known defects in the Figma sources

Do not copy these. Full list in `references/figma-sources.md`.

- Case-study color swatches are labeled `#9412ED` and `#6BED12`, but the actual fills are `#006cec` (blue) and `#ec8000` (orange). The labels are stale.
- White-ish text on the `#00b512` button is 2.64:1. A 12 px gray label on white is 2.46:1.
- The type table has a typo ("6456px", meaning 56 px).
- Several landing fonts are not on Google Fonts (Integral CF, Helvetica Neue Extended, Clash Grotesk). Check licensing before any use.
- The shared link nodes are a page (`179:6278`) and a connector line (`489:2957`), not screens.
