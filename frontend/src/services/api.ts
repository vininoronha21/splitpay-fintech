import type {
  Adjustment,
  AdjustmentCreate,
  ApiErrorBody,
  Balance,
  Budget,
  Category,
  CategoryRule,
  CategoryRuleCreate,
  CategorySuggestion,
  Charts,
  ChartsParams,
  ClosedStatus,
  Friend,
  FriendCreate,
  HealthResponse,
  Profile,
  ProfileUpdate,
  Reimbursement,
  ReimbursementListParams,
  ReimbursementSummary,
  SettleRequest,
  SplitDetail,
  TransactionCreate,
  TransactionDetail,
  TransactionListParams,
  TransactionSummary,
} from "../types/api.ts";

const API_URL: string = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");

/** Code used when the request never reached the API (offline, CORS, DNS). */
export const NETWORK_ERROR_CODE = "network_error";

/** Code used when the API answered with an error but no `{ error }` envelope. */
export const UNKNOWN_ERROR_CODE = "unknown_error";

const NETWORK_ERROR_MESSAGE = "Não foi possível conectar ao servidor. Tente novamente.";
const UNKNOWN_ERROR_MESSAGE = "Algo deu errado. Tente novamente.";

/**
 * Typed error thrown by every API function; screens never inspect raw responses.
 * `message` is pt-BR and can be shown to the user as is.
 */
export class ApiError extends Error {
  readonly code: string;
  /** HTTP status, or null when the request never reached the API. */
  readonly status: number | null;

  constructor(code: string, message: string, status: number | null) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null || !("error" in value)) {
    return false;
  }
  const inner: unknown = value.error;
  return (
    typeof inner === "object" &&
    inner !== null &&
    "code" in inner &&
    "message" in inner &&
    typeof inner.code === "string" &&
    typeof inner.message === "string"
  );
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    // Empty body (204) or non-JSON body.
    return null;
  }
}

type QueryValue = string | number | undefined;

/** Builds "?a=1&b=x", skipping undefined values; "" when nothing is left. */
function buildQuery(params: Readonly<Record<string, QueryValue>>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      search.append(key, String(value));
    }
  }
  const query = search.toString();
  return query === "" ? "" : `?${query}`;
}

/** RequestInit for a JSON body (POST, PATCH). */
function jsonBody(method: "POST" | "PATCH", body: object, signal?: AbortSignal): RequestInit {
  return {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    signal,
  };
}

/**
 * The only place in the app that calls `fetch`. Resolves with the parsed JSON
 * body (null for an empty body such as a 204) or throws `ApiError`.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new ApiError(NETWORK_ERROR_CODE, NETWORK_ERROR_MESSAGE, null);
  }

  const body = await readJson(response);

  if (!response.ok) {
    if (isApiErrorBody(body)) {
      throw new ApiError(body.error.code, body.error.message, response.status);
    }
    throw new ApiError(UNKNOWN_ERROR_CODE, UNKNOWN_ERROR_MESSAGE, response.status);
  }

  // The body shape is trusted: types/api.ts mirrors the backend schemas.
  return body as T;
}

// --- Health -------------------------------------------------------------------

/** GET /health */
export function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return request<HealthResponse>("/health", { signal });
}

// --- Profile ------------------------------------------------------------------

/** GET /profile */
export function getProfile(signal?: AbortSignal): Promise<Profile> {
  return request<Profile>("/profile", { signal });
}

/** PATCH /profile (only the initial balance can change). */
export function updateProfile(body: ProfileUpdate, signal?: AbortSignal): Promise<Profile> {
  return request<Profile>("/profile", jsonBody("PATCH", body, signal));
}

// --- Balance and budget -------------------------------------------------------

/** GET /balance */
export function getBalance(signal?: AbortSignal): Promise<Balance> {
  return request<Balance>("/balance", { signal });
}

/** GET /balance/adjustments */
export function listAdjustments(signal?: AbortSignal): Promise<Adjustment[]> {
  return request<Adjustment[]>("/balance/adjustments", { signal });
}

