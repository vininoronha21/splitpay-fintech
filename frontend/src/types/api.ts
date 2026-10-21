/**
 * Hand-written mirror of the backend Pydantic schemas (`backend/app/schemas/`).
 *
 * Conventions:
 * - Every `*_cents` field is an integer amount in cents (never a float).
 * - `date` fields are "YYYY-MM-DD" strings; `datetime` fields are ISO strings in
 *   Brasília time (UTC-3) without an offset, e.g. "2026-10-21T14:03:00".
 * - Field names match the JSON the API sends (snake_case).
 */

/** Integer amount in cents. Alias for documentation only. */
export type Cents = number;

/** Calendar day, "YYYY-MM-DD". */
export type IsoDate = string;

/** Brasília local datetime without offset, "YYYY-MM-DDTHH:MM:SS[.ffffff]". */
export type IsoDateTime = string;

// --- Errors -------------------------------------------------------------------

/** Error envelope returned by every backend error handler. */
export interface ApiErrorBody {
  error: {
    code: string;
    /** pt-BR, shown to the user as is. */
    message: string;
  };
}

// --- Health -------------------------------------------------------------------

/** `GET /health` */
export interface HealthResponse {
  status: "ok";
}

// --- Profile, balance and budget ----------------------------------------------

/** `GET /profile`, `PATCH /profile` */
export interface Profile {
  display_name: string;
  initial_balance_cents: Cents;
  monthly_budget_cents: Cents;
}

/** `PATCH /profile` body. */
export interface ProfileUpdate {
  /** Cents, 0..10^12. */
  initial_balance_cents: Cents;
}

/** `GET /balance` */
export interface Balance {
  initial_balance_cents: Cents;
  incomes_cents: Cents;
  reimbursements_received_cents: Cents;
  expenses_cents: Cents;
  adjustments_cents: Cents;
  balance_cents: Cents;
}

/** `POST /balance/adjustments` body. */
export interface AdjustmentCreate {
  /** Cents, may be negative (-10^12..10^12). */
  new_balance_cents: Cents;
  /** 10..200 visible characters. */
  reason: string;
}

/** `GET /balance/adjustments` item, `POST /balance/adjustments` response. */
export interface Adjustment {
  id: number;
  created_at: IsoDateTime;
  delta_cents: Cents;
  reason: string;
  previous_balance_cents: Cents;
  new_balance_cents: Cents;
}

/** `GET /budget` (Business Rule 5: only the user's own share counts). */
export interface Budget {
  /** Current Brasília month, "YYYY-MM". */
  month: string;
  budget_cents: Cents;
  spent_cents: Cents;
  /** Negative when over budget. */
  remaining_cents: Cents;
  /** floor(spent * 100 / budget); may pass 100. */
  used_percent: number;
}

// --- Friends ------------------------------------------------------------------

/** `GET /friends` item, `POST /friends` response. */
export interface Friend {
  id: number;
  name: string;
}

/** `POST /friends` body. */
export interface FriendCreate {
  /** 1..60 visible characters. */
  name: string;
}

// --- Transactions -------------------------------------------------------------

export type TransactionType = "expense" | "income";
export type SplitMode = "equal" | "percentage" | "fixed";
export type SplitStatus = "em_aberto" | "pago" | "acertado";
export type PaymentMethod = "pix" | "debito" | "credito" | "dinheiro";

interface SplitCreateBase {
  person_id: number;
}

/** Equal split: no extra input. */
export interface SplitCreateEqual extends SplitCreateBase {
  mode: "equal";
  percent?: null;
  share_cents?: null;
}

/** Percentage split: the friend's whole percentage, 0..100. */
export interface SplitCreatePercentage extends SplitCreateBase {
  mode: "percentage";
  percent: number;
  share_cents?: null;
}

/** Fixed split: the friend's share in cents, 1..amount_cents. */
export interface SplitCreateFixed extends SplitCreateBase {
  mode: "fixed";
  percent?: null;
  share_cents: Cents;
}

/**
 * `TransactionCreate.split`. The backend validator requires `percent` only in
 * percentage mode and `share_cents` only in fixed mode, so this is modeled as
 * a union discriminated by `mode`.
 */
export type SplitCreate = SplitCreateEqual | SplitCreatePercentage | SplitCreateFixed;

/** `POST /transactions` body. */
export interface TransactionCreate {
  type: TransactionType;
  /** 1..120 visible characters. */
  description: string;
  /** Cents, > 0. */
  amount_cents: Cents;
  /** Defaults to today in Brasília. Never in the future. */
  occurred_on?: IsoDate | null;
  category_id?: number | null;
  /** Up to 120 characters; blank becomes null. */
  place?: string | null;
  payment_method?: PaymentMethod | null;
  /** 1..360; sent together with `installment_total`. */
  installment_number?: number | null;
  /** 1..360; sent together with `installment_number`. */
  installment_total?: number | null;
  /** Up to 500 characters; blank becomes null. */
  notes?: string | null;
  /** Expenses only. */
  split?: SplitCreate | null;
}

