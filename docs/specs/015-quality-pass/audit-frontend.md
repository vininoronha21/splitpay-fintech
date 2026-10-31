# 015 Quality Pass — Frontend Audit

Auditor: `auditor` (read-only on product code) | Date: 2026-10-31 | Branch: `feature/mvp-plan` at `74b0a4e`
Scope: the whole frontend (`frontend/src`, `frontend/index.html`, `frontend/public`, `vite.config.ts`), not only the last diff. Earlier informational notes (008 to 014) were read and are not repeated.

Scripts and screenshots are in the session scratchpad, folder `audit015fe/` (called `$A` below). The API ran with `FRONTEND_ORIGIN=http://localhost:4173` and a scratch `DATABASE_PATH` on port 8000. The production build ran under `vite preview` on port 4173. Playwright used the preinstalled Chromium.

## Evidence

| # | Check | How | Result |
| --- | --- | --- | --- |
| E1 | Build and strict TS | `npm run build` | Clean. `strict`, `noUncheckedIndexedAccess` and the unused checks are on. No `any`, `@ts-ignore` or `eslint-disable` in `src`. |
| E2 | API contract | Every interface in `types/api.ts` and every call in `services/api.ts` compared with `backend/app/schemas/*.py` and the live `/openapi.json` (all 27 schemas, all 21 operations) | **No mismatch.** Field names, nullability, required fields and status codes match, including `204` for the rule delete and `SplitDetail` from the settle PATCH. |
| E3 | AC1 of spec 015 (`$A/ac1.cjs`) | POST delayed 2.5 s by route interception. Each form tested three ways (keyboard Tab+Enter on the button, mouse click, Enter inside a field) in both themes. Ring contrast measured as the outline color, multiplied by the element's opacity, against the nearest opaque background | **Pass.** Keyboard-focused saving buttons (`aria-disabled="true"`, `:focus-visible`): opacity **1**, 2 px solid ring, **5.02:1** in light (`#b45309` on white) and **10.61:1** in dark, for Ajustar saldo, Adicionar (rule) and Adicionar amigo. With a mouse click (focused, not `:focus-visible`) and with Enter inside a field (unfocused), all three are at opacity **0.5** in both themes. |
| E4 | Demo flow end to end (`$A/flow.cjs`, `$A/flow2.cjs`) | Landing, then Entrar, then Novo gasto R$ 100,01 "Janta com amigos" split equally, then Extrato Recebi, then Início, then Receita, Ajuste, Regra and Amigo | All steps pass, with the values checked against the API. "Alimentação" is suggested and preselected. The preview reads friend R$ 50,00 and you R$ 50,01, and the saved row matches (own share 5001). Balance −10001, budget +5001. Recebi adds +5000, and Início shows the new balance. Income adds +25000. The adjustment preview shows "+R$ 3.794,01" and the stored balance is 500000. The history shows "De R$ 1.205,99 para R$ 5.000,00". The rule "Feirinha" is created and then suggested. The friend appears in the list. No console or page errors. |
| E5 | Deep links and guard (`$A/edges.cjs`) | 15 URLs, plus 3 without a name | `/extrato/abc`, `/0`, `/99999` and an id past 2^53 show "Lançamento não encontrado". `/extrato/70/` works. `?periodo=anual&offset=-999` is rewritten to `-520` (label "1506"). A bad `periodo` or `offset=1.5` is rewritten to the current month. `?status=bogus` shows Todos. An unknown path shows the 404. `/entrar` with a name goes to `/inicio`. Without a name, every app route goes to `/entrar`. |
| E6 | API errors (`$A/edges.cjs`) | Every app screen with the API refused, with an HTML 500, with an enveloped 500 and with a **200 non-JSON** body | Refused gives the network message on every card. The HTML 500 gives "Algo deu errado. Tente novamente.". The enveloped 500 shows the API message. Each card fails on its own and has a retry. **A 200 with a non-JSON body crashes 5 of 6 screens** into `RouteError` (m3). |
| E7 | Races and unmount (`$A/races.cjs`, `$A/staleNav.cjs`) | Five quick "Mês anterior" clicks with latencies of 50 to 1500 ms, then Anual and Semanal in quick succession. Settle, then leave the screen mid-request. Login submitted twice. Novo gasto left mid-save | The final label always matches the URL ("Maio de 2026" at −5, then "26 de out a 1 de nov"), so `useResource` aborts correctly. Leaving during a settle causes no error. The double login sends **1 PATCH**. **Leaving Novo gasto mid-save moves the user back to Início later** (m1). |
| E8 | Blocked `localStorage` (`$A/races.cjs`) | The getter throws | Login, navigation, the switch to dark and the landing all work, with no errors. |
| E9 | Hide values (`$A/hide.cjs`) | Text nodes and `aria-label`s on 8 screens at 1280, with a category expanded and an adjustment preview open | No amount visible on any app screen. The only match is the landing's sr-only sample sentence (fixed sample data, not the user's). |
| E10 | Layout scan (`$A/scan.cjs`) | 12 views (including Novo gasto with a split at 30% and details open) at 360/390/768/1280 in both themes, 96 runs. Checked for page horizontal scroll, elements outside the viewport and clipped `.num` | **0 issues.** Screenshots at 360 and 1280 are in `$A/shots/scan/`. |
| E11 | Text contrast (`$A/contrast.cjs`) | Every visible text node on 10 views at 390 and 1280 in both themes, composited over its background stack | **No failure on app screens.** The 3 hits on the landing header are false positives: the dark hero is an absolutely positioned sibling, and the screenshot `$A/shots/landing-top.png` shows light text on dark. |
| E12 | Scroll on navigation (`$A/scroll.cjs`, `$A/scroll2.cjs`) | Scroll a screen, then navigate | **The scroll position carries over to the next screen** (M1). |
| E13 | Focus after a disabled control (`$A/races.cjs`, `$A/focus2.cjs`) | Keyboard | After "Próximo mês" reaches offset 0, focus is on `BODY`. After an API error on "Salvar gasto", focus is on `BODY`, and the next Tab goes to the tab bar (m4). |

