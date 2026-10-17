"""Balance, manual adjustments and the profile (initial balance).

Business Rule 3: balance = initial + incomes + reimbursements received
- expenses + adjustments, recomputed from rows on every call.
"""

import sqlite3
from typing import Any

from app.services import DomainError, brasilia_today


class NoChangeError(DomainError):
    def __init__(self) -> None:
        super().__init__("no_change", "O novo saldo é igual ao saldo atual.")


PROFILE_SQL = """
SELECT display_name, initial_balance_cents, monthly_budget_cents
FROM user_profile
WHERE id = 1
"""

# One SELECT, one scalar subquery per part, so it reads like Business Rule 3.
BALANCE_PARTS_SQL = """
SELECT
    p.initial_balance_cents,
    (SELECT coalesce(sum(amount_cents), 0) FROM transactions WHERE type = 'income')
        AS incomes_cents,
    (SELECT coalesce(sum(share_cents), 0) FROM split_share WHERE status = 'pago')
        AS reimbursements_received_cents,
    (SELECT coalesce(sum(amount_cents), 0) FROM transactions WHERE type = 'expense')
        AS expenses_cents,
    (SELECT coalesce(sum(delta_cents), 0) FROM balance_adjustment)
        AS adjustments_cents
FROM user_profile p
WHERE p.id = 1
"""

# An adjustment's new balance = initial + movements dated on or before the
# adjustment's date + every adjustment up to and including it. The running
# total uses a window ordered by (created_at, id), which is unique, so each row
# sums exactly the rows before it plus itself.
HISTORY_SQL = """
WITH running AS (
    SELECT
        id,
        created_at,
        delta_cents,
        reason,
        sum(delta_cents) OVER (ORDER BY created_at, id) AS adjustments_to_date
    FROM balance_adjustment
),
history AS (
    SELECT
        r.id,
        r.created_at,
        r.delta_cents,
        r.reason,
        (SELECT initial_balance_cents FROM user_profile WHERE id = 1)
        + (SELECT coalesce(sum(amount_cents), 0) FROM transactions
           WHERE type = 'income' AND occurred_on <= date(r.created_at))
        + (SELECT coalesce(sum(share_cents), 0) FROM split_share
           WHERE status = 'pago' AND settled_on <= date(r.created_at))
        - (SELECT coalesce(sum(amount_cents), 0) FROM transactions
           WHERE type = 'expense' AND occurred_on <= date(r.created_at))
        + r.adjustments_to_date AS new_balance_cents
    FROM running r
)
SELECT
    id,
    created_at,
    delta_cents,
    reason,
    new_balance_cents - delta_cents AS previous_balance_cents,
    new_balance_cents
FROM history
"""


# Own share = amount, minus the friend's share when split (Business Rule 5).
# The month is passed in as 'YYYY-MM' from brasilia_today(), the same clock
# that dates new transactions.
BUDGET_SQL = """
SELECT
    (SELECT monthly_budget_cents FROM user_profile WHERE id = 1) AS budget_cents,
    (SELECT coalesce(sum(t.amount_cents - coalesce(s.share_cents, 0)), 0)
     FROM transactions t
     LEFT JOIN split_share s ON s.transaction_id = t.id
     WHERE t.type = 'expense' AND strftime('%Y-%m', t.occurred_on) = ?) AS spent_cents
"""


def get_profile(conn: sqlite3.Connection) -> dict[str, Any]:
    return dict(conn.execute(PROFILE_SQL).fetchone())


def set_initial_balance(conn: sqlite3.Connection, initial_balance_cents: int) -> dict[str, Any]:
    """Business Rule 4. Changes the balance directly; it is not an adjustment.

    BEGIN IMMEDIATE like every other write, so all writers queue the same way.
    """
    conn.execute("BEGIN IMMEDIATE")
    try:
        conn.execute(
            "UPDATE user_profile SET initial_balance_cents = ? WHERE id = 1",
            (initial_balance_cents,),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    return get_profile(conn)


def get_balance(conn: sqlite3.Connection) -> dict[str, Any]:
    parts = dict(conn.execute(BALANCE_PARTS_SQL).fetchone())
    parts["balance_cents"] = (
        parts["initial_balance_cents"]
        + parts["incomes_cents"]
        + parts["reimbursements_received_cents"]
        - parts["expenses_cents"]
        + parts["adjustments_cents"]
    )
    return parts


def list_adjustments(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    """History, newest first."""
    rows = conn.execute(HISTORY_SQL + " ORDER BY created_at DESC, id DESC").fetchall()
    return [dict(row) for row in rows]


def create_adjustment(
    conn: sqlite3.Connection, new_balance_cents: int, reason: str
) -> dict[str, Any]:
    """Business Rule 12: store delta = target - current balance.

    BEGIN IMMEDIATE takes the write lock before reading the balance, so two
    visitors adjusting at once cannot both compute from the same old balance.
    created_at comes from the column default (Brasília time).
    """
    conn.execute("BEGIN IMMEDIATE")
    try:
        delta_cents = new_balance_cents - get_balance(conn)["balance_cents"]
        if delta_cents == 0:
            raise NoChangeError()
        cursor = conn.execute(
            "INSERT INTO balance_adjustment (delta_cents, reason) VALUES (?, ?)",
            (delta_cents, reason),
        )
        entry = dict(
            conn.execute(HISTORY_SQL + " WHERE id = ?", (cursor.lastrowid,)).fetchone()
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    return entry


def get_budget(conn: sqlite3.Connection) -> dict[str, Any]:
    """Budget usage for the current Brasília month. Incomes are left out."""
    month = brasilia_today().strftime("%Y-%m")
    budget = dict(conn.execute(BUDGET_SQL, (month,)).fetchone())
    budget_cents, spent_cents = budget["budget_cents"], budget["spent_cents"]
    if budget_cents > 0:
        used_percent = spent_cents * 100 // budget_cents
    else:
        # The seed always sets a budget (Business Rule 13); this only avoids
        # dividing by zero: no budget and any spending means fully used.
        used_percent = 100 if spent_cents > 0 else 0
    return {
        "month": month,
        "budget_cents": budget_cents,
        "spent_cents": spent_cents,
        "remaining_cents": budget_cents - spent_cents,
        "used_percent": used_percent,
    }
