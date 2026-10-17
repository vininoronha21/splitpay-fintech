import sqlite3
from collections.abc import Iterator
from pathlib import Path

from fastapi import Request

SQL_DIR = Path(__file__).resolve().parent.parent / "sql"

# How long a write waits for another visitor's write to finish before failing.
# Writes take milliseconds, so 5 s only matters under a burst. Every write
# starts with BEGIN IMMEDIATE, so this wait applies to it (a lock upgrade after
# a read would fail at once instead of waiting).
BUSY_TIMEOUT_SECONDS = 5.0


def connect(path: str) -> sqlite3.Connection:
    # check_same_thread=False: FastAPI may open the connection in one worker
    # thread and run the endpoint in another. It is never shared across requests.
    conn = sqlite3.connect(path, timeout=BUSY_TIMEOUT_SECONDS, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(path: str) -> None:
    """Delete the database file and rebuild it from schema.sql and seed.sql."""
    Path(path).unlink(missing_ok=True)
    conn = connect(path)
    try:
        conn.executescript((SQL_DIR / "schema.sql").read_text(encoding="utf-8"))
        conn.executescript((SQL_DIR / "seed.sql").read_text(encoding="utf-8"))
    finally:
        conn.close()


def get_db(request: Request) -> Iterator[sqlite3.Connection]:
    """FastAPI dependency: one connection per request, closed afterwards."""
    conn = connect(request.app.state.database_path)
    try:
        yield conn
    finally:
        conn.close()
