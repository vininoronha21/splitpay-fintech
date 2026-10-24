/**
 * Pure logic of the "Novo gasto" form (spec 010): values, validation, the
 * split preview and the `POST /transactions` payload. No React, so the money
 * rules run under `node --experimental-strip-types` without a browser.
 *
 * Validation mirrors the API (`backend/app/schemas/transactions.py`), so a
 * form that passes here is never a 422. Amounts are integer cents throughout.
 */
import { parseBRL } from "./money.ts";
import { trimInvisible } from "./text.ts";
import type {
  Cents,
  IsoDate,
  PaymentMethod,
  SplitCreate,
  SplitMode,
  TransactionCreate,
  TransactionType,
} from "../types/api.ts";

/** R$ 10.000.000.000,00, the API's MAX_CENTS. */
export const MAX_AMOUNT_CENTS = 10 ** 12;
export const DESCRIPTION_MAX = 120;
export const PLACE_MAX = 120;
export const NOTES_MAX = 500;
/**
 * Earliest date the form accepts, so a typo year ("0261") is caught. Not an
 * API rule: it guards the native date input, which takes years from 0001.
 */
export const MIN_DATE: IsoDate = "2000-01-01";
/** Display-only installments (Business Rule 2). */
export const MAX_INSTALLMENTS = 360;

export interface SplitValues {
  enabled: boolean;
  personId: number | null;
  mode: SplitMode;
  /** The friend's whole percent, as typed. */
  percentText: string;
  /** The friend's amount, as typed ("45,50"). */
  shareText: string;
}

export interface DetailValues {
  place: string;
  paymentMethod: PaymentMethod | null;
  installmentNumberText: string;
  installmentTotalText: string;
  notes: string;
}

/** Everything the form holds, as typed. Hidden sections keep their values. */
export interface FormValues {
  type: TransactionType;
  amountText: string;
  description: string;
  categoryId: number | null;
  /** "YYYY-MM-DD" from the native date input; "" when cleared. */
  occurredOn: IsoDate;
  split: SplitValues;
  details: DetailValues;
}

/** The text that drives the split preview. */
export type SplitInput = Pick<SplitValues, "percentText" | "shareText">;

export type FieldName =
  | "amount"
  | "description"
  | "occurredOn"
  | "splitPerson"
  | "splitPercent"
  | "splitShare"
  | "place"
  | "installments"
  | "notes";

/** Fields in screen order, so the screen can focus the first invalid one. */
export const FIELD_ORDER: readonly FieldName[] = [
  "amount",
  "description",
  "occurredOn",
  "splitPerson",
  "splitPercent",
  "splitShare",
  "place",
  "installments",
  "notes",
];

export type FormErrors = Partial<Record<FieldName, string>>;

export interface SplitPreview {
  friendCents: Cents;
  /** Always total - friendCents (Business Rule 7). */
  userCents: Cents;
}

const MESSAGES = {
  amountRequired: "Informe o valor.",
  amountTooLarge: "Use um valor até R$ 10.000.000.000,00.",
  descriptionRequired: "Informe uma descrição.",
  futureDate: "A data não pode ser no futuro.",
  dateTooOld: "Informe uma data a partir de 2000.",
  friendRequired: "Escolha um amigo.",
  percent: "Use um número inteiro de 0 a 100.",
  share: "A parte do amigo deve ser maior que zero e até o valor total.",
  installments: "Informe a parcela e o total, com a parcela até o total.",
} as const;

function tooLong(max: number): string {
  return `Use até ${max} caracteres.`;
}

/** Digits only after trimming the ends: no sign, decimals or inner spaces. */
const WHOLE_NUMBER_PATTERN = /^\d+$/;
/** Same shape as money.ts BRL_PATTERN, to tell a malformed amount from an oversized one. */
const BRL_SHAPE_PATTERN = /^(?:R\$\s*)?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{0,2})?$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Length as the API counts it: Pydantic's max_length (and SQLite length())
 * count code points of the trimmed text, so an emoji with a skin tone is two.
 * Counting graphemes would let such text through here and fail as a 422.
 */
