# 014 PWA (prototype) — Audit Report

Auditor: `auditor` agent | Date: 2026-10-30 | Branch: `feature/mvp-plan` | Commits audited: `cc79ea2` (manifest, icons, iOS meta), `96f67b3` (offline banner and install card), `19d548f` (docs sync), `6bb7954` (AC4 form-screen exception), `987edfb` (form screens stay mounted), `e0a5e81` (visual polish). All are diffed against `dev` (`56d85c9`). The `backend/`, `package.json` and `package-lock.json` diffs are empty.

Runtime: Node 22, Chromium 1194 through Playwright (`require("playwright")`, no browser installed). `vite preview` ran on `:4173` after `npm run build`. The API ran on `:8000` with `FRONTEND_ORIGIN=http://localhost:4173` and a scratch DB. `dev` was built in a scratch worktree (`git worktree add --detach … dev`) for the bundle comparison. Scratch directory: `/tmp/claude-0/-home-claude-splitpay-fintech/03833dd2-2eab-509b-b278-e168f70beef2/scratchpad/audit014/` (written `$A` below). All scripts, screenshots and logs are there, and none are in the repo. Offline was simulated with `context.setOffline()`, which fires the browser's `offline` and `online` events and fails every request.

## Evidence Gathered

| # | Check | Command / method | Result |
| --- | --- | --- | --- |
| E1 | Strict build | `cd frontend && npm run build` (`"strict": true` in both tsconfigs) | **Passes** (`tsc -b && vite build`, 2003 modules, no TS errors). `dist/` contains `manifest.webmanifest`, `icons/` (4 PNGs) and `favicon.svg`. There is **no `sw.js`** or any other worker file. |
| E2 | Static greps | `rg` over the three new files and the added lines of the `frontend/src` diff | No `any`, `as` casts, non-null `!.`, `@ts-*` or `eslint-disable`. No `innerHTML`, `fetch(`, `localStorage`, `sessionStorage`, `indexedDB` or `caches`. The only `as` hits are English words in comments. The trailing `!` in `InstallCard`'s classes is Tailwind 4's important modifier, not TypeScript. |
| E3 | Copy scan | `rg "[—–·→…]" frontend/src` | **Empty** (exit 1). |
| E4 | No worker anywhere | `rg "serviceWorker\|sw\.js\|workbox\|caches\." frontend/src frontend/index.html frontend/public frontend/vite.config.ts frontend/dist` | **Empty** (exit 1). |
| E5 | Dependencies | `git diff --stat dev.. -- frontend/package.json frontend/package-lock.json` | **Empty.** No dependency was added. |
| E6 | App entry size vs `dev` (zlib level 9, same `node_modules`) | `dev` `56d85c9` built in a scratch worktree (`$A/gz.cjs`) | JS entry 113,742 → 114,513 B gzip (**+771 B**). CSS 10,102 → 10,184 B (+82 B). JS plus CSS: **+853 B, under the 1 kB limit**. The landing chunk is unchanged (51.4 kB gzip). |
| E7 | Backend untouched | `git diff dev.. -- backend`; `.venv/bin/pytest -q` | Empty diff; **743 passed**. No `.env`, `*.db`, `node_modules` or `dist` tracked. |
| E8 | Manifest file and serving (`$A/func.cjs`, `$A/cdp.cjs`) | `link[rel=manifest]`, `GET /manifest.webmanifest` from `vite preview`, CDP `Page.getAppManifest` | `href="/manifest.webmanifest"`, **200 `application/manifest+json`**. `JSON.parse` succeeds, and every AC1 field matches character for character: `name`, `short_name`, `description`, `lang` "pt-BR", `start_url` "/inicio", `scope` "/", `display` "standalone", `orientation` "portrait", `theme_color` "#f4f4f5", `background_color` "#0b0b0c". There are three icons: 192 and 512 `any`, plus 512 `maskable`, all `image/png`. Chromium's parser reports **0 manifest errors**. `Page.getInstallabilityErrors` lists only `in-incognito` (Playwright contexts are incognito), with no icon or manifest error. |
| E9 | Icons (`$A/icons.py`, `$A/icons.png`) | PIL plus in-browser `Image.decode()` | All four PNGs are 200 `image/png` and decode at their declared sizes: 192×192, 512×512, 512×512 and 180×180. `icon-192` and `icon-512` show the roundel on transparent corners. **Maskable:** the tile is opaque `#111111` (no transparency), and every non-tile pixel lies within **30.6 % of the width from the center**, inside the 40 % safe-zone radius. **Apple touch:** opaque 180×180, with content within 32.8 %. The contact sheet shows a crisp S with the split cut, drawn from `favicon.svg`. |
| E10 | iOS meta and theme (`$A/func.cjs`) | DOM of `/inicio` | `apple-touch-icon` `sizes="180x180"` → `/icons/apple-touch-icon-180.png`. `apple-mobile-web-app-capable` "yes", `apple-mobile-web-app-title` "SplitPay", `apple-mobile-web-app-status-bar-style` "default". Both `theme-color` tags are still there (`#f4f4f5` light, `#0b0b0c` dark), and so is `viewport-fit=cover`. The inline theme script still sets `data-theme` to "light" or "dark" from the saved preference. |
| E11 | No service worker at runtime (`$A/func.cjs`) | Browse `/`, `/entrar`, all 7 app routes and a 404, then query | `navigator.serviceWorker.getRegistrations()` **= 0**, `controller` = `null`, `caches.keys()` **= 0**, `context.serviceWorkers()` = 0, and no worker script was requested. `localStorage` holds only the three existing keys (`splitpay.name`, `splitpay.theme`, `splitpay.hideValues`). **Data Rules hold.** No page error. |
| E12 | Offline banner placement and copy (`$A/func.cjs`) | `setOffline(true)` on every route | On all 7 app screens (Início, Gastos do mês, Extrato, transaction detail, Amigos, Configurações, Novo gasto), the banner reads **"Você está sem internet. Os dados voltam a carregar quando a conexão voltar."** exactly. It sits inside the always-mounted `role="status"` region, which is the first child of `main`, with `position: static` and the icon `aria-hidden`. On `/` and `/entrar` (outside the app shell, so not "app screens" in AC4) there is no banner. Online, every route shows no banner, and after reconnecting it disappears everywhere. |
| E13 | Reconnect behavior (`$A/func.cjs`) | A DOM identity marker on the screen root, the API request log, and typed values | **Início, Gastos do mês, Extrato, transaction detail:** the screen remounts, and the requests after reconnect are **exactly the initial set, once**, with no further request in the next 1.5 s. Início makes 5 calls on load and 5 on reconnect. **Novo gasto** (Valor, Descrição), **Configurações** (Novo saldo, Justificativa, Palavra-chave) and **Amigos** (Nome do amigo): the screen is not remounted, **every typed value is kept**, and there are **0 requests**. `/amigos/` with a trailing slash also keeps its value (`$A/edge.cjs`). |
| E14 | Error states (`$A/func.cjs`, `$A/edge.cjs`) | Navigate while offline | Extrato opened offline shows the banner plus "Tentar novamente" cards, and after reconnect it recovers with 0 error cards. Amigos opened offline keeps its "Tentar novamente" buttons after reconnect (no remount), and pressing one then loads. Two cross-navigation cases work. Leaving Novo gasto for Início while offline reloads Início on reconnect. Leaving Início for Configurações while offline does not reload, and the retry buttons stay. Three quick offline/online flaps on Início cause 15 calls, one reload of 5 per reconnect. |
| E15 | Focus after remount (`$A/func.cjs`) | Focus a link in Extrato's `main`, then reconnect | Focus moves to `main#conteudo` (not `body`), and the next Tab lands inside `main`. Focus on a tab bar link is left alone by the remount. The window scroll goes back to 0 (n3). |
| E16 | Install card (`$A/func.cjs`) | Configurações in both themes | The card is labelled "Instalar o app", with the text "Use o SplitPay como um app, direto da tela inicial." and a button "Instalar", all verbatim. The button has `aria-disabled="true"`, no `disabled` attribute (still focusable), `type="button"` and no form. `aria-describedby` resolves to **"Disponível quando o app for publicado."**. Chromium's accessibility tree reports `{role: button, name: "Instalar", description: "Disponível quando o app for publicado.", disabled: true}`. The previous sibling card is Aparência. The button is 324×48. **Click, Enter and Space:** `body.innerHTML` is identical, the URL is unchanged, there are 0 network requests, focus stays on the button, and there is no console error or warning. There is no browser detection (the component has no `navigator` read). |
| E17 | Standalone safe area (`$A/edge.cjs`, `$A/standalone-*.png`) | CDP `Emulation.setSafeAreaInsetsOverride` {top 47, bottom 34}. `setEmulatedMedia` `display-mode: standalone` was accepted but does not match in this Chromium, so env() was tested directly | `env()` resolves to 47 and 34 px. **Tab bar:** `padding-bottom` 34 px, links end at 810 px, above the 34 px home indicator. **Início header (`BalanceHeader`):** `padding-top` 63 px (16 + 47). Code: `AppLayout` `main` adds `env(safe-area-inset-bottom)` to its bottom padding, and `theme.css` adds it to `scroll-padding-bottom`. **AC6 holds.** With a non-zero top inset, the banner and the titles of the other screens would sit at 16 px, under the inset (n2). |
| E18 | Layout scan with the banner visible (`$A/scan.cjs`, `$A/scan/`) | 7 app screens × 360, 390, 768, 1280 × light and dark = **56 full-page screenshots**, offline | No horizontal scroll, no text overlap, nothing under the tab bar or save bar, and no page error. The only flags are 8 expected ellipses on long descriptions and "Com …" lines in Início and Extrato at 360 and 390. That is the skill's truncation rule (pre-existing). The banner follows the content gutter: 16 px below `md`, 32 px at 768, and inside the 1140 px column at 1280 (x 102, width 1076). It is 86 px high at 360 (3 lines), 66 px at 390 and 46 px from 768. The gap to the screen is 12 px, or 16 px from `md`. 328 checks, 0 real failures. |
| E19 | Contrast (`$A/contrast.py`) | Text runs on Início and Configurações with the banner, 4 widths × 2 themes. Each text color is composited over the background pixels with text hidden, then the 2nd percentile is taken | **0 failures.** Banner text: light `accent-soft-text` on `accent-soft` **6.37**, dark **9.21**. Install button text (`muted` on `neutral-soft`): light **7.03**, dark **5.81**. Card note and the "Disponível…" note: light 7.73, dark 6.91. The dashed `field-border` edge of the button is 3.38:1 (light) and 3.67:1 (dark) against `surface`, from the 012 token values. |
| E20 | Keyboard sweep (`$A/kbd.cjs`) | Tab from the top with the banner visible, on Configurações and Início, 4 widths × 2 themes, with a 250 ms settle (the button `transition` animates `outline-color`) | **260 stops.** Every stop matches `:focus-visible` with a 2 px solid outline (or a focus-within ring on the field wrapper), is in view, is clear of the tab bar and the banner, and is at least 44 px. The install button is reachable at every size. **Install button ring:** `accent-text` at full opacity, **5.02:1** on white (light) and **10.61:1** on `surface` (dark). Harness notes: 8 flags were the "Novo saldo" `<input>`, whose ring is drawn by its wrapper's `focus-within:outline-2` (verified `$A/money.cjs`). Below `md`, the focused "Pular para o conteúdo" skip link overlays the banner while it has focus (n4). |
| E21 | `aria-disabled` saving state (designer flag; `$A/kbd.cjs`, `$A/saving-*.png`) | "Confirmar ajuste" focused by keyboard, Enter, with the POST held for 4 s | Idle ring: 4.98 (light), 10.3 (dark). While saving, `aria-disabled="true"` and `opacity: 0.5` blend the ring: light `#b45309` becomes `rgb(217,168,131)` on white = **2.13:1**, and dark becomes `rgb(138,108,31)` on `surface` = **3.58:1**. The issue is confirmed in light mode for the duration of the request. The code dates from 012 (`Button.tsx` `aria-disabled:opacity-50`, and the same classes in `CategoryRulesCard.tsx:201` and `FriendsScreen.tsx:141`), so 014 did not introduce it. 014's own install button opts out with `aria-disabled:opacity-100!` (E20). See n1. |
| E22 | App smoke (`$A/smoke.cjs`) | `/` and `/entrar` without a name. Then with a name: `/`, all 7 app routes and a 404 | Each route renders one `h1` ("Divida um gasto…", "Divida a conta…", "Início", "Gastos do mês", "Extrato", "Uber para o trabalho", "Amigos", "Configurações", "Novo gasto", "Página não encontrada"). There are no error cards, no banner while online, and no page or console error. `/` makes 0 API calls. **35 checks, 0 failures.** |
| E23 | Servers and repo | Stopped uvicorn and the preview; removed the scratch worktree; `curl` both ports | Both ports refuse (`000`). `git worktree list` shows only the main checkout. `git status` was clean before this file was written. |

