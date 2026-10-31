# 016 Landing v2 and User Menu — Plan

## Files
- `frontend/src/app/components/UserMenu.tsx` (new): disclosure button plus a two-link popover. Used by `AppLayout.tsx` (desktop avatar) and `BalanceHeader.tsx` (mobile initials and greeting).
- `frontend/src/app/components/LoginScreen.tsx`: drop the academic line.
- `frontend/src/app/landing/`: `LandingScreen.tsx` (arrow, hero pill, footer, section order), new section components (`FeatureTour.tsx`, `FeatureScreens.tsx`, `WhyDifferent.tsx`, `StartupSection.tsx`), `useLandingMotion.ts` (ScrollTrigger timelines under `gsap.matchMedia`). `HowItWorks.tsx` kept.

## Approach
- Two parallel implementers with disjoint files: one owns the user menu and LoginScreen, one owns `landing/`.
- Motion: `gsap.matchMedia()` with `(prefers-reduced-motion: no-preference)` and width breakpoints; pinning only from `md`; hover tilt only under `(hover: hover) and (pointer: fine)`. `useGSAP` scope cleans everything on unmount.
- Static markup is the final state; motion sets `from` states in JavaScript only.

## Risks
- Pinning with the fixed top nav and lazy images: call `ScrollTrigger.refresh()` after fonts load.
- Mobile Safari address bar resizing: `ignoreMobileResize`, no pinning below `md`.
- Bundle: keep GSAP and ScrollTrigger inside the lazy landing chunk.
