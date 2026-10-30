/**
 * Pure logic of Configurações and Amigos (spec 012): the balance adjustment,
 * category rules and friend name validation, and the lookups the screens
 * build from API lists. No React, so it runs under
 * `node --experimental-strip-types` without a browser.
 *
 * Validation mirrors the API (`AdjustmentCreate`, `CategoryRuleCreate`,
 * `FriendCreate`): text is trimmed with trimInvisible and maximum lengths
 * count code points, as Pydantic does. Amounts are integer cents throughout.
 */
import { parseBRL } from "./money.ts";
import { MAX_AMOUNT_CENTS } from "./transactionForm.ts";
import { trimInvisible } from "./text.ts";
import type {
  AdjustmentCreate,
  Cents,
  CategoryRule,
  CategoryRuleCreate,
  ReimbursementSummary,
} from "../types/api.ts";

export const REASON_MIN = 10;
export const REASON_MAX = 200;
export const KEYWORD_MAX = 80;
export const FRIEND_NAME_MAX = 60;

/** "Ajustar saldo" as typed. */
export interface AdjustmentValues {
  /** Text as typed in the MoneyField ("7.000,00"). */
  newBalanceText: string;
  reason: string;
}

export type AdjustmentField = "newBalance" | "reason";

/** Fields in screen order, so the card can focus the first invalid one. */
export const ADJUSTMENT_FIELD_ORDER: readonly AdjustmentField[] = ["newBalance", "reason"];

export type AdjustmentErrors = Partial<Record<AdjustmentField, string>>;

/** "Regras de categoria" add form as typed; `categoryId` is null until one is chosen. */
export interface RuleValues {
  keyword: string;
  categoryId: number | null;
}

export type RuleField = "keyword" | "category";

export const RULE_FIELD_ORDER: readonly RuleField[] = ["keyword", "category"];

export type RuleErrors = Partial<Record<RuleField, string>>;

const MESSAGES = {
  balanceRequired: "Informe o novo saldo.",
  balanceTooLarge: "Use um valor até R$ 10.000.000.000,00.",
  balanceUnchanged: "O novo saldo é igual ao saldo atual.",
  reasonTooShort: "Escreva pelo menos 10 caracteres.",
  keywordRequired: "Informe uma palavra-chave.",
  categoryRequired: "Escolha uma categoria.",
  friendRequired: "Informe o nome do amigo.",
} as const;

function tooLong(max: number): string {
  return `Use até ${max} caracteres.`;
}

/** Same shape as money.ts BRL_PATTERN, to tell a malformed amount from an oversized one. */
const BRL_SHAPE_PATTERN = /^(?:R\$\s*)?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{0,2})?$/;

/** A letter or digit in any script; the API keeps only those when it normalizes a keyword. */
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

/** Code points of the trimmed text, as Pydantic's max_length counts them. */
function visibleLength(text: string): number {
  return Array.from(trimInvisible(text)).length;
}

/** The new balance in cents (0..MAX_AMOUNT_CENTS), or null while empty or invalid. */
export function parseNewBalance(text: string): Cents | null {
  const cents = parseBRL(text);
  return cents !== null && cents <= MAX_AMOUNT_CENTS ? cents : null;
}

/** new - current, both integer cents: what the API stores as the delta (Business Rule 12). */
export function adjustmentDelta(newCents: Cents, currentCents: Cents): Cents {
  return newCents - currentCents;
}

/** "Diferença" under the field: the signed delta, or null while the field is empty, invalid or unchanged. */
export function previewDelta(newBalanceText: string, currentCents: Cents): Cents | null {
  const newCents = parseNewBalance(newBalanceText);
  if (newCents === null) return null;
  const delta = adjustmentDelta(newCents, currentCents);
  return delta === 0 ? null : delta;
}