Totals from my runs: func 130/0, edge 5/0, smoke 35/0, scan 328 with 8 expected ellipses, kbd 528 with 8 harness false positives (all explained above).

## 1. Spec Compliance

- [x] **AC1: Pass.** The manifest is static, linked, served as `application/manifest+json`, and every field and icon matches. The maskable roundel is inside the safe zone (30.6 % < 40 %). The apple-touch icon is 180 px, drawn from the logo (E8, E9).
- [x] **AC2: Pass.** All four iOS tags are present, and the `theme-color` tags and theme script are intact (E10).
- [x] **AC3: Pass.** No worker, no cache, no registration, no new dependency (E1, E4, E5, E11).
- [x] **AC4: Pass.** The banner copy is verbatim, in `role="status"`, on every app screen. Cards keep their error state. The read screens reload once on reconnect. The form screens keep typed values and their "Tentar novamente" (E12-E14).
- [x] **AC5: Pass.** "Instalar o app" comes right after Aparência, with the text and the note verbatim. The button is `aria-disabled` and described by the note, does nothing on click, Enter or Space, and has no browser detection (E16).
- [x] **AC6: Pass.** The header and tab bar clear the top and bottom insets through `env(safe-area-inset-*)` (E17). The top-inset caveat for the banner is in n2.
- [x] **AC7: Pass.** 56 clean layout scans with the banner. The banner sits in the flow and never covers content or focus. 44 px targets, AA contrast in both themes, clean copy (E3, E18-E20).
- [x] **AC8: Pass.** Strict build, entry +853 B gzip (E1, E6).