/** POST /balance/adjustments */
export function createAdjustment(body: AdjustmentCreate, signal?: AbortSignal): Promise<Adjustment> {
  return request<Adjustment>("/balance/adjustments", jsonBody("POST", body, signal));
}

/** GET /budget */
export function getBudget(signal?: AbortSignal): Promise<Budget> {
  return request<Budget>("/budget", { signal });
}

// --- Friends ------------------------------------------------------------------

/** GET /friends */
export function listFriends(signal?: AbortSignal): Promise<Friend[]> {
  return request<Friend[]>("/friends", { signal });
}

/** POST /friends */
export function createFriend(body: FriendCreate, signal?: AbortSignal): Promise<Friend> {
  return request<Friend>("/friends", jsonBody("POST", body, signal));
}

// --- Transactions -------------------------------------------------------------

/** GET /transactions?status= */
export function listTransactions(
  params: TransactionListParams = {},
  signal?: AbortSignal,
): Promise<TransactionSummary[]> {
  const query = buildQuery({ status: params.status });
  return request<TransactionSummary[]>(`/transactions${query}`, { signal });
}

/** POST /transactions */
export function createTransaction(
  body: TransactionCreate,
  signal?: AbortSignal,
): Promise<TransactionDetail> {
  return request<TransactionDetail>("/transactions", jsonBody("POST", body, signal));
}

/** GET /transactions/{id} */
export function getTransaction(id: number, signal?: AbortSignal): Promise<TransactionDetail> {
  return request<TransactionDetail>(`/transactions/${encodeURIComponent(id)}`, { signal });
}

// --- Categories ---------------------------------------------------------------

/** GET /categories */
export function listCategories(signal?: AbortSignal): Promise<Category[]> {
  return request<Category[]>("/categories", { signal });
}

/** GET /categories/suggest?description= */
export function suggestCategory(description: string, signal?: AbortSignal): Promise<CategorySuggestion> {
  const query = buildQuery({ description });
  return request<CategorySuggestion>(`/categories/suggest${query}`, { signal });
}

/** GET /categories/rules */
export function listCategoryRules(signal?: AbortSignal): Promise<CategoryRule[]> {
  return request<CategoryRule[]>("/categories/rules", { signal });
}

/** POST /categories/rules */
export function createCategoryRule(
  body: CategoryRuleCreate,
  signal?: AbortSignal,
): Promise<CategoryRule> {
  return request<CategoryRule>("/categories/rules", jsonBody("POST", body, signal));
}

/** DELETE /categories/rules/{rule_id} (204, no body; default rules answer 409). */
export async function deleteCategoryRule(ruleId: number, signal?: AbortSignal): Promise<void> {
  await request<null>(`/categories/rules/${encodeURIComponent(ruleId)}`, {
    method: "DELETE",
    signal,
  });
}

// --- Reimbursements -----------------------------------------------------------

/** GET /reimbursements?status= */
export function listReimbursements(
  params: ReimbursementListParams = {},
  signal?: AbortSignal,
): Promise<Reimbursement[]> {
  const query = buildQuery({ status: params.status });
  return request<Reimbursement[]>(`/reimbursements${query}`, { signal });
}

/** GET /reimbursements/summary */
export function getReimbursementSummary(signal?: AbortSignal): Promise<ReimbursementSummary> {
  return request<ReimbursementSummary>("/reimbursements/summary", { signal });
}

/**
 * PATCH /reimbursements/{transaction_id}: closes the friend's share as pago or
 * acertado. Returns the updated split, not a `Reimbursement`.
 */
export function updateReimbursementStatus(
  transactionId: number,
  status: ClosedStatus,
  signal?: AbortSignal,
): Promise<SplitDetail> {
  const body: SettleRequest = { status };
  return request<SplitDetail>(
    `/reimbursements/${encodeURIComponent(transactionId)}`,
    jsonBody("PATCH", body, signal),
  );
}

// --- Dashboard ----------------------------------------------------------------

/** GET /dashboard/charts?period=&offset= */
export function getCharts(params: ChartsParams, signal?: AbortSignal): Promise<Charts> {
  const query = buildQuery({ period: params.period, offset: params.offset });
  return request<Charts>(`/dashboard/charts${query}`, { signal });
}
