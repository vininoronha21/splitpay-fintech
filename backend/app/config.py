import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent

FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")

# A relative path is resolved against backend/, not the current directory,
# so the file lands in the same place however uvicorn or pytest is started.
DATABASE_PATH = str(BACKEND_DIR / os.environ.get("DATABASE_PATH", "splitpay.db"))
