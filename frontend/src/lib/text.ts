/**
 * Invisible characters, as backend/app/text.py defines them: control (Cc),
 * format such as U+200B zero-width space (Cf) and separators (Z), plus the
 * blank letters (Hangul fillers U+115F, U+1160, U+3164, U+FFA0 and the empty
 * Braille cell U+2800). String.trim() alone keeps the last two groups.
 */
const INVISIBLE_CLASS = "[\\p{Cc}\\p{Cf}\\p{Z}\\u115F\\u1160\\u3164\\uFFA0\\u2800]";
const EDGE_INVISIBLE = new RegExp(`^${INVISIBLE_CLASS}+|${INVISIBLE_CLASS}+$`, "gu");

/** Trims invisible characters from both ends, the same way the API does. */
export function trimInvisible(text: string): string {
  return text.replace(EDGE_INVISIBLE, "");
}

const graphemeSegmenter = new Intl.Segmenter("pt-BR", { granularity: "grapheme" });

/**
 * User-perceived characters: "é" typed as "e" + combining accent, or an emoji
 * family joined by U+200D, is one grapheme.
 */
export function graphemes(text: string): string[] {
  return Array.from(graphemeSegmenter.segment(text), (part) => part.segment);
}
