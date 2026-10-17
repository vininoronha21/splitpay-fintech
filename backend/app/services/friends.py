"""Friends the user can split an expense with (Business Rule 11: list and add only)."""

import sqlite3
from typing import Any

from app.services import DomainError
from app.text import normalize_text


def list_friends(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    """Sorted by name ignoring case and accents, so "Álvaro" comes before "Ana".

    Sorted in Python: SQLite's ORDER BY compares bytes and would put "Á" after "z".
    """
    rows = [dict(row) for row in conn.execute("SELECT id, name FROM person")]
    return sorted(rows, key=lambda row: (normalize_text(row["name"]), row["id"]))


def create_friend(conn: sqlite3.Connection, name: str) -> dict[str, Any]:
    """Add a friend; the stored name keeps what the user typed (already trimmed).

    BEGIN IMMEDIATE takes the write lock before the duplicate check, so two
    visitors adding "Ana" and "ana" at once cannot both pass it.
    """
    conn.execute("BEGIN IMMEDIATE")
    try:
        wanted = normalize_text(name)
        for (existing,) in conn.execute("SELECT name FROM person"):
            if normalize_text(existing) == wanted:
                raise DomainError(
                    "friend_exists", "Já existe um amigo com esse nome.", status_code=409
                )
        cursor = conn.execute("INSERT INTO person (name) VALUES (?)", (name,))
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    return {"id": cursor.lastrowid, "name": name}
