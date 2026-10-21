/**
 * Money helpers. Amounts are integer cents end to end; formatting and parsing
 * work on digit strings, so no floating-point value ever represents money.
 */

/** U+2212 MINUS SIGN: typographic minus, the same width as "+" in tabular figures. */
const MINUS_SIGN = "\u2212";

/** Shown instead of an amount while "hide values" is on. */
export const HIDDEN_BRL = "R$ ••••";

/** Thousands groups with dots: "1234567" -> "1.234.567". */
function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Formats integer cents as "R$ 1.234,56"; negatives as "−R$ 1.234,56". */
export function formatBRL(cents: number): string {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`formatBRL expects integer cents, received ${String(cents)}`);
  }
  const sign = cents < 0 ? MINUS_SIGN : "";
  // At least three digits so the last two are always the centavos.
  const digits = String(Math.abs(cents)).padStart(3, "0");
  const reais = digits.slice(0, -2);
  const centavos = digits.slice(-2);
  return `${sign}R$ ${groupThousands(reais)},${centavos}`;
}

/**
 * Accepted shapes after an optional "R$" prefix: plain reais ("1234"), reais with
 * dot thousands groups ("1.234"), each optionally followed by a comma and up to two
 * decimals ("1234,5", "1.234,56", "12,"). Signs, letters and a third decimal fail.
 */
const BRL_PATTERN = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{0,2}))?$/;

/** Parses pt-BR money text into integer cents, or null when invalid or negative. */
export function parseBRL(text: string): number | null {
  const compact = text.trim().replace(/^R\$\s*/, "");
  const match = BRL_PATTERN.exec(compact);
  if (!match) {
    return null;
  }
  const reais = (match[1] ?? "").replace(/\./g, "");
  const centavos = (match[2] ?? "").padEnd(2, "0");
  const cents = Number(`${reais}${centavos}`);
  return Number.isSafeInteger(cents) ? cents : null;
}
