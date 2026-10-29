# 013 Landing Page — Plan

Status: approved

## Files to Create/Modify

- `frontend/package.json` and `package-lock.json`: add `gsap` 3.15.0 and `@gsap/react` 2.1.2, exact versions.
- `frontend/src/app/landing/` (new folder, the only screen that loads GSAP):
  - `LandingScreen.tsx`: page structure, header, sections, footer;
  - `HeroPreview.tsx`: the sample-values card built from `Money`, `TransactionRow` and `StatusPill`;
  - `FeatureGrid.tsx`, `HowItWorks.tsx`;
  - `useLandingMotion.ts`: every GSAP call (timeline, counter, ScrollTrigger reveals, rail), inside `gsap.matchMedia` with the reduced-motion branch.
- `frontend/src/app/routes.tsx`: `/` uses the router's `lazy` to load `LandingScreen`, replacing the redirect.
- `frontend/src/app/components/BrandMark.tsx` or `LoginScreen.tsx`: extract the dark hero background (glow, grid) into a shared piece only if both screens use it.
- `docs/development/repository-structure.md`: the `app/landing/` folder and why it is separate (its own chunk); the two dependencies.
- `.claude/skills/splitpay-design-language/references/motion.md`: GSAP is now installed, with the pinned versions.

## Architectural & Tech Decisions

- **Separate folder and chunk:** `app/landing/` keeps GSAP imports out of `app/components/`. A rule in `repository-structure.md`: only `app/landing/` imports `gsap`.
- **Motion in one hook:** `useLandingMotion(scopeRef)` calls `useGSAP` with the scope and registers `ScrollTrigger` once. It returns nothing; components only carry `data-motion` attributes the hook selects.
- **Counter:** tweens `{ cents }` with `snap: { cents: 1 }` and writes `formatBRL(cents)` into the balance element; with hide values on, the hidden mask shows and no counter runs.
- **Reduced motion:** `gsap.matchMedia()` with `(prefers-reduced-motion: no-preference)`; the reduce branch does nothing, so the CSS final state stays.
- **Frontend TS Interfaces:** none new beyond component props.
- **Database Schema:** no change.
- **Changes during T1 and T2:**
  - The glows and grid of the dark hero moved from `LoginScreen.tsx` into a shared `components/HeroBackdrop.tsx`, used by `/entrar` and the landing.
  - `services/api.ts` exports `API_DOCS_URL` for the footer, so the base URL logic stays in one place.
  - The lazy `/` route has a dark `hydrateFallbackElement`, so the first visit never flashes a light page while the chunk loads.
  - The counter writes into the text node React owns inside `Money`, and the cleanup writes the final value back if the page unmounts mid-count.
  - T3: feature cards and steps reveal with `ScrollTrigger.batch` (`top 85%`, `once`), so each card reveals as it arrives on a phone and a desktop row still staggers by 0.1 s. `HeroBackdrop` gains a `landing` variant with larger glows from `lg`; `/entrar` keeps the default.

## Test Strategy

- `npm run build`; compare chunk sizes before and after: the app entry grows by at most 2 kB gzip, GSAP appears only in the landing chunk.
- **Playwright:**
  - `/` without a saved name: CTAs go to `/entrar`; with a name: to `/inicio`;
  - "Como funciona" scrolls to the section; footer links have `target="_blank"` and `rel="noopener noreferrer"`;
  - after the animations, the counter reads R$ 7.063,97; with reduced motion, every `data-motion` element has opacity 1 and no transform on first paint, and the counter shows the final value at once;
  - navigating to `/inicio` downloads no GSAP chunk (network log);
  - layout scan at 360, 390, 768 and 1280 in both themes, with and without reduced motion; keyboard sweep.
- Copy scan and the AA contrast of every new text pair.

## Risks & Edge Cases

- **ScrollTrigger and lazy layout:** fonts and images can shift positions; call `ScrollTrigger.refresh()` after fonts load.
- **Hidden content if JS fails:** avoided by never hiding in CSS.
- **Low-end phones:** few elements animate at once; test at 4x CPU throttling.
