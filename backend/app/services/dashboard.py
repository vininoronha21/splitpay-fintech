"""Dashboard charts: the user's spending by category and by friend (US04).

A chart covers one calendar period (Business Rule 9): a week (Monday to
Sunday), a month or a year. `offset` 0 is the period containing Brasília
today, -1 the one before, and so on.
"""

import calendar
from datetime import date, timedelta
from typing import Literal

Period = Literal["week", "month", "year"]


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
