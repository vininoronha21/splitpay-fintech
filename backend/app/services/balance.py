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

# An adjustment's new balance = initial + every movement up to the adjustment
# + every adjustment up to and including it (Business Rule 19).
#
# "Up to the adjustment" for an income or expense: dated before the
# adjustment's day, or dated that same day and recorded (created_at) no later
# than the adjustment. So an expense added later the same day does not change
# the balance the user typed; a back-dated one still does, because the history
# shows the balance as of that date. A 'pago' share counts when it was settled
# (settled_at) no later than the adjustment, so marking a share 'pago' after
# an adjustment, even the same day, does not change the balance the user typed.
#
# Both conditions are one comparison of (day, timestamp) keys: a movement's
# key is (occurred_on, created_at), a 'pago' share's is (date(settled_at),
# settled_at) and an adjustment's is (date(created_at), created_at); it counts
# when its key is <= the adjustment's. Timestamps are canonical
# 'YYYY-MM-DD HH:MM:SS' text, so text order is time order and date(x) never
# reorders them. So the history is one running sum over every event sorted by
# that key, with movements (kind 0) before adjustments (kind 1) on an equal key
# and adjustments in (created_at, id) order. One sort instead of one scan of
# the transactions per adjustment.
HISTORY_SQL = """
WITH events AS (
    SELECT occurred_on AS day, created_at AS at, 0 AS kind, id,
           CASE type WHEN 'income' THEN amount_cents ELSE -amount_cents END AS cents,
           NULL AS reason
    FROM transactions
    UNION ALL
    SELECT date(settled_at), settled_at, 0, id, share_cents, NULL
    FROM split_share
    WHERE status = 'pago'
    UNION ALL
    SELECT date(created_at), created_at, 1, id, delta_cents, reason
    FROM balance_adjustment
),
running AS (
    SELECT
        kind,
        id,
        at AS created_at,
        cents AS delta_cents,
        reason,
        (SELECT initial_balance_cents FROM user_profile WHERE id = 1)
        + sum(cents) OVER (ORDER BY day, at, kind, id ROWS UNBOUNDED PRECEDING)
            AS new_balance_cents
    FROM events
)
SELECT
    id,
    created_at,
    delta_cents,
    reason,
    new_balance_cents - delta_cents AS previous_balance_cents,
    new_balance_cents
FROM running
WHERE kind = 1
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
            conn.execute(HISTORY_SQL + " AND id = ?", (cursor.lastrowid,)).fetchone()
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
