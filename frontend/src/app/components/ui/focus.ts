/**
 * Keyboard focus ring shared by every interactive primitive. `accent-text` is the
 * amber step that passes 3:1 against both light and dark surfaces.
 */
export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-text";

/** Focus ring for controls placed on an amber fill, where `accent-text` would blend in. */
export const focusRingOnAccent =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-accent";

/** Joins class names, skipping empty values. */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
