# Motion (GSAP)

The Figma files contain no animation: everything here is a recommendation for the Landing Page and Dashboard (`docs/context.md`: "GSAP on Landing Page and Phase 2 UI"). Motion supports comprehension of money flows. It never delays reading a balance.

## Prerequisites

- GSAP is installed for the landing only: `gsap` 3.15.0 and `@gsap/react` 2.1.2 (spec 013), imported only from `frontend/src/app/landing/` (see `useLandingMotion.ts`). Using it in app screens needs a spec that says why CSS transitions are not enough and accepts loading GSAP in the app chunk.
- For API details load the `gsap-skills` skills (`gsap-core`, `gsap-scrolltrigger`, `gsap-react`, `gsap-timeline`, `gsap-performance`). They are the reference, this file only sets SplitPay's choices.
- CSS covers hover, press and focus states. Use GSAP only for sequencing, scroll and number tweens.

## Principles

1. Animate `transform` and `opacity` only (no layout properties).
2. Short: 150 to 250 ms for feedback, 400 to 700 ms for entrances. Nothing blocks input.
3. One easing family: `power2.out` for entrances, `power2.inOut` for movement.
4. Reduced motion is the default path, not an afterthought: everything must be readable and usable with no animation.
5. In React, create animations inside `useGSAP` (or `useEffect` plus `gsap.context`) with a scope ref and clean up on unmount.

## Reduced motion wrapper

```ts
gsap.matchMedia().add(
  { reduce: "(prefers-reduced-motion: reduce)", ok: "(prefers-reduced-motion: no-preference)" },
  (ctx) => {
    const { reduce } = ctx.conditions as { reduce: boolean };
    if (reduce) return; // leave elements in their final state
    // entrance timelines here
  },
);
```

Final state lives in CSS. Elements are not hidden by default (`opacity-0` in markup breaks no-JS and reduced motion). Set the "from" state in JS inside the non-reduced branch (`gsap.from`).

## Recipes

| Where | Motion | Values |
| --- | --- | --- |
| Landing hero | Timeline: pill, title lines, lead, CTA, preview | `y: 24, opacity: 0, duration: .6, stagger: .08` |
| Landing sections | ScrollTrigger reveal, once | `start: "top 85%"`, `toggleActions: "play none none none"` |
| Bento / step list | Stagger children | `stagger: .1` |
| Active step | Rail fill height scrubbed to scroll | `scrub: true`, rail only, transform `scaleY` |
| Balance and stat values | Count-up from previous to new value | `duration: .8`, `ease: "power2.out"`, tween integer cents and format each frame through the shared money helper |
| Charts | Bars grow from the baseline, donut slices sweep | `scaleY: 0 -> 1` with `transformOrigin: "bottom"`, `duration: .6`, `stagger: .05` |
| Period switch | Cross-fade content | `opacity` 150 ms, no height jump (fixed card height) |
| List insert (new gasto) | Row slides in, highlight fades | `y: -8, opacity: 0`, highlight `bg-accent/10 -> transparent` over 1.2 s |
| Page transitions | None for the MVP | Avoid for performance and complexity |

## Money counters

Tween an integer in cents, never a float amount of reais, then format every frame:

```ts
const state = { cents: from };
gsap.to(state, { cents: to, duration: 0.8, ease: "power2.out", snap: { cents: 1 },
  onUpdate: () => { el.textContent = formatBRL(state.cents); } });
```

With reduced motion, write the final value immediately. Keep `aria-live` off for counters, and announce the final value only when it changes because of a user action.

## Do not

- Do not parallax or skew the hero cards on mobile (the Figma hero uses rotation and skew as a static decoration; keep it decorative and hide it below `md`).
- Do not animate more than a few elements at once on low-end phones. Check with the browser performance panel at 4x CPU throttling.
- Do not loop animations that run forever near financial data.
- Do not use `will-change` globally; set it only on elements animating right now.
