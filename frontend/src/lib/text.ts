/**
 * Invisible characters, as backend/app/text.py defines them (is_invisible):
 * - control (Cc), format such as U+200B zero-width space (Cf) and separators (Z),
 *   which also covers every character Python's str.isspace() accepts;
 * - the empty Braille cell U+2800, drawn as a gap;
 * - Unicode Default_Ignorable_Code_Point, the characters a font draws as nothing.
 *   Most are Cf, but some are marks (U+034F, the variation selectors U+FE00-FE0F,
 *   U+17B4) or letters (the Hangul fillers U+115F, U+1160, U+3164, U+FFA0), so the
 *   categories miss them. The ranges are listed as the backend lists them.
 * String.trim() alone keeps most of these.
 */
const INVISIBLE_CHARS =
  "\\p{Cc}\\p{Cf}\\p{Z}\\u2800" +
  "\\u00AD\\u034F\\u061C\\u115F\\u1160\\u17B4\\u17B5\\u180B-\\u180F\\u200B-\\u200F\\u202A-\\u202E" +
  "\\u2060-\\u206F\\u3164\\uFE00-\\uFE0F\\uFEFF\\uFFA0\\uFFF0-\\uFFF8" +
  "\\u{1BCA0}-\\u{1BCA3}\\u{1D173}-\\u{1D17A}\\u{E0000}-\\u{E0FFF}";
const EDGE_INVISIBLE = new RegExp(`^[${INVISIBLE_CHARS}]+|[${INVISIBLE_CHARS}]+$`, "gu");
/** Only invisible characters and marks (\p{M}, such as U+0301 combining acute), or nothing. */
const BLANK = new RegExp(`^[${INVISIBLE_CHARS}\\p{M}]*$`, "u");

/**
 * Trims invisible characters from both ends, the same way the API does. A
 * trailing variation selector goes too ("Bar ❤️" keeps "Bar ❤"), as in the API.
 */
export function trimInvisible(text: string): string {
  return text.replace(EDGE_INVISIBLE, "");
}

/**
 * True when nothing would be drawn on its own, as the API's is_blank: after
 * NFKD, every character is invisible or a mark. A mark only decorates the
 * character before it, so "\u0301" alone looks empty; NFKD turns "´" (U+00B4)
 * into a space plus that mark. The API rejects such required text, so the
 * forms do too.
 */
export function isBlank(text: string): boolean {
  return BLANK.test(text.normalize("NFKD"));
}

const graphemeSegmenter = new Intl.Segmenter("pt-BR", { granularity: "grapheme" });

/**
 * User-perceived characters: "é" typed as "e" + combining accent, or an emoji
 * family joined by U+200D, is one grapheme.
 */
export function graphemes(text: string): string[] {
  return Array.from(graphemeSegmenter.segment(text), (part) => part.segment);
}
