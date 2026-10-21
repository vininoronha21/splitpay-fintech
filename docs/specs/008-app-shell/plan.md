# 008 App Shell — Plan

Status: draft

## Files to Create/Modify

- `frontend/package.json`, `package-lock.json`: add `@fontsource-variable/inter` and `lucide-react`, exact versions published at least two weeks before install.
- `frontend/src/main.tsx`: import the font.
- `frontend/src/styles/theme.css`: `--font-sans` starts with "Inter Variable"; add `--color-warning` only if a screen in this spec needs it (none planned).
- `frontend/src/lib/money.ts` (new): `formatBRL`, `parseBRL`.
- `frontend/src/lib/storage.ts` (new): safe get/set/remove for the name.
- `frontend/src/types/api.ts`: every request and response type.
- `frontend/src/services/api.ts`: one function per endpoint, `JSON` body helper for POST/PATCH.
- `frontend/src/app/routes.tsx`, `App.tsx`: routes, auth guard (redirect without a name), not-found.
- `frontend/src/app/components/` (new files): `AppLayout` (header, `TabBar`, `TopNav`), `LoginScreen`, `ScreenPlaceholder`, `NotFound`, `ui/` primitives (`Button`, `TextField`, `MoneyField`, `Skeleton`, `ErrorState`, `EmptyState`). Remove `HealthStatus` (the login screen now proves the API connection).
- `docs/development/repository-structure.md`: `lib/money.ts`, `lib/storage.ts`, `components/ui/`.
- `docs/development/git-workflow.md` and `sdd-guide.md`: Phase 2 sprint table and feature order (after approval of this spec).

## Architectural & Tech Decisions

- **Auth guard:** a layout route reads the name once and redirects with `<Navigate to="/entrar" replace />`; no context provider, the name is passed through the outlet context.
- **Money parsing:** strip everything but digits and the last comma; split reais and centavos as strings; reject more than two decimals; build cents with integer arithmetic.
- **Responsive shell:** CSS only (`md:` breakpoints) for tab bar vs. top nav; no JS media queries.
- **Verification:** `npm run build`; screenshots at 360, 768 and 1280 px with the pre-installed Chromium against a local API; keyboard-only pass over the login and nav.

## Test Strategy

- No test runner exists in `frontend/`; adding Vitest only for `money.ts` is a dependency decision. Instead `money.ts` gets a small self-check script run with `node --experimental-strip-types` during the audit (cases: 0, 1, 99, 100, 123456, negative, 10^12, "1.234,56", "1234,5", "abc", "-5", "1,234"). If that proves awkward, the auditor may recommend Vitest in a follow-up spec.
- Manual checks per acceptance criterion, with screenshots attached to `audit.md`.

## Risks & Edge Cases

- `localStorage` throws in some private modes: storage wrapper falls back to memory.
- iOS zooms inputs under 16 px: inputs are 16 px.
- The 360 px layout must not scroll horizontally with the longest pt-BR labels.
