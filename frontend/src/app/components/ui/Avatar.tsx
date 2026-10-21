import { graphemes, trimInvisible } from "../../../lib/text.ts";
import { cx } from "./focus.ts";

export type AvatarSize = "sm" | "md";
export type AvatarTone = "neutral" | "accent";

export interface AvatarProps {
  name: string;
  size?: AvatarSize;
  /** `accent` matches the friend avatars of the prototype; `neutral` is the default. */
  tone?: AvatarTone;
  /** Accessible name; without it the avatar is decorative (the name is shown beside it). */
  label?: string;
  className?: string;
}

const SIZE_CLASS: Record<AvatarSize, string> = {
  sm: "size-8 text-xs",
  md: "size-10 text-[13px]",
};

const TONE_CLASS: Record<AvatarTone, string> = {
  neutral: "bg-neutral-soft text-neutral-soft-text",
  accent: "bg-accent-soft text-accent-soft-text",
};

/**
 * "Ana Lima" -> "AL", "vinicius" -> "VI", "Ana 😀" -> "A😀", "" -> "?".
 * Works on graphemes, so an emoji or a decomposed accent is never split.
 */
export function initials(name: string): string {
  const words = trimInvisible(name).split(/\s+/u).map(trimInvisible).filter(Boolean);
  const first = graphemes(words[0] ?? "");
  const last = words.length > 1 ? graphemes(words[words.length - 1] ?? "") : [];
  const letters = last.length > 0 ? `${first[0] ?? ""}${last[0] ?? ""}` : first.slice(0, 2).join("");
  return letters.toLocaleUpperCase("pt-BR") || "?";
}

export function Avatar({ name, size = "md", tone = "neutral", label, className }: AvatarProps) {
  return (
    <span
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      className={cx(
        "grid shrink-0 place-items-center rounded-full font-bold select-none",
        SIZE_CLASS[size],
        TONE_CLASS[tone],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