/** The split of one expense, as returned by the API. */
export interface SplitDetail {
  person_id: number;
  person_name: string;
  mode: SplitMode;
  percent: number | null;
  friend_share_cents: Cents;
  /** Always amount_cents - friend_share_cents. */
  user_share_cents: Cents;
  status: SplitStatus;
  settled_on: IsoDate | null;
}

/** `GET /transactions/{id}`, `POST /transactions` response. */
export interface TransactionDetail {
  id: number;
  type: TransactionType;
  description: string;
  amount_cents: Cents;
  category_id: number | null;
  category_name: string | null;
  occurred_on: IsoDate;
  place: string | null;
  payment_method: PaymentMethod | null;
  installment_number: number | null;
  installment_total: number | null;
  notes: string | null;
  created_at: IsoDateTime;
  split: SplitDetail | null;
}

/** `GET /transactions` item. */
export interface TransactionSummary {
  id: number;
  type: TransactionType;
  description: string;
  amount_cents: Cents;
  /** amount_cents minus the friend's share, if split. */
  own_share_cents: Cents;
  category_name: string | null;
  occurred_on: IsoDate;
  friend_name: string | null;
  split_status: SplitStatus | null;
}

/** `GET /transactions` query. */
export interface TransactionListParams {
  /** Only split expenses whose share has this status. */
  status?: SplitStatus;
}

// --- Categories ---------------------------------------------------------------

/** `GET /categories` item. */
export interface Category {
  id: number;
  name: string;
}

/** `GET /categories/suggest`; all three fields are null when no rule matches. */
export interface CategorySuggestion {
  category_id: number | null;
  category_name: string | null;
  keyword: string | null;
}

/** `POST /categories/rules` body. */
export interface CategoryRuleCreate {
  /** Up to 80 raw characters; 1..40 letters and digits once normalized. */
  keyword: string;
  category_id: number;
}

/** `GET /categories/rules` item, `POST /categories/rules` response. */
export interface CategoryRule {
  id: number;
  /** Normalized: lowercase, no accents, single spaces. */
  keyword: string;
  category_id: number;
  category_name: string;
  /** Default rules cannot be deleted. */
  is_default: boolean;
}

// --- Reimbursements -----------------------------------------------------------

/** A share can only be closed, never reopened. */
export type ClosedStatus = "pago" | "acertado";

/** `PATCH /reimbursements/{transaction_id}` body. */
export interface SettleRequest {
  /** pago adds the share to the balance; acertado closes it without money. */
  status: ClosedStatus;
}

/** `GET /reimbursements` item. */
export interface Reimbursement {
  transaction_id: number;
  description: string;
  occurred_on: IsoDate;
  person_id: number;
  person_name: string;
  share_cents: Cents;
  status: SplitStatus;
  /** Brasília day the share was closed. */
  settled_on: IsoDate | null;
}

/** `GET /reimbursements` query. */
export interface ReimbursementListParams {
  status?: SplitStatus;
}

export interface PersonOpen {
  person_id: number;
  person_name: string;
  open_cents: Cents;
}

/** `GET /reimbursements/summary`: what friends still owe the user. */
export interface ReimbursementSummary {
  open_cents: Cents;
  open_count: number;
  /** Only friends with an open share; largest first, then by name. */
  by_person: PersonOpen[];
}

// --- Dashboard ----------------------------------------------------------------

export type Period = "week" | "month" | "year";

/** One expense behind a category's slice. */
export interface ChartItem {
  transaction_id: number;
  description: string;
  occurred_on: IsoDate;
  own_share_cents: Cents;
}

export interface CategoryTotal {
  /** null groups expenses without a category ("Sem categoria"). */
  category_id: number | null;
  category_name: string;
  total_cents: Cents;
  /** Newest first; they sum to total_cents. */
  items: ChartItem[];
}

export interface PersonTotal {
  person_id: number;
  person_name: string;
  /** Sum of the friend's shares, whatever their status. */
  total_cents: Cents;
}

/** `GET /dashboard/charts` */
export interface Charts {
  period: Period;
  /** First day of the period (inclusive). */
  start: IsoDate;
  /** Last day of the period (inclusive). */
  end: IsoDate;
  /** The user's own spending in the period. */
  total_cents: Cents;
  /** Largest first, then by name. */
  by_category: CategoryTotal[];
  /** Largest first, then by name. */
  by_person: PersonTotal[];
}

/** `GET /dashboard/charts` query. */
export interface ChartsParams {
  period: Period;
  /** 0 is the current period, -1 the one before; -520..0. Defaults to 0. */
  offset?: number;
}