function storedLength(trimmed: string): number {
  return Array.from(trimmed).length;
}

/** A whole number typed as digits only, or null. "007" is 7. */
export function parseWholeNumber(text: string): number | null {
  const trimmed = trimInvisible(text);
  if (!WHOLE_NUMBER_PATTERN.test(trimmed)) {
    return null;
  }
  const value = Number(trimmed);
  return Number.isSafeInteger(value) ? value : null;
}

/** The friend's whole percent 0..100, or null. */
export function parsePercent(text: string): number | null {
  const value = parseWholeNumber(text);
  return value !== null && value <= 100 ? value : null;
}

/** Valid amount in cents (0 < cents <= MAX_AMOUNT_CENTS), or null. */
export function parseAmount(text: string): Cents | null {
  const cents = parseBRL(text);
  return cents !== null && cents > 0 && cents <= MAX_AMOUNT_CENTS ? cents : null;
}

function amountError(text: string): string | undefined {
  const cents = parseBRL(text);
  if (cents === null) {
    // parseBRL also returns null past Number.MAX_SAFE_INTEGER: a well-formed
    // amount that big is "too large", not "missing".
    return BRL_SHAPE_PATTERN.test(text.trim()) ? MESSAGES.amountTooLarge : MESSAGES.amountRequired;
  }
  if (cents <= 0) return MESSAGES.amountRequired;
  if (cents > MAX_AMOUNT_CENTS) return MESSAGES.amountTooLarge;
  return undefined;
}

/** The friend's fixed share, 0 < share <= total; without a valid total only share > 0. */
function parseShare(text: string, totalCents: Cents | null): Cents | null {
  const cents = parseBRL(text);
  if (cents === null || cents <= 0 || cents > MAX_AMOUNT_CENTS) return null;
  if (totalCents !== null && cents > totalCents) return null;
  return cents;
}

/** Both installment fields blank: null. Both valid with number <= total: the pair. Otherwise "invalid". */
function parseInstallments(details: DetailValues): { number: number; total: number } | null | "invalid" {
  const numberText = trimInvisible(details.installmentNumberText);
  const totalText = trimInvisible(details.installmentTotalText);
  if (numberText === "" && totalText === "") return null;
  const number = parseWholeNumber(numberText);
  const total = parseWholeNumber(totalText);
  if (number === null || total === null) return "invalid";
  if (number < 1 || total > MAX_INSTALLMENTS || number > total) return "invalid";
  return { number, total };
}

export function initialValues(type: TransactionType, today: IsoDate): FormValues {
  return {
    type,
    amountText: "",
    description: "",
    categoryId: null,
    occurredOn: today,
    split: { enabled: false, personId: null, mode: "equal", percentText: "", shareText: "" },
    details: {
      place: "",
      paymentMethod: null,
      installmentNumberText: "",
      installmentTotalText: "",
      notes: "",
    },
  };
}

/**
 * pt-BR error per invalid field; an empty object means the form can be sent.
 * Incomes skip category, split and installments (Business Rule 14).
 */
export function validate(values: FormValues, today: IsoDate): FormErrors {
  const errors: FormErrors = {};
  const isExpense = values.type === "expense";

  const amount = amountError(values.amountText);
  if (amount) errors.amount = amount;

  const description = trimInvisible(values.description);
  if (description === "") errors.description = MESSAGES.descriptionRequired;
  else if (storedLength(description) > DESCRIPTION_MAX) errors.description = tooLong(DESCRIPTION_MAX);

  // A cleared date is omitted and the API uses today; ISO days compare as strings.
  if (ISO_DATE_PATTERN.test(values.occurredOn)) {
    if (values.occurredOn > today) errors.occurredOn = MESSAGES.futureDate;
    else if (values.occurredOn < MIN_DATE) errors.occurredOn = MESSAGES.dateTooOld;
  }

  if (isExpense && values.split.enabled) {
    const { split } = values;
    if (split.personId === null) errors.splitPerson = MESSAGES.friendRequired;
    if (split.mode === "percentage" && parsePercent(split.percentText) === null) {
      errors.splitPercent = MESSAGES.percent;
    }
    if (split.mode === "fixed" && parseShare(split.shareText, parseAmount(values.amountText)) === null) {
      errors.splitShare = MESSAGES.share;
    }
  }

  if (storedLength(trimInvisible(values.details.place)) > PLACE_MAX) errors.place = tooLong(PLACE_MAX);
  if (isExpense && parseInstallments(values.details) === "invalid") errors.installments = MESSAGES.installments;
  if (storedLength(trimInvisible(values.details.notes)) > NOTES_MAX) errors.notes = tooLong(NOTES_MAX);

  return errors;
}

