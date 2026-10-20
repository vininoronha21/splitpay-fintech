from datetime import date

import pytest

from app.services.dashboard import period_bounds

# --- Period bounds (pure) ----------------------------------------------------

TUESDAY = date(2026, 10, 20)


@pytest.mark.parametrize(
    ("today", "expected"),
    [
        (date(2026, 10, 19), (date(2026, 10, 19), date(2026, 10, 25))),  # Monday
        (date(2026, 10, 25), (date(2026, 10, 19), date(2026, 10, 25))),  # Sunday
        (TUESDAY, (date(2026, 10, 19), date(2026, 10, 25))),
    ],
)
def test_week_runs_monday_to_sunday(today, expected):
    assert period_bounds("week", 0, today) == expected


@pytest.mark.parametrize(
    ("offset", "expected"),
    [
        (-1, (date(2026, 10, 12), date(2026, 10, 18))),
        (-3, (date(2026, 9, 28), date(2026, 10, 4))),  # across a month end
        (-42, (date(2025, 12, 29), date(2026, 1, 4))),  # across a year end
        (-520, (date(2016, 10, 31), date(2016, 11, 6))),
    ],
)
def test_week_offsets(offset, expected):
    start, end = period_bounds("week", offset, TUESDAY)
    assert (start, end) == expected
    assert start.weekday() == 0 and end.weekday() == 6


@pytest.mark.parametrize(
    ("today", "offset", "expected"),
    [
        (TUESDAY, 0, (date(2026, 10, 1), date(2026, 10, 31))),
        (TUESDAY, -1, (date(2026, 9, 1), date(2026, 9, 30))),
        (TUESDAY, -10, (date(2025, 12, 1), date(2025, 12, 31))),  # year end
        (TUESDAY, -12, (date(2025, 10, 1), date(2025, 10, 31))),
        (date(2028, 3, 15), -1, (date(2028, 2, 1), date(2028, 2, 29))),  # leap
        (date(2026, 3, 15), -1, (date(2026, 2, 1), date(2026, 2, 28))),
        (TUESDAY, -32, (date(2024, 2, 1), date(2024, 2, 29))),  # leap
        (date(2026, 1, 31), -1, (date(2025, 12, 1), date(2025, 12, 31))),
        (date(2026, 3, 31), -1, (date(2026, 2, 1), date(2026, 2, 28))),
        (TUESDAY, -520, (date(1983, 6, 1), date(1983, 6, 30))),
    ],
)
def test_month_offsets(today, offset, expected):
    assert period_bounds("month", offset, today) == expected


@pytest.mark.parametrize(
    ("today", "offset", "expected"),
    [
        (TUESDAY, 0, (date(2026, 1, 1), date(2026, 12, 31))),
        (date(2026, 1, 1), -1, (date(2025, 1, 1), date(2025, 12, 31))),
        (date(2026, 12, 31), -2, (date(2024, 1, 1), date(2024, 12, 31))),
    ],
)
def test_year_offsets(today, offset, expected):
    assert period_bounds("year", offset, today) == expected
