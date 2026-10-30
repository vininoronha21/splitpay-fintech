# 014 PWA (prototype) — Spec

Stories: none directly; `docs/goal.md` PWA success criterion, scoped down for the prototype | Status: approved

## Problem

`goal.md` asks for an installable PWA. On 2026-10-30 Vinicius decided that SplitPay is a prototype that will not be published for now, so the install and update buttons must look right but do nothing real yet. This spec delivers the static parts that make the app look like a mobile app (manifest, icons, iOS meta), the offline notice, and an install card whose button is visual only. The service worker, real installation and update flow wait for the publication spec.

## Acceptance Criteria

1. **Manifest** (`public/manifest.webmanifest`, linked from `index.html`), static and with no service worker:
   - `name` "SplitPay", `short_name` "SplitPay", `description` "Divida gastos com um amigo e acompanhe os reembolsos.", `lang` "pt-BR";
   - `start_url` "/inicio", `scope` "/", `display` "standalone", `orientation` "portrait";
   - `theme_color` "#f4f4f5" and `background_color` "#0b0b0c";
   - icons: 192 and 512 px PNG (`purpose: "any"`), 512 px maskable PNG with the roundel inside the safe zone, and a 180 px `apple-touch-icon`, drawn from the existing logo.
2. **iOS meta:** `apple-touch-icon`, `apple-mobile-web-app-capable` "yes", `apple-mobile-web-app-title` "SplitPay", `apple-mobile-web-app-status-bar-style` "default". The existing `theme-color` tags stay.
3. **No service worker:** nothing registers a worker, nothing is cached by the app, and no new dependency is added.
4. **Offline notice:** on the app screens, when the browser reports offline, a banner at the top reads "Você está sem internet. Os dados voltam a carregar quando a conexão voltar." (`role="status"`). Cards that fail keep their existing error state. When the connection returns, the banner disappears and the screen reloads its data once, except on screens that hold form state (Novo gasto, Configurações, Amigos), where a reload would discard what the user typed; there the failed cards keep "Tentar novamente". Without a service worker the app cannot open offline from scratch; the banner covers losing the connection while the app is open.
5. **Install card in Configurações** ("Instalar o app"), after Aparência, visual only:
   - the text "Use o SplitPay como um app, direto da tela inicial." and an "Instalar" button in the app's button style;
   - the button is `aria-disabled="true"`, does nothing when pressed, and has the note "Disponível quando o app for publicado." tied to it with `aria-describedby`, so nobody is surprised that nothing happens;
   - the card shows on every device (no browser detection).
6. **Standalone layout:** the header and the tab bar keep clear of the notch and the home indicator through `env(safe-area-inset-*)` (already in place; verify).
7. **Layout and copy:** the banner and the card follow the 008 layout rules at 360, 390, 768 and 1280 in both themes, never cover content or focus, have 44 px targets and AA contrast; pt-BR copy with no em or en dash, "·", arrows or "…".
8. `npm run build` passes with strict TypeScript; the app entry grows by at most 1 kB gzip.

## Data Rules

- Nothing new is stored in the browser.

## API Contract

No backend change.

## Out of Scope (until the publication spec)

- Service worker, offline shell, real install prompt, update bar.
- Push notifications, background sync, shortcuts, share targets.
- The deploy (Vercel and Render).

## Decisions

| Decision | Why | Rejected |
| --- | --- | --- |
| Static manifest and icons now, service worker later | Vinicius's call on 2026-10-30: a prototype not yet published. The static files cost nothing at runtime and make "Adicionar à Tela de Início" look right in the demo. | `vite-plugin-pwa` now: a dependency and cache behavior for an app that is not deployed. |
| Install button visible but `aria-disabled`, with a note | Shows the planned feature in the presentation without a button that silently fails. | A working prompt: out of scope now. A button with no note: looks broken when tapped. Hiding the card: the feature would not appear in the demo. |
| No update bar | Without a service worker there are no updates to announce; a fake bar would be noise. | A permanent decorative "Atualizar" bar: it would always look like something is pending. |
| Keep the offline banner | It needs no service worker, reuses the cards' error states, and explains a real situation during a live demo. | Dropping it: a lost connection would only show error cards. |
