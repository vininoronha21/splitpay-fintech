import gsap from "gsap";
import { formatBRL } from "../../lib/money.ts";
import { SPLIT_MODES, userShare } from "./FeatureScreens.tsx";

/**
 * Timelines for the screens drawn in markup (FeatureScreens.tsx) and the small
 * examples in "Por que é diferente". The markup is the final state: building a
 * timeline sets each "from" state, `play` runs it from the start and `restore`
 * writes the final text back (tweens are undone by the gsap context).
 */
export interface ScreenMotion {
  play: () => void;
  restore: () => void;
}

/** When the counters of each screen start, in seconds into its timeline. */
const COUNT_AT: Record<string, number> = {
  split: 0.1,
  rules: 0,
  receivables: 1.15,
  balance: 0.35,
  charts: 0.15,
};

/** Seconds between two split modes in the split screen's cycle. */
const MODE_STEP = 1.5;

/** The text node React rendered inside `element`, or null. Writing to it keeps the node React owns. */
function textNode(element: Element | null): Text | null {
  const node = element?.firstChild ?? null;
  return node instanceof Text ? node : null;
}

/** Writes integer cents through formatBRL, with "+" when the amount is signed and positive. */
function moneyWriter(node: Text, signed: boolean): (cents: number) => void {
  return (cents) => {
    const text = formatBRL(Math.round(cents));
    node.nodeValue = signed && cents > 0 ? `+${text}` : text;
  };
}

interface Counter {
  write: (cents: number) => void;
  from: number;
  to: number;
}

function counterOf(element: HTMLElement): Counter | null {
  const node = textNode(element);
  const to = Number(element.dataset.countTo);
  const from = Number(element.dataset.countFrom ?? 0);
  if (!node || !Number.isSafeInteger(to) || !Number.isSafeInteger(from)) return null;
  return { write: moneyWriter(node, element.dataset.countSign === "plus"), from, to };
}

/** Tweens a proxy in integer cents (snap 1) and formats every frame: money never passes through a float amount. */
function countTween(counter: Counter, from: number, to: number, duration = 0.9): gsap.core.Tween {
  const state = { cents: from };
  return gsap.fromTo(
    state,
    { cents: from },
    {
      cents: to,
      duration,
      ease: "power2.out",
      snap: { cents: 1 },
      onUpdate: () => counter.write(state.cents),
    },
  );
}

/** Text written by script: `reset` before each run (restart fires no onUpdate at time 0), `restore` on cleanup. */
interface TextState {
  reset: () => void;
  restore: () => void;
}

/** Adds one `data-anim` element to the timeline; returns the text state of "type". */
function addAnim(tl: gsap.core.Timeline, element: HTMLElement): TextState | null {
  const at = Number(element.dataset.at ?? 0);
  switch (element.dataset.anim) {
    case "rise":
      tl.from(element, { y: 14, opacity: 0, duration: 0.5, ease: "power2.out" }, at);
      return null;
    case "pop":
      tl.from(element, { scale: 0.6, opacity: 0, duration: 0.45, ease: "back.out(2)" }, at);
      return null;
    case "grow-x":
      tl.from(element, { scaleX: 0, transformOrigin: "left center", duration: 0.8, ease: "power2.out" }, at);
      return null;
    case "grow-y":
      tl.from(element, { scaleY: 0, transformOrigin: "top center", duration: 0.6, ease: "power2.out" }, at);
      return null;
    case "spin":
      tl.from(element, { rotation: -100, scale: 0.82, opacity: 0, duration: 1, ease: "power3.out" }, at);
      return null;
    case "flash":
      tl.fromTo(
        element,
        { opacity: 0 },
        { opacity: 1, duration: 0.25, ease: "power1.out", yoyo: true, repeat: 1, repeatDelay: 0.6 },
        at,
      );
      return null;
    case "type": {
      const node = textNode(element);
      if (!node) return null;
      const full = node.nodeValue ?? "";
      const state = { length: 0 };
      tl.fromTo(
        state,
        { length: 0 },
        {
          length: full.length,
          duration: full.length * 0.055,
          ease: "none",
          snap: { length: 1 },
          onUpdate: () => {
            node.nodeValue = full.slice(0, state.length);
          },
        },
        at,
      );
      return {
        reset: () => {
          node.nodeValue = "";
        },
        restore: () => {
          node.nodeValue = full;
        },
      };
    }
    default:
      return null;
  }
}

