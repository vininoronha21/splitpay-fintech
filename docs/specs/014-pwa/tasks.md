# 014 PWA (prototype) — Tasks

- [ ] T1 — Manifest, icons and iOS meta | owner: frontend-engineer | files: `public/manifest.webmanifest`, `public/icons/*`, `index.html` | verify: build copies them; fields and icon sizes match; no service worker
- [ ] T2 — Offline banner and install card | owner: frontend-engineer | files: `src/lib/online.ts`, `OfflineBanner.tsx`, `InstallCard.tsx`, `AppLayout.tsx`, `SettingsScreen.tsx` | verify: build; offline flow and inert install button in Playwright; layout scan clean
- [ ] T3 — Visual review | owner: ui-ux-designer | files: components from T2 and the icons (polish only) | verify: icons crisp and maskable-safe; banner and card match the skill in both themes
- [ ] T4 — Docs sync | owner: main session | files: `docs/development/repository-structure.md`, `docs/context.md`, `docs/goal.md` | verify: new files and the prototype scope recorded
- [ ] T5 — Audit | owner: auditor | files: `docs/specs/014-pwa/audit.md` | verify: verdict PASS
