# 008 App Shell — Spec

Stories: foundation for US01–US05 screens (fake login, navigation, money display) | Status: draft

## Problem

Phase 1 delivered the API; the frontend is still the 001 scaffold that only calls `/health`. Every Phase 2 screen needs the same base: the visual foundations of the `splitpay-design-language` skill (`.claude/skills/splitpay-design-language/`), a typed client for every endpoint, one money formatter, the fake login (Business Rule 4), and the navigation shell (bottom tab bar on mobile, top nav from `md`). Building that once keeps each later screen spec small.

### Phase 2 order (proposed)

| Sprint | Mini sprints | Release on `main` |
| --- | --- | --- |
| 4. App shell and home | `008-app-shell`, `009-home` (US05 cards, US04 charts) | `commit v3.1` |
| 5. Money flows | `010-new-expense` (US01, US02), `011-statement` (US03) | `commit v3.2` |
| 6. Settings and showcase | `012-settings-friends` (US05 adjustments, friends), `013-landing` (GSAP), `014-pwa` | `commit v4.0` (phase 2 done) |

Phase 3 (deploy and presentation) follows.

## Acceptance Criteria

1. **Fake login** at `/entrar` (Business Rule 4): a name field (1–40 visible characters) and the initial balance prefilled from `GET /profile`. Submitting saves the name in `localStorage` and, only if the balance changed, sends `PATCH /profile`. API errors appear under the field in pt-BR. Any app route without a saved name redirects to `/entrar`; "Sair" in Configurações clears the name.
2. **Navigation shell:** below `md`, a fixed bottom tab bar with Início, Extrato, Amigos, Configurações (icon plus label, `aria-current="page"` on the active one, safe-area padding); from `md`, a top nav with logo, the same four links and a primary "Novo gasto" button. On mobile "Novo gasto" is a header button, not a fifth tab. Content never sits under the bar.
3. **Routes:** `/entrar`, `/inicio`, `/extrato`, `/amigos`, `/configuracoes`, `/novo-gasto`. Until their own specs land, the four screens show only their title and the greeting "Olá, {nome}". `/` redirects to `/inicio` (to the landing page once 013 exists). Unknown paths show a pt-BR not-found screen with a link to Início.
4. **Typed API client:** `services/api.ts` exposes one typed function per Phase 1 endpoint, and `types/api.ts` mirrors every response and request schema (strict TypeScript, no `any`). Screens never call `fetch`.
5. **Money helpers** in `lib/money.ts`: `formatBRL(cents)` gives `R$ 1.234,56`, with `−R$` (U+2212) for negatives; `parseBRL(text)` turns "1.234,56", "1234,5" or "1234" into integer cents, or returns null for invalid or negative input. No floats touch money: parsing works on the digit string.
6. **Shared UI states:** a loading skeleton, an error card with "Tentar novamente", and an empty state, styled per the skill's state checklist, used by the login screen.
7. **Design foundations from the skill:** tokens only (no hex in components), Inter actually loaded, type scale and radii as listed, visible amber focus ring on every interactive element, 44 px touch targets, 48 px inputs, `prefers-reduced-motion` respected. Verified at 360, 768 and 1280 px.
8. `npm run build` passes with strict TypeScript.

## Data Rules

- The name lives only in `localStorage` (key `splitpay.name`), wrapped in try/catch so private browsing still works for the session. It never reaches the API.
- The initial balance is integer cents; the field shows it with `formatBRL` and parses with `parseBRL`.

## API Contract

No backend change. The client covers: `/health`, `/profile`, `/balance`, `/balance/adjustments`, `/budget`, `/friends`, `/transactions`, `/transactions/{id}`, `/categories`, `/categories/suggest`, `/categories/rules`, `/reimbursements`, `/reimbursements/summary`, `/reimbursements/{id}`, `/dashboard/charts`.

## Out of Scope

- The content of Início, Extrato, Amigos, Configurações and Novo gasto (009–012), the landing page and GSAP (013), the PWA manifest and service worker (014).
- Real authentication (Business Rule 17 and `goal.md`).

## Decisions

| Decision | Why | Rejected |
| --- | --- | --- |
| Load Inter from a self-hosted package (`@fontsource-variable/inter`, pinned) | The skill's type scale assumes Inter, and a self-hosted font keeps working offline once the PWA lands. | Google Fonts link: an extra origin that fails offline. System fonts only: weights and widths differ between iOS and Android. |
| Icons from `lucide-react` (pinned) | Tab bar, status pills and buttons need consistent icons; imports are tree-shaken, so only used icons ship. | Hand-drawn SVGs: more code to keep consistent. |
| Hand-written types mirroring the Pydantic schemas | Matches `repository-structure.md`; the backend schemas are already covered by 743 tests. | Runtime validation (zod): a new dependency that duplicates the backend's validation. Generating types from OpenAPI: an extra build step for 15 endpoints. |
| Skill conflicts resolved in favor of `goal.md` and `context.md` | The skill says it never overrides them. Status pills map to the real statuses: "Aguardando reembolso" (`em_aberto`, amber), "Pago" (`success`), "Acertado" (`muted`). No "Em atraso" pill, no "Lembrar" button, friend picker is single select, no "N pessoas" meta (Business Rules 1, 6, 11). | Copying the skill's example labels: shows features that do not exist. |
