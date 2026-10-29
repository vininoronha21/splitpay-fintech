# 014 PWA — Plan

Status: draft

## Files to Create/Modify

- `frontend/package.json`, `package-lock.json`: `vite-plugin-pwa` 1.3.0 as an exact dev dependency.
- `frontend/vite.config.ts`: `VitePWA({ registerType: "prompt", manifest, workbox: { globPatterns: ["**/*.{js,css,html,svg,png,woff2}"], navigateFallback: "/index.html" } })`. No `runtimeCaching` for the API origin.
- `frontend/public/icons/` (new): `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon-180.png`, drawn once from `favicon.svg` with a scratch Playwright script (not committed).
- `frontend/index.html`: the iOS meta tags and the `apple-touch-icon` link.
- `frontend/src/vite-env.d.ts`: `/// <reference types="vite-plugin-pwa/react" />`.
- `frontend/src/lib/pwa.ts` (new): `useOnline()` (`navigator.onLine` plus events, on `useSyncExternalStore`), `useInstallPrompt()` (captures `beforeinstallprompt`, detects standalone and iOS Safari).
- `frontend/src/app/components/` (new): `OfflineBanner.tsx`, `UpdateBar.tsx` (uses `useRegisterSW` from `virtual:pwa-register/react`), `InstallCard.tsx`.
- `frontend/src/app/components/AppLayout.tsx`: renders the offline banner and the update bar; `useResource` callers reload once when `useOnline` turns true (through a small `onlineVersion` dependency, the same pattern as `balanceVersion` in 012).
- `frontend/src/app/components/SettingsScreen.tsx`: the install card after Aparência.
- `frontend/src/styles/theme.css`: scroll padding for the banners if they are fixed.
- `docs/development/repository-structure.md`: `public/icons/`, `lib/pwa.ts`, the new dependency.

## Architectural & Tech Decisions

- **Registration:** `useRegisterSW` inside `UpdateBar`, mounted once in `AppLayout` and once on the landing (so the first visit to `/` installs the worker). In dev the plugin is disabled.
- **Offline detection:** `navigator.onLine` is only a hint; the banner shows on `offline`, and the cards' own errors cover a reachable network with a down API.
- **Install prompt:** the `beforeinstallprompt` event is captured at module load in `lib/pwa.ts` (it can fire before Configurações mounts) and kept in a small store.
- **Frontend TS Interfaces:** a local `BeforeInstallPromptEvent` interface (not in the DOM lib).
- **Database Schema:** no change.

## Test Strategy

- `npm run build`: the generated `sw.js` and `manifest.webmanifest` exist; the precache list contains every chunk, the fonts and the icons; no API URL appears in `sw.js`.
- **Playwright on `vite preview`:**
  - the manifest fields and icon sizes; the icons load;
  - after the worker activates, `context.setOffline(true)` and a reload of `/inicio`, `/extrato` and `/` render the shell; the offline banner shows; the cards show their errors; back online, the banner hides and data loads;
  - no API response is in Cache Storage after browsing every screen;
  - a second build with a changed file shows "Nova versão disponível." on the open page, and "Atualizar" reloads into the new version;
  - the install card: simulated `beforeinstallprompt` shows "Instalar" and calls `prompt()`; `display-mode: standalone` shows the installed text; an iPhone Safari user agent shows the iOS text; desktop Firefox hides the card;
  - layout scan at 360, 390, 768 and 1280 in both themes with the banners visible, and a keyboard sweep.
- Lighthouse installability on `vite preview` (Chromium headless).
- Copy scan and chunk sizes.

## Risks & Edge Cases

- **Service workers need HTTPS:** `localhost` counts as secure for tests; the deploy is HTTPS on Vercel.
- **Stale shell after a deploy:** covered by the update bar; the old shell keeps its own chunks in the old cache until the user updates.
- **iOS limits:** no install prompt event; the card shows instructions only.
