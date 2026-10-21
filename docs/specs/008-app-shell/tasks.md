# 008 App Shell — Tasks

- [x] T1 — Dependencies, font, theme tokens and helpers | owner: frontend-engineer | files: `frontend/package.json`, `package-lock.json`, `index.html`, `public/favicon.svg`, `src/main.tsx`, `src/styles/theme.css`, `src/lib/money.ts`, `src/lib/storage.ts`, `src/lib/preferences.ts` | verify: `npm run build`; money self-check passes; no theme flash
- [x] T2 — Typed API client for every endpoint | owner: frontend-engineer | files: `src/types/api.ts`, `src/services/api.ts` | verify: `npm run build`
- [x] T3 — UI primitives, brand and states | owner: ui-ux-designer | files: `src/app/components/ui/`, `BrandMark`, `Money`, `HideValuesButton`, `ThemeControl` | verify: build; contrast and focus in both themes
- [x] T4 — Shell, routes, entry page | owner: frontend-engineer | files: `src/app/routes.tsx`, `App.tsx`, `src/app/components/*` | verify: build; layout scan clean; screenshots at 360/390/768/1280, light and dark
- [x] T5 — Docs and skill sync | owner: main session | files: `.claude/skills/splitpay-design-language/SKILL.md`, `docs/development/repository-structure.md`, `git-workflow.md`, `sdd-guide.md` | verify: Phase 2 table and light theme recorded
- [ ] T6 — Audit | owner: auditor | files: `docs/specs/008-app-shell/audit.md` | verify: verdict PASS
