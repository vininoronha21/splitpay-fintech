"""Transactions (expenses and incomes) and the strictly 1-to-1 split.

Business Rule 7: the request gives one number for the friend, the friend's
share is computed from it, and the user's share is always amount - friend
share, so the two sum to the total by construction. Integer arithmetic only.
"""

import sqlite3
from typing import Any, Literal

from app.services import DomainError, brasilia_today

SplitMode = Literal["equal", "percentage", "fixed"]


def _is_int(value: object) -> bool:
    # bool is a subclass of int in Python; True must not count as 1 cent.
    return isinstance(value, int) and not isinstance(value, bool)


def friend_share(
    amount: int,
    mode: SplitMode,
    percent: int | None = None,
    share: int | None = None,
) -> int:
    """The friend's share in cents. The user keeps amount - friend_share.

    - equal: floor(amount / 2); the odd cent stays with the user.
    - percentage: floor(amount * percent / 100), percent a whole 0..100.
    - fixed: the given share, 0 < share <= amount.

    Raises ValueError for any other combination. Pydantic rejects these first;
    this is the last check before money is computed.
    """
    if not _is_int(amount) or amount <= 0:
        raise ValueError("amount must be a positive integer number of cents")

    if mode == "equal":
        if percent is not None or share is not None:
            raise ValueError("equal mode takes no percent or share")
        return amount // 2

    if mode == "percentage":
        if share is not None:
            raise ValueError("percentage mode takes no share")
        if not _is_int(percent) or not 0 <= percent <= 100:
            raise ValueError("percent must be a whole number from 0 to 100")
        return amount * percent // 100

    if mode == "fixed":
        if percent is not None:
            raise ValueError("fixed mode takes no percent")
        if not _is_int(share) or not 0 < share <= amount:
            raise ValueError("share must be an integer with 0 < share <= amount")
        return share

    raise ValueError(f"unknown split mode: {mode!r}")


# Own share = what the user really spent (Business Rules 5 and 16): the whole
# amount, minus the friend's share when the expense is split.
LIST_SQL = """
SELECT
    t.id,
    t.type,
    t.description,
    t.amount_cents,
    t.amount_cents - coalesce(s.share_cents, 0) AS own_share_cents,
    c.name AS category_name,
    t.occurred_on,
    p.name AS friend_name,
    s.status AS split_status
FROM transactions t
LEFT JOIN category c ON c.id = t.category_id
LEFT JOIN split_share s ON s.transaction_id = t.id
LEFT JOIN person p ON p.id = s.person_id
ORDER BY t.occurred_on DESC, t.id DESC
"""

DETAIL_SQL = """
SELECT
    t.id,
    t.type,
    t.description,
    t.amount_cents,
    t.category_id,
    c.name AS category_name,
    t.occurred_on,
    t.place,
    t.payment_method,
    t.installment_number,
    t.installment_total,
    t.notes,
    t.created_at,
    t.split_mode,
    t.split_percent,
    s.person_id,
    p.name AS person_name,
    s.share_cents,
    s.status,
    s.settled_on
FROM transactions t
LEFT JOIN category c ON c.id = t.category_id
LEFT JOIN split_share s ON s.transaction_id = t.id
LEFT JOIN person p ON p.id = s.person_id
WHERE t.id = ?
"""

CATEGORY_EXISTS_SQL = "SELECT 1 FROM category WHERE id = ?"
PERSON_EXISTS_SQL = "SELECT 1 FROM person WHERE id = ?"

INSERT_SQL = """
INSERT INTO transactions
    (type, description, amount_cents, category_id, occurred_on, place, payment_method,
     installment_number, installment_total, notes, split_mode, split_percent)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
"""


def list_transactions(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    """Every transaction, newest first (occurred_on, then id)."""
    return [dict(row) for row in conn.execute(LIST_SQL)]


def get_transaction(conn: sqlite3.Connection, transaction_id: int) -> dict[str, Any]:
    row = conn.execute(DETAIL_SQL, (transaction_id,)).fetchone()
    if row is None:
        raise DomainError("not_found", "Transação não encontrada.", status_code=404)
    detail = dict(row)
    # Move the split columns into one nested block (null when not split).
    split = {
        "mode": detail.pop("split_mode"),
        "percent": detail.pop("split_percent"),
        "person_id": detail.pop("person_id"),
        "person_name": detail.pop("person_name"),
        "friend_share_cents": detail.pop("share_cents"),
        "status": detail.pop("status"),
        "settled_on": detail.pop("settled_on"),
    }
    if split["mode"] is None:
        detail["split"] = None
    else:
        split["user_share_cents"] = detail["amount_cents"] - split["friend_share_cents"]
        detail["split"] = split
    return detail


def create_transaction(conn: sqlite3.Connection, data: dict[str, Any]) -> dict[str, Any]:
    """Insert a transaction and, when split, its one friend share, atomically.

    Pydantic already checked the shape; this checks what needs the database or
    the clock: the friend and category exist, and the date is not in the future.
    A new share starts as 'em_aberto' (column default).

    BEGIN IMMEDIATE takes the write lock before the existence checks. With a
    plain BEGIN, the SELECTs take a read lock first, and SQLite refuses to
    upgrade it while another visitor is writing ("database is locked") without
    waiting for the busy timeout.
    """
    today = brasilia_today()
    occurred_on = data.get("occurred_on") or today
    if occurred_on > today:
        raise DomainError("future_date", "A data da transação não pode ser no futuro.")

    split = data.get("split")
    share = None
    if split is not None:
        share = friend_share(
            data["amount_cents"], split["mode"], split.get("percent"), split.get("share_cents")
        )

    conn.execute("BEGIN IMMEDIATE")
    try:
        category_id = data.get("category_id")
        if category_id is not None and not _exists(conn, CATEGORY_EXISTS_SQL, category_id):
            raise DomainError("category_not_found", "Categoria não encontrada.")
        if split is not None and not _exists(conn, PERSON_EXISTS_SQL, split["person_id"]):
            raise DomainError("friend_not_found", "Amigo não encontrado.")

        cursor = conn.execute(
            INSERT_SQL,
            (
                data["type"],
                data["description"],
                data["amount_cents"],
                category_id,
                occurred_on.isoformat(),
                data.get("place"),
                data.get("payment_method"),
                data.get("installment_number"),
                data.get("installment_total"),
                data.get("notes"),
                split["mode"] if split else None,
                split.get("percent") if split else None,
            ),
        )
        transaction_id = cursor.lastrowid
        if split is not None:
            conn.execute(
                "INSERT INTO split_share (transaction_id, person_id, share_cents) VALUES (?, ?, ?)",
                (transaction_id, split["person_id"], share),
            )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    return get_transaction(conn, transaction_id)


def _exists(conn: sqlite3.Connection, sql: str, row_id: int) -> bool:
    return conn.execute(sql, (row_id,)).fetchone() is not None
