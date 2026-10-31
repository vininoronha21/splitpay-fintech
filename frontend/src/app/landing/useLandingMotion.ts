import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { RefObject } from "react";
import { formatBRL } from "../../lib/money.ts";
import { SAMPLE_BALANCE_CENTS } from "./HeroPreview.tsx";
import { buildScreenMotion, type ScreenMotion } from "./screenMotion.ts";

// Registered once, when the landing chunk loads. Only app/landing/ imports GSAP,
// so the app screens never download it.
gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Hero entrance order: the timeline staggers these one after the other. */
const HERO_PARTS: readonly string[] = ["hero-title", "hero-lead", "hero-ctas", "hero-preview"];

/** Entrance values from the design language (references/motion.md). */
const ENTRANCE: gsap.TweenVars = { y: 24, opacity: 0, duration: 0.6, ease: "power2.out" };
/** Reveals leave no inline style behind once played, so the settled page is the static markup. */
const CLEAR = "transform,opacity";

/**
 * Media queries for gsap.matchMedia. Every motion condition includes
 * no-preference, so reduced motion matches none of them and the page stays as
 * the static markup. `large` is the two-column hero, the only layout where its
 * layers can drift apart without meeting. `stage` (pinned tour and statement)
 * needs md and enough height for the stage; `fine` (tilt) needs a real pointer.
 */
const CONDITIONS = {
  motion: "(prefers-reduced-motion: no-preference)",
  wide: "(prefers-reduced-motion: no-preference) and (min-width: 768px)",
  large: "(prefers-reduced-motion: no-preference) and (min-width: 1024px)",
  stage: "(prefers-reduced-motion: no-preference) and (min-width: 768px) and (min-height: 640px)",
  fine: "(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)",
};

type Conditions = Record<keyof typeof CONDITIONS, boolean>;
type Cleanup = () => void;

function all(scope: ParentNode, name: string): HTMLElement[] {
  return Array.from(scope.querySelectorAll<HTMLElement>(`[data-motion="${name}"]`));
}

