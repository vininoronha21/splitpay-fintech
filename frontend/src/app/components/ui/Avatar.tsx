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

/** "Ana Lima" -> "AL", "vinicius" -> "VI", "" -> "?". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1] ?? "") : "";
  const letters = last ? `${first.charAt(0)}${last.charAt(0)}` : first.slice(0, 2);
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
