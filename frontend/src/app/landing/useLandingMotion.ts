import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { RefObject } from "react";
import { formatBRL } from "../../lib/money.ts";
import { SAMPLE_BALANCE_CENTS } from "./HeroPreview.tsx";

// Registered once, when the landing chunk loads. Only app/landing/ imports GSAP,
// so the app screens never download it.
gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Hero entrance order: the timeline staggers these one after the other. */
const HERO_PARTS: readonly string[] = ["hero-pill", "hero-title", "hero-lead", "hero-ctas", "hero-preview"];

/** Entrance values from the design language (references/motion.md). */
const ENTRANCE: gsap.TweenVars = { y: 24, opacity: 0, duration: 0.6, ease: "power2.out" };
/** Reveals leave no inline style behind once played, so the settled page is the static markup. */
const CLEAR = "transform,opacity";

function all(scope: HTMLElement, name: string): HTMLElement[] {
  return Array.from(scope.querySelectorAll<HTMLElement>(`[data-motion="${name}"]`));
}

/**
 * Reveal once per item, as each one reaches 85% of the viewport. Items that enter
 * together (a row of cards on desktop) share one tween staggered by 0.1 s; on a
 * phone each card reveals as it arrives. The "from" state is set here, inside
 * the no-preference branch.
 */
function reveal(items: HTMLElement[], context: gsap.Context) {
  if (items.length === 0) return;
  gsap.set(items, { y: ENTRANCE.y, opacity: 0 });
  ScrollTrigger.batch(items, {
    start: "top 85%",
    once: true,
    onEnter: (batch) => {
      // A jump past the list (a fast scroll, a link) triggers the cards above the
      // viewport too: show those at once so the stagger starts with what is on screen.
      const passed = batch.filter((item) => item.getBoundingClientRect().bottom <= 0);
      const entering = batch.filter((item) => !passed.includes(item));
      // Created inside the media-query context, so a revert also undoes it.
      context.add(() => {
        if (passed.length > 0) gsap.set(passed, { clearProps: CLEAR });
        if (entering.length === 0) return;
        gsap.to(entering, {
          y: 0,
          opacity: 1,
          duration: ENTRANCE.duration,
          ease: ENTRANCE.ease,
          stagger: 0.1,
          clearProps: CLEAR,
        });
      });
    },
  });
}

/**
 * The balance's text node inside Money, or null while "hide values" shows the mask
 * (role="img"). Writing to the existing node keeps the one React owns.
 */
function balanceText(scope: HTMLElement): Text | null {
  const span = scope.querySelector<HTMLElement>('[data-motion="hero-balance"] > span');
  if (!span || span.getAttribute("role") === "img") return null;
  const node = span.firstChild;
  return node instanceof Text ? node : null;
}

/**
 * Landing motion (spec 013, AC8 and AC9). The markup always holds the final state;
 * every "from" state is set here, inside the no-preference media query, so reduced
 * motion and a failed script both show the finished page. Only transform and
 * opacity move, nothing loops, and useGSAP reverts it all on unmount.
 */
export function useLandingMotion(scopeRef: RefObject<HTMLElement>) {
  useGSAP(
    () => {
      const scope = scopeRef.current;
      if (!scope) return;

      const mm = gsap.matchMedia();
      mm.add(
        "(prefers-reduced-motion: no-preference)",
        (context) => {
          // Hero: one timeline, pill to preview card.
          const hero = HERO_PARTS.flatMap((name) => all(scope, name));
          const tl = gsap.timeline();
          tl.from(hero, { ...ENTRANCE, stagger: 0.08, clearProps: CLEAR });

          // Balance count-up in integer cents, starting with the preview card.
          const text = balanceText(scope);
          const finalText = formatBRL(SAMPLE_BALANCE_CENTS);
          if (text) {
            const counter = { cents: 0 };
            text.nodeValue = formatBRL(0);
            tl.to(
              counter,
              {
                cents: SAMPLE_BALANCE_CENTS,
                duration: 0.8,
                ease: "power2.out",
                snap: { cents: 1 },
                onUpdate: () => {
                  text.nodeValue = formatBRL(counter.cents);
                },
              },
              (HERO_PARTS.length - 1) * 0.08,
            );
          }

          // Feature cards and steps: reveal once as each scrolls into view.
          reveal(all(scope, "feature"), context);
          reveal(all(scope, "step"), context);

          // Steps rail: the two fills grow in turn, scrubbed to scroll (rail only).
          const steps = scope.querySelector('[data-motion="steps"]');
          const rails = all(scope, "rail");
          if (steps && rails.length > 0) {
            const rail = gsap.timeline({
              scrollTrigger: { trigger: steps, start: "top center", end: "bottom center", scrub: true },
            });
            for (const fill of rails) {
              rail.from(fill, { scaleY: 0, transformOrigin: "top center", ease: "none" });
            }
          }

          // Inter swaps in after first paint and moves every trigger; measure again.
          let active = true;
          void document.fonts.ready.then(() => {
            if (active) ScrollTrigger.refresh();
          });

          return () => {
            active = false;
            // Interrupted mid-count (unmount or the media query flips): leave the real value.
            if (text) text.nodeValue = finalText;
          };
        },
        scope,
      );

      return () => mm.revert();
    },
    { scope: scopeRef },
  );
}