**Data Rules: Pass.** Nothing new is stored: the same three `localStorage` keys, 0 caches (E11).

**Test Strategy (plan): Pass.** I ran every item myself: the build output, no `sw.js` and no new dependency, the manifest fields, icon sizes and maskable zone, no registrations, the offline and reconnect flow, the inert install button, the layout scan with the banner, the keyboard sweep, the copy scan and the chunk sizes (E1-E22).

**Changes during T2: Accepted.**
1. The reconnect counter updates in an effect, and the banner hides on reconnect on every screen (E12).
2. The banner is in the page flow with `position: static`, so it needs no scroll padding, and nothing sits under it (E12, E18, E20).
3. Focus goes to `main` after the remount (E15).
4. The form screens are skipped, including a trailing slash (E13). AC4 was updated to match (`6bb7954`), see n6.

## 2. Security & Data Consistency

- [x] **No backend change**; `pytest` 743 passed. `checks.sql` does not apply (E7).
- [x] **No new storage, cache or worker** (E11). `online.ts` only reads `navigator.onLine` and listens to two window events, and it unsubscribes on cleanup.
- [x] **Money.** No amount logic changed (E2).
- [x] **Static files only.** The manifest and icons are plain `public/` files with no user data.

## 3. Structural & Stack Rules

- [x] **TypeScript.** Strict build with no escapes (E1, E2).
- [x] **Files.** `public/manifest.webmanifest`, `public/icons/` and `lib/online.ts` are recorded in `repository-structure.md` in `19d548f`, with their reasons. The components sit in `app/components/`.
- [x] **Scope.** No service worker, install prompt, update bar, push or shortcuts. `goal.md` and `context.md` (Business Rule 21) record the visual-only scope decided on 2026-10-30.
- [x] **Process.** The spec was approved (`4151fe4`) before the first code commit (`cc79ea2`). Commit notes are in n6.