/**
 * Both shares as the API will store them (Business Rule 7), or null while the
 * total or the mode's input is not valid:
 * equal floor(total / 2), percentage floor(total * pct / 100), fixed the share.
 */
export function splitPreview(totalCents: Cents | null, mode: SplitMode, input: SplitInput): SplitPreview | null {
  if (totalCents === null || !Number.isSafeInteger(totalCents)) return null;
  if (totalCents <= 0 || totalCents > MAX_AMOUNT_CENTS) return null;
  let friendCents: Cents;
  switch (mode) {
    case "equal":
      friendCents = Math.floor(totalCents / 2);
      break;
    case "percentage": {
      const percent = parsePercent(input.percentText);
      if (percent === null) return null;
      // total * 100 <= 10^14 stays below 2^53, so this is exact integer math.
      friendCents = Math.floor((totalCents * percent) / 100);
      break;
    }
    case "fixed": {
      const share = parseShare(input.shareText, totalCents);
      if (share === null) return null;
      friendCents = share;
      break;
    }
  }
  return { friendCents, userCents: totalCents - friendCents };
}

function invalidField(field: FieldName): never {
  throw new RangeError(`toPayload received an invalid ${field}; call validate() first`);
}

function buildSplit(values: FormValues, amountCents: Cents): SplitCreate {
  const { split } = values;
  const personId = split.personId ?? invalidField("splitPerson");
  switch (split.mode) {
    case "equal":
      return { person_id: personId, mode: "equal" };
    case "percentage":
      return {
        person_id: personId,
        mode: "percentage",
        percent: parsePercent(split.percentText) ?? invalidField("splitPercent"),
      };
    case "fixed":
      return {
        person_id: personId,
        mode: "fixed",
        share_cents: parseShare(split.shareText, amountCents) ?? invalidField("splitShare"),
      };
  }
}

/**
 * The `POST /transactions` body from values that passed validate(). Text is
 * trimmed, blank optionals are omitted, and an income never carries
 * category_id, split or installments. Throws RangeError on invalid values.
 */
export function toPayload(values: FormValues): TransactionCreate {
  const amountCents = parseAmount(values.amountText) ?? invalidField("amount");
  const description = trimInvisible(values.description);
  if (description === "") invalidField("description");

  const payload: TransactionCreate = { type: values.type, description, amount_cents: amountCents };
  if (ISO_DATE_PATTERN.test(values.occurredOn)) payload.occurred_on = values.occurredOn;

  const place = trimInvisible(values.details.place);
  if (place !== "") payload.place = place;
  if (values.details.paymentMethod !== null) payload.payment_method = values.details.paymentMethod;
  const notes = trimInvisible(values.details.notes);
  if (notes !== "") payload.notes = notes;

  if (values.type === "expense") {
    if (values.categoryId !== null) payload.category_id = values.categoryId;
    const installments = parseInstallments(values.details);
    if (installments === "invalid") invalidField("installments");
    if (installments !== null) {
      payload.installment_number = installments.number;
      payload.installment_total = installments.total;
    }
    if (values.split.enabled) payload.split = buildSplit(values, amountCents);
  }
  return payload;
}