## Findings

### Major

**M1. The scroll position leaks between screens. Início can open without its balance header.**
- **Where.** `frontend/src/app/routes.tsx:42-74`. The data router has no `<ScrollRestoration />`, and no code resets the scroll on navigation (`grep ScrollRestoration|scrollTo` finds nothing in `src`).
- **Reproduction** (`$A/scroll2.cjs`, 390×844):
  - Open Extrato and scroll down 2000 px, then tap Início in the tab bar. Observed: `scrollY` is 236, the amber balance header and the greeting are off-screen, and the page starts at the quick actions (`$A/shots/scroll-inicio-from-extrato.png`).
  - Open Configurações, scroll to the bottom, then tap Amigos. Observed: `scrollY` is 522, and the `h1` "Amigos" and the add-friend form are 506 px above the viewport (`$A/shots/scroll-amigos-from-config.png`).
  - Open Extrato, scroll to row 41 (`scrollY` 3275), open it, then press "Voltar". Observed: the list is back at the top (`scrollY` 0).
  - Expected: a new screen opens at the top, and Back returns near the row the user left.
- **Why major.** It is hit in the normal demo path: Extrato or Configurações, then the tab bar. The first thing the audience sees is a mid-page view without the balance.
- **Fix.** Give the pathless root an element that renders `<Outlet />` and `<ScrollRestoration />` from `react-router`. It scrolls to the top on PUSH and REPLACE and restores the position on POP.
  - Extrato reloads its list on return, so the restore lands on a 5-row skeleton and clamps. Optionally use `getKey={(l) => l.pathname}` and accept that, or skip the restore on `/extrato` and keep it scroll-to-top only.
  - Verify with `$A/scroll2.cjs`: `scrollY` should be 0 after each tab change.

### Minor

**m1. Leaving Novo gasto while it saves moves the user back to Início later and rewrites history.**
- **Where.** `frontend/src/app/components/NewTransactionScreen.tsx:196-199`. The `navigate("/inicio", { replace: true, state })` call runs after `await createTransaction(...)`, even when the form has unmounted.
- **Reproduction** (`$A/staleNav.cjs`): delay the POST by 2 s, tap "Salvar gasto", then tap Extrato. Observed: the user is on `/extrato` and scrolling, and 2 s later is moved to `/inicio` with "Gasto registrado.". The Extrato history entry was replaced, so Back goes to `/novo-gasto` with an empty form.
- **Expected.** The user stays on Extrato. The expense is saved either way, and Extrato shows it on the next load.
- **Impact.** On a cold Render start, a save can take tens of seconds, so leaving during it is plausible in the demo.
- **Fix.** Keep a `mounted` ref, as `FriendPicker.tsx:225-233` already does. Navigate only when the form is still mounted. Also skip the `setSaving` and `setApiError` calls after unmount.

**m2. Cancelling the inline "Novo amigo" while it saves leaves a friend that exists but cannot be selected.**
- **Where.** `FriendPicker.tsx:198-201` (Cancelar and Escape) and `:162` ("Novo" toggles the form closed). The Cancelar button is `disabled` while saving, but Escape and the "Novo" toggle are not. `:250` drops the result when unmounted. `NewTransactionScreen.tsx:52-56` loads friends only once (`deps [requested]`), so nothing brings the new friend back.
- **Reproduction** (`$A/races.cjs` part 2): delay `POST /friends` by 2 s. Type a name, press Enter, then press Escape. Observed: the friend **is on the server** but **not in the picker**. Typing the same name again gives "Já existe um amigo com esse nome.". The only way out is a page reload, which loses the form.
- **Expected.** Either cancelling is blocked while saving, or the created friend still joins the list.
- **Fix.** Either change (a) or (b) closes it:
  - (a) Ignore Escape and the "Novo" toggle while `saving`.
  - (b) Keep calling the parent's `onCreated` (that is, `addFriend`) even after the form unmounts, because the parent is still mounted. Only skip selecting and focusing the friend.