function one(scope: ParentNode, name: string): HTMLElement | null {
  return scope.querySelector<HTMLElement>(`[data-motion="${name}"]`);
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

/** Plays a screen timeline the first time its element comes into view, from either direction. */
function playOnEnter(trigger: HTMLElement, motion: ScreenMotion) {
  let played = false;
  const play = () => {
    if (played) return;
    played = true;
    motion.play();
  };
  ScrollTrigger.create({ trigger, start: "top 80%", end: "bottom 20%", onEnter: play, onEnterBack: play });
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

/** Hero: entrance timeline and the balance count-up. Returns the cleanup that writes the real value back. */
function heroEntrance(scope: HTMLElement): Cleanup {
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
  // Interrupted mid-count (unmount or the media query flips): leave the real value.
  return () => {
    if (text) text.nodeValue = finalText;
  };
}

/** Hero layers drift apart as it scrolls away: backdrop slow, copy a little, preview faster (lg, two columns). */
function heroParallax(scope: HTMLElement) {
  const section = scope.querySelector<HTMLElement>('section[aria-labelledby="landing-title"]');
  if (!section) return;
  const scrub = { trigger: section, start: "top top", end: "bottom top", scrub: true };
  const layers: Array<[string, gsap.TweenVars]> = [
    ["hero-backdrop", { y: 140 }],
    ["hero-copy", { y: 70 }],
    ["hero-float", { y: -50 }],
  ];
  for (const [name, vars] of layers) {
    const layer = one(scope, name);
    if (layer) gsap.to(layer, { ...vars, ease: "none", scrollTrigger: scrub });
  }
}

/** Vertical parallax for decorative layers: `data-speed` is a fraction of the section height. */
function parallax(section: HTMLElement) {
  for (const layer of all(section, "parallax")) {
    const speed = Number(layer.dataset.speed ?? 0);
    gsap.fromTo(
      layer,
      { y: () => -speed * section.offsetHeight * 0.5 },
      {
        y: () => speed * section.offsetHeight * 0.5,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true },
      },
    );
  }
}

/**
 * Feature tour as a pinned stage (md and up, enough height). The five blocks are
 * stacked in one place; scrolling crossfades copy and screen contents while the
 * device chrome of the first block stays, so the screen seems to change inside
 * one device. Snaps to each feature. Returns null when the stage would not fit
 * the viewport, so the caller keeps the stacked list.
 */
function tourStage(tour: HTMLElement, motions: Map<HTMLElement, ScreenMotion>, fine: boolean): Cleanup | null {
  const progress = one(tour, "tour-progress");
  const list = one(tour, "tour-list");
  const steps = all(tour, "tour-step");
  const copies = all(tour, "tour-copy");
  const devices = all(tour, "device");
  const chromes = all(tour, "chrome");
  const contents = all(tour, "screen-content");
  const labels = all(tour, "tour-label");
  const bars = all(tour, "tour-bar");
  const n = steps.length;
  if (!progress || !list || n < 2 || copies.length !== n || contents.length !== n || devices.length !== n) return null;

  gsap.set(progress, { display: "grid" });
  gsap.set(list, { position: "relative" });
  gsap.set(steps, { position: "absolute", top: 0, left: 0, right: 0 });
  gsap.set(chromes.slice(1), { opacity: 0 });

  // Every device gets the tallest screen's height and the list the tallest block's,
  // so the stage never changes size between features. Runs again on every refresh
  // (resize, fonts), outside the context, so the cleanup clears these heights.
  const measure = () => {
    gsap.set([...devices, ...steps], { height: "auto" });
    gsap.set(devices, { height: Math.max(...devices.map((device) => device.offsetHeight)) });
    gsap.set(list, { height: Math.max(...steps.map((step) => step.offsetHeight)) });
    gsap.set(steps, { height: "100%" });
  };
  measure();
  if (tour.offsetHeight > window.innerHeight - 32) {
    // Taller than the viewport: a pinned stage would clip. Undo and keep the list.
    gsap.set([progress, list, ...steps, ...devices, ...chromes], { clearProps: "all" });
    return null;
  }
  ScrollTrigger.addEventListener("refreshInit", measure);

  let active = -1;
  const setActive = (index: number) => {
    if (index === active) return;
    active = index;
    labels.forEach((label, position) => {
      label.classList.toggle("text-text", position === index);
      label.classList.toggle("text-muted", position !== index);
    });
    steps.forEach((step, position) => {
      step.style.pointerEvents = position === index ? "" : "none";
    });
    const content = contents[index];
    const motion = content ? motions.get(content) : undefined;
    motion?.play();
  };

  // Holds and transitions of one unit each: hold 0, transition 1, hold 1, ...
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: tour,
      start: "center center",
      end: () => `+=${(n - 1) * window.innerHeight * 0.85}`,
      pin: true,
      scrub: 0.6,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      // No inertia: a fast flick settles on the next feature instead of skipping several.
      snap: {
        snapTo: "labelsDirectional",
        inertia: false,
        duration: { min: 0.2, max: 0.6 },
        delay: 0.08,
        ease: "power1.inOut",
      },
      // Transition i runs from 2i - 1 to 2i; its midpoint hands the stage to feature i.
      onUpdate: (self) => setActive(Math.min(n - 1, Math.floor((self.progress * (2 * n - 1) + 0.5) / 2))),
    },
  });
  tl.addLabel("step0", 0.5);
  const firstBar = bars[0];
  if (firstBar) tl.fromTo(firstBar, { scaleX: 0 }, { scaleX: 1, duration: 1 }, 0);
  for (let index = 1; index < n; index += 1) {
    const at = 2 * index - 1;
    const bar = bars[index];
    tl.to(copies[index - 1] ?? [], { y: -40, opacity: 0, duration: 0.5, ease: "power2.in" }, at)
      .to(contents[index - 1] ?? [], { y: -28, opacity: 0, duration: 0.45, ease: "power2.in" }, at)
      .fromTo(copies[index] ?? [], { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" }, at + 0.5)
      .fromTo(contents[index] ?? [], { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" }, at + 0.45)
      .addLabel(`step${index}`, at + 1.5);
    if (bar) tl.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 2 }, at);
  }
  tl.to({}, { duration: 1 }, 2 * (n - 1));

  // The first screen builds as the stage scrolls into view, before the pin starts.
  ScrollTrigger.create({
    trigger: tour,
    start: "top 75%",
    onEnter: () => {
      if (active === -1) setActive(0);
    },
  });

  // Tilt: the stage moves as one device, so every layer turns together.
  let untilt: Cleanup = () => undefined;
  if (fine) untilt = tilt(list, devices, { angle: 6, lift: 0 });

  return () => {
    ScrollTrigger.removeEventListener("refreshInit", measure);
    untilt();
    labels.forEach((label) => {
      label.classList.remove("text-text");
      label.classList.add("text-muted");
    });
    steps.forEach((step) => {
      step.style.pointerEvents = "";
    });
    gsap.set([list, ...steps, ...devices], { clearProps: "height" });
  };
}

/** Stacked tour (phones, short screens): copy and screen reveal, then the screen plays once. */
function tourStacked(tour: HTMLElement, motions: Map<HTMLElement, ScreenMotion>, context: gsap.Context) {
  reveal([...all(tour, "tour-copy"), ...all(tour, "screen")], context);
  for (const content of all(tour, "screen-content")) {
    const motion = motions.get(content);
    if (motion) playOnEnter(content, motion);
  }
}

/** "Por que é diferente": words light up with scroll, pinned on wide screens. */
function statement(section: HTMLElement, stage: boolean) {
  const block = one(section, "why-pin");
  const words = all(section, "word");
  if (!block || words.length === 0) return;
  gsap.fromTo(
    words,
    { opacity: 0.16 },
    {
      opacity: 1,
      stagger: 0.1,
      ease: "none",
      scrollTrigger: stage
        ? { trigger: block, start: "center center", end: "+=70%", pin: true, scrub: 0.5, anticipatePin: 1 }
        : { trigger: block, start: "top 80%", end: "bottom 45%", scrub: 0.5 },
    },
  );
}

interface TiltOptions {
  /** Largest rotation in degrees. */
  angle: number;
  /** Lift in px while hovered. */
  lift: number;
}

/**
 * Pointer tilt: `area` listens, `targets` turn toward the pointer and lift.
 * quickTo reuses one tween per property, so pointermove never piles up tweens.
 */
function tilt(area: HTMLElement, targets: HTMLElement[], { angle, lift }: TiltOptions): Cleanup {
  gsap.set(targets, { transformPerspective: 900 });
  const movers = targets.map((target) => ({
    x: gsap.quickTo(target, "rotationY", { duration: 0.5, ease: "power3.out" }),
    y: gsap.quickTo(target, "rotationX", { duration: 0.5, ease: "power3.out" }),
    lift: gsap.quickTo(target, "y", { duration: 0.4, ease: "power3.out" }),
  }));
  const move = (event: PointerEvent) => {
    const box = area.getBoundingClientRect();
    const px = (event.clientX - box.left) / box.width - 0.5;
    const py = (event.clientY - box.top) / box.height - 0.5;
    for (const mover of movers) {
      mover.x(px * angle * 2);
      mover.y(-py * angle * 2);
      mover.lift(-lift);
    }
  };
  const leave = () => {
    for (const mover of movers) {
      mover.x(0);
      mover.y(0);
      mover.lift(0);
    }
  };
  area.addEventListener("pointermove", move);
  area.addEventListener("pointerleave", leave);
  return () => {
    area.removeEventListener("pointermove", move);
    area.removeEventListener("pointerleave", leave);
  };
}

/** "A startup": parallax layers, staggered cards and the roadmap line drawn with scroll. */
function startup(section: HTMLElement, wide: boolean, context: gsap.Context) {
  if (wide) parallax(section);
  reveal(all(section, "reveal"), context);
  reveal(all(section, "startup-card"), context);
  reveal(all(section, "milestone"), context);
  const roadmap = one(section, "roadmap");
  const line = one(section, "roadmap-line");
  if (roadmap && line) {
    gsap.fromTo(
      line,
      wide ? { scaleX: 0, transformOrigin: "left center" } : { scaleY: 0, transformOrigin: "top center" },
      {
        ...(wide ? { scaleX: 1 } : { scaleY: 1 }),
        ease: "none",
        scrollTrigger: { trigger: roadmap, start: "top 80%", end: "bottom 60%", scrub: true },
      },
    );
  }
}

/** "Como funciona": steps reveal and the rail fills with scroll (rail only). */
function howItWorks(scope: HTMLElement, context: gsap.Context) {
  reveal(all(scope, "step"), context);
  const steps = one(scope, "steps");
  const rails = all(scope, "rail");
  if (steps && rails.length > 0) {
    const rail = gsap.timeline({
      scrollTrigger: { trigger: steps, start: "top center", end: "bottom center", scrub: true },
    });
    for (const fill of rails) {
      rail.from(fill, { scaleY: 0, transformOrigin: "top center", ease: "none" });
    }
  }
}

/**
 * Landing motion (spec 013, extended by spec 016). The markup always holds the
 * final state; every "from" state is set here, inside the no-preference media
 * queries, so reduced motion and a failed script both show the finished page.
 * Only transform and opacity animate, nothing loops, and the triggers are
 * created in page order so each one measures after the pins above it.
 * useGSAP reverts it all on unmount (route change included).
 */
export function useLandingMotion(scopeRef: RefObject<HTMLElement>) {
  useGSAP(
    () => {
      const scope = scopeRef.current;
      if (!scope) return;
      // Mobile address bars resize the viewport while scrolling; that must not re-measure every trigger.
      ScrollTrigger.config({ ignoreMobileResize: true });

      const mm = gsap.matchMedia();
      mm.add(
        CONDITIONS,
        (context) => {
          const { motion, wide, large, stage, fine } = context.conditions as Conditions;
          if (!motion) return;
          const cleanups: Cleanup[] = [];

          // Hero.
          cleanups.push(heroEntrance(scope));
          if (large) heroParallax(scope);

          // Funcionalidades.
          const features = scope.querySelector<HTMLElement>("#funcionalidades");
          const tour = one(scope, "tour");
          if (features && tour) {
            reveal(all(features, "reveal"), context);
            const motions = new Map<HTMLElement, ScreenMotion>();
            for (const content of all(tour, "screen-content")) motions.set(content, buildScreenMotion(content));
            cleanups.push(() => motions.forEach((screen) => screen.restore()));
            const staged = stage ? tourStage(tour, motions, fine) : null;
            if (staged) cleanups.push(staged);
            else tourStacked(tour, motions, context);
            if (!staged && fine) {
              for (const device of all(tour, "device")) cleanups.push(tilt(device, [device], { angle: 5, lift: 4 }));
            }
          }

          // Por que é diferente.
          const why = scope.querySelector<HTMLElement>("#diferenciais");
          if (why) {
            statement(why, stage);
            reveal(all(why, "why-card"), context);
            for (const group of all(why, "count-group")) {
              const counts = buildScreenMotion(group);
              cleanups.push(counts.restore);
              playOnEnter(group, counts);
            }
          }

          // A startup.
          const company = scope.querySelector<HTMLElement>("#startup");
          if (company) startup(company, wide, context);

          // Como funciona.
          howItWorks(scope, context);

          // Hover tilt and lift on cards, real pointers only.
          if (fine) {
            for (const card of Array.from(scope.querySelectorAll<HTMLElement>("[data-tilt]"))) {
              cleanups.push(tilt(card, [card], { angle: 4, lift: 6 }));
            }
          }

          // Inter swaps in after first paint and moves every trigger; measure again.
          let active = true;
          void document.fonts.ready.then(() => {
            if (active) ScrollTrigger.refresh();
          });

          return () => {
            active = false;
            cleanups.forEach((cleanup) => cleanup());
          };
        },
        scope,
      );

      return () => mm.revert();
    },
    { scope: scopeRef },
  );
}