## Findings

### Blocker

None.

### Major

None.

### Minor

None.

### Informational

- **n1. The focus ring fades below 3:1 while a 012 form saves (designer flag, confirmed).**
  - **Evidence.** `buttonClasses` applies `aria-disabled:opacity-50` (`ui/Button.tsx`), and the outline inherits the opacity. In light mode the ring on "Confirmar ajuste" drops from 4.98:1 to **2.13:1** for the length of the request. Dark mode stays at 3.58:1 (E21). The same pattern is in the "Adicionar" button of `FriendsScreen.tsx:141` and the rule delete button of `CategoryRulesCard.tsx:201`.
  - **Classification.** Not an AA failure, and not introduced by 014:
    - WCAG 1.4.11 exempts inactive components, and an `aria-disabled` button during a request is inactive.
    - 2.4.7 (AA) only asks for a visible indicator, and a faded ring is still visible.
    - 2.4.13 Focus Appearance (which asks for 3:1 between focused and unfocused states) is AAA.
    - The state is transient, usually well under a second against the local API.
  - **Optional fix**, when the 012 forms are next touched: fade the fill and text, not the element. For example, replace `aria-disabled:opacity-50` with `aria-disabled:bg-accent/50 aria-disabled:text-on-accent/60` per variant, or add `aria-disabled:focus-visible:opacity-100`, so the outline keeps full alpha. `InstallCard` already opts out with `aria-disabled:opacity-100!`.
