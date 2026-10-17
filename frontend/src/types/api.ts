/** Mirrors the backend `GET /health` response. */
export interface HealthResponse {
  status: "ok";
}

/** Error envelope returned by every backend error handler. */
export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