/** The split screen cycles Porcentagem, Valor fixo and back to Igual, the static state. */
function addSplitCycle(tl: gsap.core.Timeline, root: HTMLElement): TextState | null {
  const thumbs = Array.from(root.querySelectorAll<HTMLElement>("[data-split-thumb]"));
  const labels = Array.from(root.querySelectorAll<HTMLElement>("[data-split-label]"));
  const line = root.querySelector<HTMLElement>("[data-split-line]");
  const lineNode = textNode(line);
  const friendNode = textNode(root.querySelector("[data-split-friend]"));
  const userNode = textNode(root.querySelector("[data-split-user]"));
  if (!line || !lineNode || !friendNode || !userNode) return null;

  const writeFriend = moneyWriter(friendNode, false);
  const writeUser = moneyWriter(userNode, false);

  const selectLabel = (index: number) => {
    labels.forEach((label, position) => {
      const selected = position === index;
      label.classList.toggle("font-semibold", selected);
      label.classList.toggle("text-segment-selected-text", selected);
      label.classList.toggle("font-medium", !selected);
      label.classList.toggle("text-muted", !selected);
    });
  };
  const setMode = (index: number) => {
    const mode = SPLIT_MODES[index];
    if (!mode) return;
    selectLabel(index);
    lineNode.nodeValue = mode.line;
    writeFriend(mode.friendCents);
    writeUser(userShare(mode.friendCents));
  };

  let previous = 0;
  let at = 0.9;
  for (const index of [1, 2, 0]) {
    const from = SPLIT_MODES[previous];
    const to = SPLIT_MODES[index];
    const outgoing = thumbs[previous];
    const incoming = thumbs[index];
    if (!from || !to || !outgoing || !incoming) continue;
    tl.to(outgoing, { opacity: 0, duration: 0.25, ease: "power1.out" }, at)
      .to(incoming, { opacity: 1, duration: 0.25, ease: "power1.out" }, at)
      .call(selectLabel, [index], at)
      .to(line, { opacity: 0, duration: 0.12, ease: "power1.in" }, at)
      .call(
        () => {
          lineNode.nodeValue = to.line;
        },
        [],
        at + 0.12,
      )
      .to(line, { opacity: 1, duration: 0.2, ease: "power1.out" }, at + 0.12)
      .add(countTween({ write: writeFriend, from: 0, to: 0 }, from.friendCents, to.friendCents, 0.6), at)
      .add(
        countTween({ write: writeUser, from: 0, to: 0 }, userShare(from.friendCents), userShare(to.friendCents), 0.6),
        at,
      );
    previous = index;
    at += MODE_STEP;
  }
  // Igual is both the first and the final mode.
  return { reset: () => setMode(0), restore: () => setMode(0) };
}

/**
 * Builds the paused timeline of one screen (`data-screen` names its counters'
 * start) or of an example box. Call inside a gsap context so its tweens revert.
 */
export function buildScreenMotion(root: HTMLElement): ScreenMotion {
  const tl = gsap.timeline({ paused: true });
  const texts: TextState[] = [];

  for (const element of Array.from(root.querySelectorAll<HTMLElement>("[data-anim]"))) {
    const text = addAnim(tl, element);
    if (text) texts.push(text);
  }

  const counters = Array.from(root.querySelectorAll<HTMLElement>("[data-count-to]"))
    .map(counterOf)
    .filter((counter): counter is Counter => counter !== null);
  const countAt = COUNT_AT[root.dataset.screen ?? ""] ?? 0;
  counters.forEach((counter, index) => {
    tl.add(countTween(counter, counter.from, counter.to), countAt + index * 0.08);
  });
  texts.push({
    reset: () => counters.forEach((counter) => counter.write(counter.from)),
    restore: () => counters.forEach((counter) => counter.write(counter.to)),
  });

  if (root.dataset.screen === "split") {
    const split = addSplitCycle(tl, root);
    if (split) texts.push(split);
  }

  return {
    play: () => {
      tl.restart();
      texts.forEach((text) => text.reset());
    },
    restore: () => {
      tl.pause();
      texts.forEach((text) => text.restore());
    },
  };
}
