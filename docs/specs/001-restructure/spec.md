# 001 Restructure — Spec

Stories: none (foundation for all) | Status: draft

## Problem

The repository holds documentation only: the previous `frontend/` and `backend/` were deleted to be rebuilt from scratch. Every later feature needs a running API, a running SPA that talks to it, and a test command for each side. Without them, `002-database` and the user stories have nowhere to land.

Repository layout fixes (agents in `.claude/agents/`, assets in `docs/assets/`, `.gitignore`, spec template) were already done on `feature/mvp-plan` with the user's authorization and are not repeated here.

## Acceptance Criteria

1. `cd backend && pytest` passes on a fresh virtual environment created from `requirements.txt`.
2. `GET /health` returns `200` with `{"status": "ok"}`.
3. Every error response uses `{"error": {"code": "<snake_case>", "message": "<pt-BR text>"}}`:
   - unknown route → `404`, code `not_found`;
   - request validation failure → `422`, code `validation_error`;
   - unhandled exception → `500`, code `internal_error`, with no stack trace or SQL in the body.
4. CORS allows only the origin in `FRONTEND_ORIGIN` (default `http://localhost:5173`); a request from any other origin receives no `Access-Control-Allow-Origin` header.
5. `GET /docs` serves the Swagger UI.
6. `cd frontend && npm run build` passes with `strict: true` TypeScript and no `any`.
7. The SPA home screen calls `GET /health` through `src/services/api.ts` only and shows "API online" or "API indisponível", in the dark theme with yellow accent, laid out mobile-first (usable at 360 px width).
8. `README.md` "Running Locally" works as written for both sides.

## Data Rules

- No database in this feature (`002-database` adds it).
- `VITE_API_URL` (frontend) and `FRONTEND_ORIGIN` (backend) are the only configuration; both have committed `.env.example` files.

## API Contract

| Method | Path | Request | Response | Errors |
| --- | --- | --- | --- | --- |
| GET | `/health` | none | `200 {"status": "ok"}` | none |

## Out of Scope

- Database, seed, any user story endpoint or screen.
- Fake login, routing beyond the home screen, PWA manifest, GSAP, charts (phase 2).
- Deploy to Render/Vercel (phase 3; see the plan's note on an early smoke deploy).
- Multi-person splits, real auth.

## Decisions

| Decision | Why | Rejected |
| --- | --- | --- |
| Keep the documented majors: React 18, Vite 6, React Router 7, Tailwind 4, TypeScript 5 | They are stable together and already named in `context.md`; newer majors (React 19, Vite 8, TS 7) add migration risk with no demo value. | Latest majors. |
| Read settings with `os.environ` in `config.py` | One env var does not justify a dependency. | `pydantic-settings`. |
| Tailwind through the `@tailwindcss/vite` plugin | Tailwind 4's recommended Vite setup; removes `postcss.config.mjs`. | PostCSS config file. |
| Error shape set by three exception handlers in `main.py` | One place, and the frontend parses one shape. | FastAPI's default `{"detail": ...}`, which differs per error type. |
