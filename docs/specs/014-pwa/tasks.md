# 014 PWA — Tasks

- [ ] T1 — Manifest, icons and service worker | owner: frontend-engineer | files: `package.json`, `package-lock.json`, `vite.config.ts`, `public/icons/*`, `index.html`, `src/vite-env.d.ts` | verify: build emits `sw.js` and the manifest; precache list complete; no API caching
- [ ] T2 — Offline banner, update bar and install card | owner: frontend-engineer | files: `src/lib/pwa.ts`, `OfflineBanner.tsx`, `UpdateBar.tsx`, `InstallCard.tsx`, `AppLayout.tsx`, `SettingsScreen.tsx`, landing registration | verify: build; offline, update and install flows in Playwright; layout scan clean
- [ ] T3 — Visual review | owner: ui-ux-designer | files: components from T2 and the icons (polish only) | verify: icons crisp and maskable-safe; banners and card match the skill in both themes
- [ ] T4 — Docs sync | owner: main session | files: `docs/development/repository-structure.md`, `docs/context.md` | verify: icons folder, `lib/pwa.ts`, dependency and 014 state recorded
- [ ] T5 — Audit | owner: auditor | files: `docs/specs/014-pwa/audit.md` | verify: verdict PASS
