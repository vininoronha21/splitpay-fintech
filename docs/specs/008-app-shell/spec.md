# 008 App Shell — Spec

Stories: foundation for US01–US05 screens (fake login, navigation, themes, money display) | Status: draft

## Problem

Phase 1 delivered the API; the frontend is still the 001 scaffold that only calls `/health`. Every Phase 2 screen needs the same base: the visual foundations, a typed client for every endpoint, one money formatter, the fake login (Business Rule 4), and the navigation shell (bottom tab bar on mobile, top nav from `md`). Building that once keeps each later screen spec small.

Vinicius reviewed a clickable prototype of every screen on 2026-10-21 ([canvas](https://claude.ai/artifact/CJYbXDQZJko8PfCn7vXYyP), screenshots in `docs/assets/prototype-*.png`). His decisions change the visual base described by the `splitpay-design-language` skill:

- **Light mode is the default**; dark mode stays available (Claro, Escuro, Automático).
- **Bank-style brand:** a new logo (black roundel, geometric amber S with a diagonal cut) and a clean entry page.
- **Compact screens** in the Nubank/PicPay pattern: key information without scrolling, details on their own screen.
- **Hide values:** an eye button next to the balance masks every amount.
- **Copy:** natural, professional pt-BR with no em or en dashes, no "·" separators and no arrows.
- **Nothing overlaps:** numbers never wrap, long names truncate with an ellipsis.

This spec builds the parts every screen shares. The screen contents stay in 009–012.

### Phase 2 order

| Sprint | Mini sprints | Release on `main` |
| --- | --- | --- |
| 4. App shell and home | `008-app-shell`, `009-home` (US05 cards, US04 charts, "Gastos do mês" screen) | `commit v3.1` |
| 5. Money flows | `010-new-expense` (US01, US02), `011-statement` (US03) | `commit v3.2` |
| 6. Settings and showcase | `012-settings-friends` (US05 adjustments, friends, category rules), `013-landing` (GSAP), `014-pwa` | `commit v4.0` (phase 2 done) |

Phase 3 (deploy and presentation) follows. Each later spec uses its prototype screen as the visual reference.

## Acceptance Criteria

1. **Entry page** at `/entrar` (Business Rule 4), matching `prototype-login.png`:
   - dark top with amber glow, the logo and the "SplitPay" wordmark ("Pay" in accent);
   - a light sheet with the headline "Divida a conta. Receba sua parte de volta.", a name field (1–40 visible characters), the initial balance prefilled from `GET /profile`, and an "Entrar" button;
   - no app preview, fits a 390 × 844 screen without scrolling.

   Submitting saves the name in `localStorage` and, only if the balance changed, sends `PATCH /profile`. API errors appear under the field in pt-BR. Any app route without a saved name redirects to `/entrar`; "Sair" in Configurações clears the name.
2. **Navigation shell:** below `md`, a fixed bottom tab bar with Início, Extrato, Amigos, Configurações (icon plus label, `aria-current="page"` on the active one, safe-area padding). From `md`, a top nav with the logo, the same four links, a primary "Novo gasto" button and the user's initials. Content never sits under the bar.
3. **Routes:** `/entrar`, `/inicio`, `/gastos-do-mes`, `/extrato`, `/amigos`, `/configuracoes`, `/novo-gasto`. Until their own specs land, screens show only their title. `/` redirects to `/inicio` (to the landing page once 013 exists). Unknown paths show a pt-BR not-found screen with a link to Início.
4. **Themes:**
   - light is the default; Configurações has an "Aparência" control with Claro, Escuro and Automático (follows `prefers-color-scheme`);
   - the choice persists in `localStorage` (`splitpay.theme`) and applies before first paint, so the page never flashes the wrong theme;
   - both themes use the tokens in Data Rules, and every text pair passes WCAG AA.
5. **Brand:** a `BrandMark` SVG component (the logo) used on the entry page and in the top nav, and the same mark as `favicon.svg`.
6. **Hide values:** a shared setting (`localStorage` key `splitpay.hideValues`) and a `Money` component that renders `formatBRL(cents)` or `R$ ••••` when hidden. The eye button component switches between eye and eye-off icons and has an accessible name ("Ocultar valores" / "Mostrar valores"). Início (009) places it next to the balance; every amount in the app goes through `Money`.
7. **Typed API client:** `services/api.ts` exposes one typed function per Phase 1 endpoint, and `types/api.ts` mirrors every response and request schema (strict TypeScript, no `any`). Screens never call `fetch`.
8. **Money helpers** in `lib/money.ts`: `formatBRL(cents)` gives `R$ 1.234,56`, with `−R$` (U+2212) for negatives; `parseBRL(text)` turns "1.234,56", "1234,5" or "1234" into integer cents, or returns null for invalid or negative input. No floats touch money: parsing works on the digit string.
9. **Shared UI:** a loading skeleton, an error card with "Tentar novamente", and an empty state. Primitives:
   - Button (primary, ghost);
   - TextField, MoneyField;
   - Card;
   - segmented control, chip, status pill;
   - avatar with initials.
10. **Layout safety:**
    - amounts never wrap (`white-space: nowrap`, tabular numbers), and names and descriptions truncate with an ellipsis;
    - no horizontal scroll at 360 px;
    - checked with a scripted overlap scan plus screenshots at 360, 390, 768 and 1280 px in both themes.
11. **Accessibility and motion:**
    - visible focus ring on every interactive element;
    - 44 px touch targets and 48 px inputs (16 px text);
    - `prefers-reduced-motion` respected.
12. **Copy:** UI text in pt-BR, natural and professional; no em dash, en dash, "·" separator or arrow character in any visible string.
13. `npm run build` passes with strict TypeScript.

## Data Rules

- The name lives only in `localStorage` (`splitpay.name`). Theme and hide-values preferences also live in `localStorage`. All access is wrapped in try/catch with an in-memory fallback, and none of it reaches the API.
- The initial balance is integer cents; the field shows it with `formatBRL` and parses with `parseBRL`.
- **Color tokens.** Components use tokens only, never hex.

  | Token | Light (default) | Dark |
  | --- | --- | --- |
  | `bg` | `#f4f4f5` | `#0b0b0c` |
  | `surface` | `#ffffff` | `#18181b` |
  | `border`, `track` | `#e4e4e7` | `#27272a` |
  | `text` | `#18181b` | `#fafafa` |
  | `muted` | `#52525b` | `#a1a1aa` |
  | `accent` (fills) / `on-accent` | `#fbbf24` / `#111111` | same |
  | `accent-text` (amber text, links) | `#b45309` | `#fbbf24` |
  | `accent-soft` / `accent-soft-text` | `#fef3c7` / `#92400e` | amber 14% / `#fbbf24` |
  | `success` / `success-soft` / `success-soft-text` | `#15803d` / `#dcfce7` / `#166534` | `#22c55e` / green 14% / `#4ade80` |
  | `danger` / `danger-soft` | `#b91c1c` / `#fee2e2` | `#f87171` / red 14% |
  | `neutral-soft` / `neutral-soft-text` | `#f4f4f5` / `#52525b` | `#27272a` / `#d4d4d8` |
  | `chart-1` … `chart-6` | `#eda100 #6250d6 #1baf7a #eb6834 #2a78d6 #e87ba4` | `#c98500 #9085e9 #199e70 #d95926 #3987e5 #d55181` |

- The chart palette passed a colorblind-safety validator (adjacent pairs, both themes). It excludes green and red because those mean received and debit. Category order is fixed by category, never by rank.

## API Contract

No backend change. The client covers: `/health`, `/profile`, `/balance`, `/balance/adjustments`, `/budget`, `/friends`, `/transactions`, `/transactions/{id}`, `/categories`, `/categories/suggest`, `/categories/rules`, `/reimbursements`, `/reimbursements/summary`, `/reimbursements/{id}`, `/dashboard/charts`.

## Out of Scope

- The content of Início, Gastos do mês, Extrato, Amigos, Configurações (beyond Aparência and Sair) and Novo gasto (009–012).
- The landing page and GSAP (013), the PWA manifest and service worker (014).
- Real authentication (Business Rule 17 and `goal.md`).

## Decisions

| Decision | Why | Rejected |
| --- | --- | --- |
| Light theme as default, dark selectable | Vinicius's call after the prototype review: light reads as a mainstream bank app. Dark stays for preference and night use, from the same tokens. | Dark only (the skill's original identity): rejected by the product owner. Light only: drops a mode that already exists and costs little to keep. |
| Theme via CSS variables swapped by `data-theme` on `<html>`, set by a tiny inline script before paint | Tailwind utilities keep one class per token; no flash of the wrong theme on reload. | Tailwind `dark:` variants on every class: doubles class lists. Setting the theme in React only: flashes light before dark. |
| Amber text uses a darker step (`#b45309`) in light mode | Amber `#fbbf24` on white is 1.7:1 and fails WCAG; `#b45309` is 5.0:1. Fills stay `#fbbf24` with dark text (11.3:1). | Amber text everywhere: unreadable. Switching the brand color: breaks the identity. |
| Validated categorical chart palette instead of amber shades | Vinicius asked for a more distinguishable chart; six amber shades blur together, especially for colorblind readers. | Amber shades: hard to tell apart. Random hues: not checked for colorblindness. |
| Load Inter from a self-hosted package (`@fontsource-variable/inter`, pinned) | The type scale assumes Inter, and a self-hosted font keeps working offline once the PWA lands. | Google Fonts link: an extra origin that fails offline. System fonts: weights differ between iOS and Android. |
| Icons from `lucide-react` (pinned) | Tab bar, pills, eye toggle and buttons need consistent icons; imports are tree-shaken. | Hand-drawn SVGs: more code to keep consistent. The logo is the one hand-drawn SVG. |
| Hand-written types mirroring the Pydantic schemas | Matches `repository-structure.md`; the backend schemas are already covered by 743 tests. | Runtime validation (zod): duplicates the backend's validation. OpenAPI codegen: an extra build step for 15 endpoints. |
| Skill conflicts resolved in favor of `goal.md`, `context.md` and Vinicius's review | The skill never overrides them. Status pills map to the real statuses: "Aguardando reembolso" (`em_aberto`, accent-soft), "Pago" (success-soft), "Acertado" (neutral-soft). No "Em atraso" pill, no "Lembrar" button, single-select friend picker (Business Rules 1, 6, 11). The skill gets a light-theme section in this spec so later screens follow the new base. | Copying the skill's example labels: shows features that do not exist. |