- **n2. The top inset is not applied to the banner or the screen titles.**
  - **Evidence.** With a 47 px top inset forced through CDP, the banner on Início (`mt-4`) and the `h1` of the other screens (`main` `pt-4`) sit at y = 16, under the inset. On Início, `BalanceHeader` then adds its own 47 px below the banner (E17, `$A/standalone-*.png`).
  - **Impact today.** None. With `apple-mobile-web-app-status-bar-style` "default", iOS standalone lays the page out below the status bar, so the top inset is 0. Android standalone does the same. Only `black-translucent` or a future edge-to-edge mode would expose it. The screen titles behave the same way on `dev`, so this predates 014.
  - **Optional fix**, if the status bar style ever changes: give `main` `pt-[calc(16px+env(safe-area-inset-top))]` below `md`, and on Início drop the header's inset while the banner shows. Or add a line to the spec saying the top inset relies on the "default" status bar.
  - **Visual note.** With the banner shown, Início's amber header starts below the banner instead of at the screen edge (`$A/sheet-banner.png`). This was reviewed in T3 and is acceptable.
- **n3. A reconnect remount returns the read screens to the top and drops their transient UI state.** On Extrato, a window scrolled to 300 px is at 0 after reconnect, and an open inline "Recebi" confirmation would close (E15). Filters live in the URL, so they survive. This matches AC4 ("reloads its data once", as when the screen opens) and the plan's choice of a key bump over an event bus. Optional: save `scrollY` before the bump and restore it in the existing focus effect.
- **n4. The skip link overlays the banner while it is focused.** Below `md`, "Pular para o conteúdo" is shown fixed at the top (y 12-60) and covers the banner text until focus moves on (E20). This is standard skip-link behavior and does not hide focus. No action.
- **n5. The manifest colors mix themes.** `theme_color` is the light `bg` (`#f4f4f5`) and `background_color` is the dark `bg` (`#0b0b0c`), exactly as AC1 says. The Android splash is dark, matching the dark roundel icon and the landing hero, and the status bar is light. The design skill's line "PWA `theme_color` and `background_color` follow the active theme `bg`" could be read as both light or both dark. Optional: add the reason to the 014 Decisions table, or reword the skill line, so the presenter can explain the split.
- **n6. Commits and spec history.**
  - AC4 was amended after approval (`6bb7954`, the form-screen exception, which follows the `987edfb` design). The change is recorded under "Changes during T2", but the spec has no note that Vinicius re-approved it.
  - The T4 docs commit (`19d548f`) lands before T3 (`e0a5e81`).
  - `e0a5e81` (`style(web)`) also edits `tasks.md`.
  - This is the same pattern as 013 n6, against "one logical change per commit". No code impact.

## Verdict

**PASS with nothing open.** There is no blocker, major or minor finding. n1-n6 are informational and optional. n1, the designer's flag, is confirmed at 2.13:1 in light mode. It is pre-existing 012 behavior on an inactive control, and it is not an AA failure.

Every acceptance criterion, the Data Rules, the plan's Test Strategy and the four "Changes during T2" hold under my own runs:
- strict build, clean greps and copy scan;
- `package.json` and the lockfile are unchanged, and the backend is untouched with `pytest` 743 passed;
- no worker file, registration or cache anywhere;
- the entry grows +853 B gzip;
- the manifest is valid, served as `application/manifest+json`, with every AC1 field;
- the icons decode at their declared sizes, and the maskable content stays within 30.6 % of center;
- iOS and theme tags are intact;
- the banner copy is exact in `role="status"` on all 7 app screens and absent on `/` and `/entrar`;
- the read screens reload exactly once on reconnect, and the form screens keep every typed value with 0 requests;
- focus lands on `main` after a remount;
- the install card is inert on click, Enter and Space, with its description wired in the accessibility tree;
- the safe-area insets are applied to the header and the tab bar;
- 56 layout scans are clean with the banner;
- 260 keyboard stops are clean, and the install ring is 5.02:1 and 10.61:1;
- all new text is AA;
- the smoke of every route passes.

T5 can be checked.
