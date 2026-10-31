# SplitPay

SplitPay is a personal-finance MVP whose differentiator is **shared expense splitting**: one place for balance, expenses, splits and reimbursements, so the user always knows what they owe and what they are owed. Academic project (FIAP).

**Note:** This MVP strictly implements a 1-to-1 split model (the user + one friend).

## Live URLs

- Web (Vercel): `TBD in phase 3`
- API (Render): `TBD in phase 3`
- API docs (Swagger UI): `TBD in phase 3` (`/docs`)

## Repository Layout

| Path | Contents |
| --- | --- |
| `frontend/` | React + Vite + TypeScript SPA |
| `backend/` | FastAPI API, tests |
| `docs/` | Goal, context, development guides, feature specs, reference assets |

## Running Locally

Quick start: `python3 run.py` (Python 3.12+ and Node required). The first run creates `backend/.venv`, installs `requirements.txt` and runs `npm install`; then it starts the API on :8000 and the web app on :5173. `python3 run.py api` or `python3 run.py web` starts one. Ctrl+C stops them. The manual steps below do the same by hand.

### Backend (Python 3.12+)

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # FRONTEND_ORIGIN=http://localhost:5173
uvicorn app.main:app --reload --env-file .env # http://localhost:8000/health, /docs
pytest                        # run the tests
```

### Frontend (Node + npm)

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:8000 (optional, same default)
npm run dev     # http://localhost:5173
npm run build   # production build & TypeScript validation
```

## Attributions

See [`ATTRIBUTIONS.md`](ATTRIBUTIONS.md) (third-party credits, GSAP).
