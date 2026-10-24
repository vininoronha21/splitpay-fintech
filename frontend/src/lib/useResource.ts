import { useCallback, useEffect, useState, type DependencyList } from "react";
import { ApiError, UNKNOWN_ERROR_CODE } from "../services/api.ts";

/** Same copy services/api.ts uses for an error without a known shape. */
const GENERIC_ERROR_MESSAGE = "Algo deu errado. Tente novamente.";

type ResourceState<T> = { status: "loading" } | { status: "error"; error: ApiError } | { status: "ready"; data: T };

/** One card's data: loading, failed (with a pt-BR message) or ready. `retry` fetches again. */
export type Resource<T> = ResourceState<T> & { retry: () => void };

const LOADING: ResourceState<never> = { status: "loading" };

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function toApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError(UNKNOWN_ERROR_CODE, GENERIC_ERROR_MESSAGE, null);
}

/**
 * Loads data for one card. Fetches on mount, again whenever `deps` change and
 * on `retry`; the previous request is aborted on unmount and on every refetch,
 * so a slow old response never overwrites a newer one.
 *
 * `fetcher` is read only when `deps` change (like useEffect), so an inline
 * arrow such as `(signal) => getBudget(signal)` is fine.
 */
export function useResource<T>(fetcher: (signal: AbortSignal) => Promise<T>, deps: DependencyList): Resource<T> {
  const [state, setState] = useState<ResourceState<T>>(LOADING);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState(LOADING);
    fetcher(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) {
          setState({ status: "ready", data });
        }
      },
      (error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) {
          return;
        }
        setState({ status: "error", error: toApiError(error) });
      },
    );
    return () => controller.abort();
    // `fetcher` is a new function on every render; `deps` says when it changes meaning.
  }, [...deps, attempt]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  return { ...state, retry };
}