function newBalanceError(text: string, currentCents: Cents): string | undefined {
  const cents = parseBRL(text);
  if (cents === null) {
    // parseBRL also returns null past Number.MAX_SAFE_INTEGER: a well-formed
    // amount that big is "too large", not "missing".
    return BRL_SHAPE_PATTERN.test(text.trim()) ? MESSAGES.balanceTooLarge : MESSAGES.balanceRequired;
  }
  if (cents > MAX_AMOUNT_CENTS) return MESSAGES.balanceTooLarge;
  if (cents === currentCents) return MESSAGES.balanceUnchanged;
  return undefined;
}

/** pt-BR error per invalid field of "Ajustar saldo"; an empty object means it can be sent. */
export function validateAdjustment(values: AdjustmentValues, currentCents: Cents): AdjustmentErrors {
  const errors: AdjustmentErrors = {};
  const balance = newBalanceError(values.newBalanceText, currentCents);
  if (balance) errors.newBalance = balance;
  const length = visibleLength(values.reason);
  if (length < REASON_MIN) errors.reason = MESSAGES.reasonTooShort;
  else if (length > REASON_MAX) errors.reason = tooLong(REASON_MAX);
  return errors;
}

/** Live counter under Justificativa: "3/10" until the minimum, then "12/200". */
export function reasonCounter(reason: string): string {
  const length = visibleLength(reason);
  return `${length}/${length < REASON_MIN ? REASON_MIN : REASON_MAX}`;
}

/** The `POST /balance/adjustments` body from values that passed validateAdjustment. Throws RangeError otherwise. */
export function toAdjustmentPayload(values: AdjustmentValues): AdjustmentCreate {
  const newCents = parseNewBalance(values.newBalanceText);
  if (newCents === null) {
    throw new RangeError("toAdjustmentPayload received an invalid new balance; call validateAdjustment() first");
  }
  return { new_balance_cents: newCents, reason: trimInvisible(values.reason) };
}

/**
 * pt-BR error per invalid field of the rule form. A keyword with no letter or
 * digit counts as missing: the API would normalize it to nothing. The API
 * still owns the 40-character limit after normalizing (its 422 message).
 */
export function validateRule(values: RuleValues): RuleErrors {
  const errors: RuleErrors = {};
  const keyword = trimInvisible(values.keyword);
  if (keyword === "" || !LETTER_OR_DIGIT.test(keyword)) errors.keyword = MESSAGES.keywordRequired;
  else if (visibleLength(keyword) > KEYWORD_MAX) errors.keyword = tooLong(KEYWORD_MAX);
  if (values.categoryId === null) errors.category = MESSAGES.categoryRequired;
  return errors;
}

/** The `POST /categories/rules` body from values that passed validateRule. Throws RangeError otherwise. */
export function toRulePayload(values: RuleValues): CategoryRuleCreate {
  if (values.categoryId === null) {
    throw new RangeError("toRulePayload received no category; call validateRule() first");
  }
  return { keyword: trimInvisible(values.keyword), category_id: values.categoryId };
}

/** pt-BR error for "Nome do amigo", or undefined when the API will accept it. */
export function validateFriendName(name: string): string | undefined {
  const length = visibleLength(name);
  if (length === 0) return MESSAGES.friendRequired;
  if (length > FRIEND_NAME_MAX) return tooLong(FRIEND_NAME_MAX);
  return undefined;
}

/** User rules and default rules, each in the API order (user rules newest first, defaults by keyword). */
export function splitRules(rules: readonly CategoryRule[]): { userRules: CategoryRule[]; defaultRules: CategoryRule[] } {
  return {
    userRules: rules.filter((rule) => !rule.is_default),
    defaultRules: rules.filter((rule) => rule.is_default),
  };
}

/** Open cents per friend id from `GET /reimbursements/summary`; friends without an open share are absent. */
export function openByPerson(summary: ReimbursementSummary): Map<number, Cents> {
  return new Map(summary.by_person.map((person) => [person.person_id, person.open_cents]));
}
