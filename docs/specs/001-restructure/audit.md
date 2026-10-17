# 001 Restructure — Audit Report

Auditor run: 2026-10-17, branch `feature/mvp-plan` at `6daa1f3` (working tree clean before this report).

## 1. Spec Compliance

- [x] AC1: Pass. Evidence: `backend/.venv/bin/pytest -q` gives `8 passed, 1 warning`. I also built a fresh venv (Python 3.13) from `requirements.txt` only: `8 passed`. The installed pins match `plan.md` (fastapi 0.143.3, uvicorn 0.54.0, pydantic 2.14.1, pytest 9.1.1, httpx 0.28.1).
- [x] AC2: Pass. Evidence: `tests/test_health.py:1-5` checks status 200 and the exact body. A live `uvicorn` run (`--env-file`) returned `{"status":"ok"}` on `GET /health`.
- [x] AC3: Pass. Evidence: `tests/test_errors.py` asserts the exact bodies for 404 `not_found` (l.6), 422 `validation_error` (l.22) and 500 `internal_error` (l.40). The 500 test raises `RuntimeError("secret detail: SELECT * FROM users")` and asserts the text does not appear in the body. A live `GET /x` returned `{"error":{"code":"not_found","message":"Recurso não encontrado."}}`. All three handlers sit in one place, `app/main.py:27-56`, as the spec decided. See Minor 1 for how the browser sees a 500.
- [x] AC4: Pass. Evidence: `tests/test_cors.py` covers the allowed origin, another origin on a simple GET (no ACAO header) and another origin on a preflight (no ACAO header). Manual check: with `FRONTEND_ORIGIN=http://x.test`, that origin gets the header and `http://localhost:5173` gets none, so the env var is honored. `allow_origins=[FRONTEND_ORIGIN]` (`app/main.py:50`) is not a wildcard, and credentials are not enabled.
- [x] AC5: Pass. Evidence: `GET /docs` returns 200 with Swagger UI, both from TestClient and from live uvicorn. `/openapi.json` returns 200.
- [x] AC6: Pass. Evidence: `npm run build` (`tsc -b && vite build`) succeeds with 39 modules and no TS errors. `tsconfig.json:14-17` sets `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals` and `noUnusedParameters`. Grepping `\bany\b` in `frontend/src` finds nothing.
- [x] AC7: Pass (manual evidence from the main session, not reproduced by the auditor). With headless Chromium at 360 px width, the screen showed "API online" while uvicorn ran and "API indisponível" after it stopped, and the card fit the width. Code supports this. `fetch(` appears only in `src/services/api.ts:48` (grep outside that file finds nothing). `HealthStatus.tsx` calls `getHealth()` only. `theme.css:5-12` sets a dark palette with a yellow accent (`#fbbf24`). The layout is mobile-first (`w-full max-w-sm px-4`, `min-h-12` tap target).
- [x] AC8: Pass. Evidence: I followed the backend steps in `README.md`. `python3.12` exists, the venv and pip install from `requirements.txt` work, `uvicorn app.main:app --env-file .env` serves `/health` and `/docs`, and `pytest` passes. `uvicorn[standard]` pulls in `python-dotenv`, which `--env-file` needs. Frontend: `npm run build` works as written. I did not re-run `npm install` / `npm run dev` from scratch; the main session's manual AC7 check covers `npm run dev`.

## 2. Security & Data Consistency

- [x] Parameterized SQL: N/A. This feature has no database or SQL (`002-database`). Grep found no SQL in `backend/app`.
- [x] Data validation edge cases: N/A beyond the 422 envelope (no input endpoints yet).
- [x] Strict 1-to-1 split logic respected: no split, user, group, login or auth code exists. No scope creep.
- [x] `checks.sql`: N/A until `002-database`.
- [x] No stack traces or SQL in error bodies. The 500 handler returns a fixed message (`app/main.py:42-43`), and the test proves exception text does not leak.
- [x] CORS is an allow-list of one origin, not `*`.
- [x] `git ls-files` shows no tracked `.env`, `*.db`, `node_modules/` or `dist/`. Only the two `.env.example` files are tracked. `.gitignore` covers all of them.

## 3. Structural & Stack Rules

- [x] Frontend uses strict TypeScript interfaces (no `any`). `HealthResponse` and `ApiError` are in `src/types/api.ts`. `request<T>` throws a typed `ApiRequestError`, and an `unknown`-based type guard (`isApiError`) validates the error envelope.
- [x] No unplanned files, layers or dependencies. The tracked files under `backend/` and `frontend/` match the plan's file list exactly (12 backend, 15 frontend). `package.json` deps and devDeps match the plan's pins one for one. No `postcss.config.mjs`, `db.py`, `schemas.py`, `services/`, `sql/` or `lib/` was created early. `repository-structure.md` lists `vite-env.d.ts` and no longer mentions postcss.
- [x] Money rule: N/A (no amounts yet).
- [x] Language: identifiers, comments and commits are en-US. UI copy and error messages are pt-BR.

## Findings

Blocker: none.

Major: none.

Minor:

1. `backend/app/main.py:48-56`: 500 responses do not carry `Access-Control-Allow-Origin`. The `Exception` handler runs in Starlette's `ServerErrorMiddleware`, which sits outside `CORSMiddleware`. Evidence: a crash route requested with `Origin: http://localhost:5173` returned the correct `internal_error` body but `access-control-allow-origin: None`. A 404 with the same origin did get the header. In the browser, `request<T>` (`frontend/src/services/api.ts:52-53`) would therefore report a 500 as `network_error` ("Não foi possível conectar à API.") and never see the envelope. No endpoint can 500 today, so AC3 holds. Fix this before `003-balance` adds endpoints, either by adding the CORS headers inside `unhandled_exception_handler` or by wrapping the app, and add a test for the header on a 500.
2. `frontend/src/vite-env.d.ts:4`: `VITE_API_URL` is typed `string`, but it is `undefined` at runtime when no `.env` exists, which is why `api.ts:3` needs a `??` fallback. Declare it `readonly VITE_API_URL?: string` so the type matches the README's "optional, same default".
3. `frontend/src/services/api.ts:65`: `return body as T` is an unchecked cast of the success body. The plan accepts it, and it is fine for `/health`. For money endpoints in 003+, consider a small type guard per response so contract drift fails loudly, in line with CLAUDE.md's "catch API contract errors early".
4. `backend/app/routers/health.py:8`: `status: str` is looser than the frontend contract `status: "ok"` (`frontend/src/types/api.ts:3`). `Literal["ok"]` would make the OpenAPI schema match the TS type.
5. `backend/requirements.txt`: `starlette` (1.8.0, transitive) is not pinned, and pytest warns `StarletteDeprecationWarning: Using httpx with starlette.testclient is deprecated`. This is harmless now. Pinning `starlette` would keep the fresh-venv result (AC1) reproducible if FastAPI's allowed range moves.

## Verdict

**PASS**

All 8 acceptance criteria are met with evidence (AC7 by the main session's manual check). There are no blockers or majors. The minor findings do not block 001. Minor 1 should be fixed before `003-balance` adds endpoints that can fail.
