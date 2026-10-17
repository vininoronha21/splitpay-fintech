import type { ApiError, HealthResponse } from "../types/api.ts";

const API_URL: string = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");

/** Code used when the request never reached the API (offline, CORS, DNS). */
export const NETWORK_ERROR_CODE = "network_error";

/** Typed error thrown by `request<T>()`; screens never inspect raw responses. */
export class ApiRequestError extends Error {
  readonly code: string;
  readonly status: number | null;

  constructor(code: string, message: string, status: number | null) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.status = status;
  }
}

function isApiError(value: unknown): value is ApiError {
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
    return null;
  }
}

/** The only place in the app that calls `fetch`. */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { Accept: "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiRequestError(NETWORK_ERROR_CODE, "Não foi possível conectar à API.", null);
  }

  const body = await readJson(response);

  if (!response.ok) {
    if (isApiError(body)) {
      throw new ApiRequestError(body.error.code, body.error.message, response.status);
    }
    throw new ApiRequestError("unknown_error", "Erro inesperado na API.", response.status);
  }

  return body as T;
}

export function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return request<HealthResponse>("/health", { signal });
}
