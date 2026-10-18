"""Reimbursements: closing a friend's share and summarizing what is owed (US03).

A share is addressed by its transaction id: in 1-to-1 an expense has at most
one share. Status moves once, from 'em_aberto' to 'pago' or 'acertado', and the
settlement time is always "now" in Brasília (Business Rule 1).
"""

import sqlite3
from typing import Any

from app.services import DomainError
from app.services.transactions import get_transaction
from app.text import normalize_text

# The WHERE on status is what makes two simultaneous closes safe: only one
# UPDATE can find the share still 'em_aberto'.
SETTLE_SQL = """
UPDATE split_share
SET status = ?, settled_at = datetime('now', '-3 hours')
WHERE transaction_id = ? AND status = 'em_aberto'
"""

SHARE_EXISTS_SQL = "SELECT 1 FROM split_share WHERE transaction_id = ?"

# Same order as GET /transactions: newest expense first. `? IS NULL OR ...`
# lets one parameterized query serve both "all" and one status.
LIST_SQL = """
SELECT
    t.id AS transaction_id,
    t.description,
    t.occurred_on,
    s.person_id,
    p.name AS person_name,
    s.share_cents,
    s.status,
    date(s.settled_at) AS settled_on
FROM split_share s
JOIN transactions t ON t.id = s.transaction_id
JOIN person p ON p.id = s.person_id
WHERE ? IS NULL OR s.status = ?
ORDER BY t.occurred_on DESC, t.id DESC
"""

OPEN_BY_PERSON_SQL = """
SELECT s.person_id, p.name AS person_name,
       sum(s.share_cents) AS open_cents, count(*) AS open_count
FROM split_share s
JOIN person p ON p.id = s.person_id
WHERE s.status = 'em_aberto'
GROUP BY s.person_id, p.name
"""


def settle_share(conn: sqlite3.Connection, transaction_id: int, status: str) -> dict[str, Any]:
    """Close the share of an expense as 'pago' or 'acertado'; returns the split block.

    BEGIN IMMEDIATE takes the write lock first. When the UPDATE changes no
    row, a lookup in the same transaction tells "no share" (404: unknown
    transaction, an income or an unsplit expense) from "already closed" (409).
    """
    conn.execute("BEGIN IMMEDIATE")
    try:
        cursor = conn.execute(SETTLE_SQL, (status, transaction_id))
        if cursor.rowcount == 0:
            if conn.execute(SHARE_EXISTS_SQL, (transaction_id,)).fetchone() is None:
                raise DomainError("not_found", "Reembolso não encontrado.", status_code=404)
            raise DomainError(
                "already_settled", "Este reembolso já foi encerrado.", status_code=409
            )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    # The same split block as GET /transactions/{id}, built in one place.
    return get_transaction(conn, transaction_id)["split"]


def list_reimbursements(
    conn: sqlite3.Connection, status: str | None = None
) -> list[dict[str, Any]]:
    """Every share, or only those with `status`, newest expense first."""
    return [dict(row) for row in conn.execute(LIST_SQL, (status, status))]


def reimbursement_summary(conn: sqlite3.Connection) -> dict[str, Any]:
    """Totals of the open shares and the amount open per friend.

    Sums in SQL (integers); the per-friend order is sorted in Python, like the
    friends list, because SQLite's ORDER BY would put "Á" after "z".
    """
    rows = [dict(row) for row in conn.execute(OPEN_BY_PERSON_SQL)]
    by_person = sorted(
        rows,
        key=lambda row: (-row["open_cents"], normalize_text(row["person_name"]), row["person_id"]),
    )
    return {
        "open_cents": sum(row["open_cents"] for row in rows),
        "open_count": sum(row["open_count"] for row in rows),
        "by_person": [
            {key: row[key] for key in ("person_id", "person_name", "open_cents")}
            for row in by_person
        ],
    }
