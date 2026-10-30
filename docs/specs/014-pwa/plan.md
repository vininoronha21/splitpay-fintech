# 014 PWA (prototype) — Plan

Status: approved

## Files to Create/Modify

- `frontend/public/manifest.webmanifest` (new).
- `frontend/public/icons/` (new): `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon-180.png`, drawn once from `favicon.svg` with a scratch Playwright script (not committed).
- `frontend/index.html`: the manifest link, the iOS meta tags and the `apple-touch-icon` link.
- `frontend/src/lib/online.ts` (new): `useOnline()` on `useSyncExternalStore` with `online` and `offline` events.
- `frontend/src/app/components/OfflineBanner.tsx` and `InstallCard.tsx` (new).
- `frontend/src/app/components/AppLayout.tsx`: renders the banner; when `useOnline` turns true again, the outlet remounts once (a `key` bump) so every card refetches with its existing `useResource`.
- `frontend/src/app/components/SettingsScreen.tsx`: the install card after Aparência.
- `docs/development/repository-structure.md`: `public/icons/`, `public/manifest.webmanifest`, `lib/online.ts`.

## Architectural & Tech Decisions

- **No dependency:** the manifest is a static file in `public/`; Vite copies it as-is.
- **Refetch on reconnect:** remounting the outlet reuses the "fetch every time the screen opens" rule from 009 instead of a new event bus.
- **Install button:** `Button` with `aria-disabled` (the pattern from 012) and an `onClick` that returns early.
- **Frontend TS Interfaces:** none new.
- **Database Schema:** no change.
- **Changes during T2:**
  - The reconnect counter updates in a `useEffect`; updating it during render broke `useSyncExternalStore` and the banner stayed up.
  - The banner sits in the page flow at the top of `main`, so it needs no scroll padding.
  - After the remount, focus moves to `main` when it would otherwise fall to `body`.
  - The reconnect remount skips the screens that hold form state (`/novo-gasto`, `/configuracoes`, `/amigos`), so a half-filled form is never discarded; their cards keep "Tentar novamente".

## Test Strategy

- `npm run build`: `dist/manifest.webmanifest` and the icons exist; no `sw.js`; no new dependency in `package.json`.
- **Playwright on `vite preview`:**
  - the manifest parses, its fields match AC1, every icon loads at its declared size, and the maskable icon keeps the roundel within the central 80 %;
  - `navigator.serviceWorker.getRegistrations()` is empty after browsing;
  - `context.setOffline(true)` shows the banner and the cards' errors; back online, the banner hides and data loads once;
  - the install button is `aria-disabled`, has the note in its description, and a click changes nothing;
  - layout scan at 360, 390, 768 and 1280 in both themes with the banner visible, and a keyboard sweep.
- Copy scan and chunk sizes.

## Risks & Edge Cases

- **`navigator.onLine` is only a hint:** a reachable network with the API down still shows the cards' own errors.
- **iOS home screen without a service worker:** "Adicionar à Tela de Início" still works and opens standalone with the icon; it just needs the network.
