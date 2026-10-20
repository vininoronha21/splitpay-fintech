# 007 Dashboard — Plan

Status: approved

## Files to Create/Modify

- `backend/app/services/dashboard.py` (new): pure `period_bounds(period, offset, today) -> (start, end)`; `get_charts(conn, period, offset)`.
- `backend/app/routers/dashboard.py` (new); `backend/app/main.py`: register it.
- `backend/app/schemas/dashboard.py` (new): `ChartItem`, `CategoryTotal`, `PersonTotal`, `Charts`.
- `backend/tests/test_dashboard.py` (new).
- `docs/context.md`: close the week-start Open Question (Business Rule 9 gains "Monday to Sunday"); Current State says Phase 1 is done.
- `docs/development/repository-structure.md`: annotate `dashboard.py` in services, routers and schemas.

## Architectural & Tech Decisions

- **Period math in Python:** `period_bounds` uses `date` arithmetic only: week = `today - timedelta(days=today.weekday())` shifted by `7 × offset`; month = shift the (year, month) pair by `offset` with `divmod`; year = `today.year + offset`. Pure and tested without a database. Rejected: SQLite date modifiers, harder to test at month and year edges.
- **One query:** expenses with `occurred_on BETWEEN ? AND ?`, own share computed in SQL (`amount_cents - coalesce(s.share_cents, 0)`), joined to category and person; Python groups the rows into categories and people. The seed is small, so grouping in Python keeps the sort rules (accent-insensitive names) in one place.
- **Sorting:** totals descending, then `normalize_text(name)`, then id, so ties never reorder between calls. "Sem categoria" sorts after named categories with the same total.
- **Frontend TS Interfaces:** none yet (phase 2 mirrors `schemas/dashboard.py`).
- **Database Schema:** no change.

## Test Strategy

- Pure `period_bounds`: Monday and Sunday as "today", offsets across a month end, a year end, a leap year (29 Feb), −520 weeks.
- API: each AC; totals match an independent own-share sum for current and past periods; category and item sums match; "Sem categoria" bucket; the empty period from the seed; month offset 0 equals `/budget`; a new split expense moves `by_category` by the user's share and `by_person` by the friend's share; 422 codes; Swagger.

## Risks & Edge Cases

- Brasília midnight vs UTC: bounds come from `brasilia_today()`, never from the server clock.
- A month shift from 31 Jan by −1 must land on December, not fail: the bounds use the first day of the month, never the day of `today`.
