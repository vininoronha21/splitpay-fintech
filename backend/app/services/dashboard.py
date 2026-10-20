"""Dashboard charts: the user's spending by category and by friend (US04).

A chart covers one calendar period (Business Rule 9): a week (Monday to
Sunday), a month or a year. `offset` 0 is the period containing Brasília
today, -1 the one before, and so on.
"""

import calendar
import sqlite3
from datetime import date, timedelta
from typing import Any, Literal

from app.services import brasilia_today
from app.text import normalize_text

Period = Literal["week", "month", "year"]

UNCATEGORIZED = "Sem categoria"

# Every expense dated in the period, with the user's own share (amount minus
# the friend's share when split, Business Rule 5) and, when split, the friend.
# Incomes never count. Newest first, so the items keep this order when grouped.
EXPENSES_SQL = """
SELECT
    t.id AS transaction_id,
    t.description,
    t.occurred_on,
    t.amount_cents - coalesce(s.share_cents, 0) AS own_share_cents,
    t.category_id,
    c.name AS category_name,
    s.person_id,
    p.name AS person_name,
    s.share_cents
FROM transactions t
LEFT JOIN category c ON c.id = t.category_id
LEFT JOIN split_share s ON s.transaction_id = t.id
LEFT JOIN person p ON p.id = s.person_id
WHERE t.type = 'expense' AND t.occurred_on BETWEEN ? AND ?
ORDER BY t.occurred_on DESC, t.id DESC
"""


def period_bounds(period: Period, offset: int, today: date) -> tuple[date, date]:
    """First and last day (inclusive) of the period `offset` steps from today's.

    Pure date arithmetic, so it is tested without a database. A month shift
    starts from the first of the month, never from today's day, so 31 Jan
    minus one month is December, not an invalid 31 Feb.
    """
    if period == "week":
        start = today - timedelta(days=today.weekday()) + timedelta(weeks=offset)
        return start, start + timedelta(days=6)
    if period == "month":
        # Count months from year 0, shift, then split back into (year, month).
        year, month_index = divmod(today.year * 12 + today.month - 1 + offset, 12)
        month = month_index + 1
        last_day = calendar.monthrange(year, month)[1]
        return date(year, month, 1), date(year, month, last_day)
    year = today.year + offset
    return date(year, 1, 1), date(year, 12, 31)


def _category_key(category: dict[str, Any]) -> tuple:
    # Among equal totals, the uncategorized bucket goes last; ids break ties.
    is_uncategorized = category["category_id"] is None
    return (
        -category["total_cents"],
        is_uncategorized,
        normalize_text(category["category_name"]),
        category["category_id"] or 0,
    )


def get_charts(conn: sqlite3.Connection, period: Period, offset: int) -> dict[str, Any]:
    """Spending by category (with its items) and by friend for one period.

    One query; Python groups the rows, so the accent-insensitive name order
    lives in one place (SQLite's ORDER BY would put "Á" after "z").
    """
    start, end = period_bounds(period, offset, brasilia_today())
    rows = conn.execute(EXPENSES_SQL, (start.isoformat(), end.isoformat())).fetchall()

    categories: dict[int | None, dict[str, Any]] = {}
    people: dict[int, dict[str, Any]] = {}
    for row in rows:
        category = categories.setdefault(
            row["category_id"],
            {
                "category_id": row["category_id"],
                "category_name": row["category_name"] or UNCATEGORIZED,
                "total_cents": 0,
                "items": [],
            },
        )
        category["total_cents"] += row["own_share_cents"]
        category["items"].append(
            {
                key: row[key]
                for key in ("transaction_id", "description", "occurred_on", "own_share_cents")
            }
        )
        if row["person_id"] is not None:
            person = people.setdefault(
                row["person_id"],
                {
                    "person_id": row["person_id"],
                    "person_name": row["person_name"],
                    "total_cents": 0,
                },
            )
            person["total_cents"] += row["share_cents"]

    return {
        "period": period,
        "start": start,
        "end": end,
        "total_cents": sum(row["own_share_cents"] for row in rows),
        "by_category": sorted(categories.values(), key=_category_key),
        "by_person": sorted(
            people.values(),
            key=lambda p: (-p["total_cents"], normalize_text(p["person_name"]), p["person_id"]),
        ),
    }
