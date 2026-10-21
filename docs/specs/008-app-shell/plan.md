# 008 App Shell — Plan

Status: draft

## Files to Create/Modify

- `frontend/package.json`, `package-lock.json`: add `@fontsource-variable/inter` and `lucide-react`, exact versions published at least two weeks before install.
- `frontend/index.html`: inline theme script (reads `splitpay.theme`, sets `data-theme` on `<html>` before paint), `favicon.svg`, `theme-color` meta for both schemes.
- `frontend/public/favicon.svg` (new): the logo.
- `frontend/src/main.tsx`: import the font.
- `frontend/src/styles/theme.css`: light tokens as the defaults in `@theme`, dark overrides under `:root[data-theme="dark"]`; new tokens from the spec's Data Rules; `--font-sans` starts with "Inter Variable"; `color-scheme` per theme; shared `.num` (tabular, nowrap) utility.
- `frontend/src/lib/money.ts` (new): `formatBRL`, `parseBRL`.
- `frontend/src/lib/storage.ts` (new): safe get/set/remove with in-memory fallback.
- `frontend/src/lib/preferences.ts` (new): theme (`claro | escuro | automatico`) and hide-values state, a small `useSyncExternalStore` hook so every screen updates together.
- `frontend/src/types/api.ts`: every request and response type.
- `frontend/src/services/api.ts`: one function per endpoint, JSON body helper for POST/PATCH.
- `frontend/src/app/routes.tsx`, `App.tsx`: routes, auth guard (redirect without a name), not-found.
- `frontend/src/app/components/` (new files):
  - `AppLayout`, with `TabBar` and `TopNav`;
  - `LoginScreen`, `ScreenPlaceholder`, `NotFound`;
  - `BrandMark` (logo SVG), `Money`, `HideValuesButton`, `ThemeControl` (Aparência);
  - `ui/` primitives: `Button`, `TextField`, `MoneyField`, `Card`, `Segmented`, `Chip`, `StatusPill`, `Avatar`, `Skeleton`, `ErrorState`, `EmptyState`.

  Remove `HealthStatus`: the login screen now proves the API connection.
- `.claude/skills/splitpay-design-language/SKILL.md`: add the light theme, new tokens, logo, hide-values pattern, chart palette and copy rules. Mark `docs/assets/prototype-*.png` as the approved identity, replacing `tela_*.png`.
- `docs/development/repository-structure.md`: `lib/`, `components/ui/`, `public/`.
- `docs/development/git-workflow.md` and `sdd-guide.md`: Phase 2 sprint table.

## Architectural & Tech Decisions

- **Tokens:** Tailwind 4 reads `--color-*` from `@theme`; redefining the same variables under `[data-theme="dark"]` swaps every utility at once. "Automático" removes the attribute override and lets a `prefers-color-scheme: dark` media block apply the dark values.
- **Hide values:** one boolean in `preferences.ts`; `Money` reads it, so no screen needs its own masking logic.
- **Auth guard:** a layout route reads the name once and redirects with `<Navigate to="/entrar" replace />`; the name is passed through the outlet context.
- **Money parsing:** strip everything but digits and the last comma; split reais and centavos as strings; reject more than two decimals; build cents with integer arithmetic.
- **Responsive shell:** CSS only (`md:` breakpoints) for tab bar vs. top nav.

## Test Strategy

- `money.ts` gets a self-check script run with `node --experimental-strip-types` during the audit (cases: 0, 1, 99, 100, 123456, negative, 10^12, "1.234,56", "1234,5", "abc", "-5", "1,234").
- Layout scan: the auditor runs a scripted overlap and overflow check with the pre-installed Chromium (kept outside the repo, so no new dependency) on every route at the four widths in both themes; it must report zero issues.
- Contrast: every token text pair checked against WCAG AA (values already verified in the prototype).
- Copy scan: `rg "[—–·→]" frontend/src` returns nothing.
- Manual checks per acceptance criterion, with screenshots attached to `audit.md`.

## Risks & Edge Cases

- `localStorage` throws in some private modes: storage falls back to memory.
- iOS zooms inputs under 16 px: inputs are 16 px.
- Theme flash on reload: prevented by the inline script; verified by loading with dark saved.
- Long friend names or descriptions: truncate with ellipsis; amounts never truncate.
