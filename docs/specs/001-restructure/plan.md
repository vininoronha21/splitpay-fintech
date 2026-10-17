# 001 Restructure — Plan

Status: draft

## Files to Create/Modify

Backend (all paths already listed in `repository-structure.md`):
- `backend/requirements.txt`: pinned `fastapi==0.143.3`, `uvicorn[standard]==0.54.0`, `pydantic==2.14.1`, `pytest==9.1.1`, `httpx==0.28.1` (required by FastAPI's `TestClient`).
- `backend/.env.example`: `FRONTEND_ORIGIN=http://localhost:5173`.
- `backend/app/__init__.py`, `backend/app/routers/__init__.py`: package markers.
- `backend/app/config.py`: `FRONTEND_ORIGIN` from the environment with the default above.
- `backend/app/main.py`: `create_app()` factory, CORS middleware, the three error handlers, router registration; module-level `app = create_app()`.
- `backend/app/routers/health.py`: `GET /health`.
- `backend/tests/__init__.py`, `backend/tests/conftest.py` (`client` fixture), `backend/tests/test_health.py`, `backend/tests/test_errors.py`, `backend/tests/test_cors.py`.

Frontend:
- `frontend/package.json` (+ `package-lock.json`): `react@18.3.1`, `react-dom@18.3.1`, `react-router@7.18.4`; dev: `vite@6.4.4`, `@vitejs/plugin-react@4.7.0`, `typescript@5.9.3`, `tailwindcss@4.3.3`, `@tailwindcss/vite@4.3.3`, `@types/react@18.3.31`, `@types/react-dom@18.3.7`. Scripts: `dev`, `build` (`tsc -b && vite build`), `preview`.
- `frontend/index.html`, `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/tsconfig.node.json`, `frontend/.env.example` (`VITE_API_URL=http://localhost:8000`).
- `frontend/src/main.tsx`, `frontend/src/vite-env.d.ts` (types `VITE_API_URL`).
- `frontend/src/app/App.tsx`, `frontend/src/app/routes.tsx` (one route: `/`).
- `frontend/src/app/components/HealthStatus.tsx`: home screen card.
- `frontend/src/services/api.ts`: `request<T>()` helper that parses the error shape, plus `getHealth()`.
- `frontend/src/types/api.ts`: `HealthResponse`, `ApiError`.
- `frontend/src/styles/theme.css`: Tailwind import and theme tokens (dark background, yellow accent).

Docs:
- `docs/development/repository-structure.md`: replace `postcss.config.mjs` with nothing (Tailwind via Vite plugin) and add `src/vite-env.d.ts`.
- `README.md`: confirm commands.

Not created yet (rule 5, no speculative structure): `backend/app/db.py`, `schemas.py`, `services/`, `backend/sql/` (002); `frontend/src/lib/` (first money formatting need, 003).

## Architectural & Tech Decisions

- **Backend:** two layers from day one; `health.py` has no service because it has no rule or SQL.
- **Errors:** handlers for `StarletteHTTPException`, `RequestValidationError` and `Exception`; messages in pt-BR, codes in snake_case en-US.
- **Frontend TS Interfaces:** `HealthResponse { status: "ok" }`, `ApiError { error: { code: string; message: string } }`. `request<T>` throws a typed `ApiRequestError` so screens never touch `fetch`.
- **TypeScript:** `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`.
- **Database Schema:** none.

## Test Strategy

- Pytest with `TestClient`: health body, 404/422/500 shapes (a test-only route raises), CORS allowed vs. other origin.
- Frontend: `npm run build` as the type gate; manual check of the home screen at 360 px with the API up and down.

## Risks & Edge Cases

- Python: docs say 3.12+; the cloud container has 3.13. Pins above support both. Render's Python version is fixed in phase 3.
- The 500 handler must not leak exception text; the test asserts the body equals the generic message.
- Early smoke deploy (optional, needs your Render and Vercel accounts): deploying `/health` and the home screen right after this feature surfaces CORS and env issues months before the presentation instead of in phase 3.