**m3. A 2xx response with a non-JSON body crashes the screen instead of showing the card error.**
- **Where.** `services/api.ts:76-83` returns `null` for any body that does not parse. `:136-137` then returns that `null` as `T` when `response.ok`.
- **Reproduction** (`$A/edges.cjs`, case `ok200nonjson`): answer every API call with `200 text/html`. Observed: `/inicio`, `/configuracoes`, `/gastos-do-mes`, `/amigos` and `/extrato/1` throw `TypeError: Cannot read properties of null (reading 'balance_cents' | 'period' | 'by_person' | 'split')`, and the whole screen becomes `RouteError` "Algo deu errado". Only `/extrato` degrades to its card error.
- **Why it matters.** This is exactly what happens if `VITE_API_URL` points at the Vercel origin (its SPA fallback serves `index.html` with 200), or behind a captive portal.
- **Expected.** Each card shows "Algo deu errado. Tente novamente." with a retry, as it already does for an HTML 500.
- **Fix.** In `request()`, when `response.ok`, `response.status !== 204` and the body is `null`, throw `new ApiError(UNKNOWN_ERROR_CODE, UNKNOWN_ERROR_MESSAGE, response.status)`.
- **Related, inferred and not reproduced:** an `AbortError` raised while the body is read is also swallowed into `null` by `readJson`. `useResource` checks `signal.aborted`, so no screen is affected today. Rethrow an `AbortError` there.

**m4. A native `disabled` on the focused control drops keyboard focus to `body`.** This is the same class of issue as 012 n1, in two places 015 did not cover.
- **`PeriodNavigator.tsx:311` and `:324`.** Focus "Mês anterior", press Enter, then focus "Próximo mês" and press Enter. Back at offset 0 the button becomes `disabled`, and `document.activeElement` is `BODY` (`$A/races.cjs` part 1). The same happens on "Mês anterior" at −520.
- **`NewTransactionScreen.tsx:331`** (`disabled={saving}`). Keyboard "Salvar gasto" with the API answering 500: the alert shows, focus is on `BODY`, and the next Tab lands on the tab bar's "Início" (`$A/focus2.cjs`). The keyboard user has to tab back through the whole form.
- **Expected.** Focus stays on a control in place.
- **Fix.**
  - Novo gasto: use `aria-disabled={saving ? true : undefined}` (the pattern 015 T1 made safe; `savingRef` already blocks the second POST).
  - PeriodNavigator: when the press reaches the limit, move focus to the other arrow button, or use `aria-disabled` with a guard in `onClick`.

### Informational

- **n1. The adjustment form cannot reach a negative balance, but the balance can become negative.** Spec 012 (`spec.md:74`) assumes "the demo balance never goes below zero". In the shared demo, any visitor can save an expense larger than the balance. The header then shows "−R$ …" correctly, but "Novo saldo" (`MoneyField` and `parseBRL`, no sign) can only correct it to R$ 0,00 or above. This is a spec decision, so the code is not wrong. Reword the spec premise, or accept it.
- **n2. The detail screen's error state has no heading.** With the API down, `/extrato/1` renders `ErrorState` with no `h1` (`TransactionDetailScreen.tsx:87-91`; E6 printed an empty `h1` list). The not-found state does have an `h1`. Optional: give the error title the `h1`.
- **n3. Deploy note for phase 3, outside the 015 scope.** There is no `vercel.json`. Deep links such as `/extrato/70` on Vercel need an SPA rewrite to `index.html`. Together with m3, a wrong `VITE_API_URL` there would crash every screen.

## Summary

| ID | Severity | Area | File:line | Status |
| --- | --- | --- | --- | --- |
| M1 | major | Routing / UX | `routes.tsx:42-74` | open |
| m1 | minor | Race (unmount) | `NewTransactionScreen.tsx:196-199` | open |
| m2 | minor | Race (cancel while saving) | `FriendPicker.tsx:162,198-201,250` | open |
| m3 | minor | Error handling | `services/api.ts:76-83,136-137` | open |
| m4 | minor | Keyboard focus | `PeriodNavigator.tsx:311,324`; `NewTransactionScreen.tsx:331` | open |
| n1 | info | Spec premise | `docs/specs/012-settings-friends/spec.md:74` | accepted as info |
| n2 | info | A11y heading | `TransactionDetailScreen.tsx:87-91` | accepted as info |
| n3 | info | Deploy (phase 3) | (none) | accepted as info |

**AC1 (spec 015): PASS** (E3).

**Verdict: CHANGES REQUIRED. 1 major (M1) and 4 minors (m1 to m4) are open. No blocker.**
- What holds: money is integer cents throughout, the API contract matches exactly, the demo flow works end to end, and layout and contrast are clean at all four widths in both themes.
- Each finding has a small, local fix.
- Per spec AC3, each one is fixed in 015 or recorded with a reason in `docs/context.md` Open Questions.
- After that, rerun `$A/scroll2.cjs`, `$A/staleNav.cjs`, `$A/races.cjs`, `$A/edges.cjs` and `$A/focus2.cjs`, and `npm run build`.
