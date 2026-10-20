from datetime import date, datetime, timezone

import pytest

import app.services
import app.services.dashboard
from app.services import brasilia_today
from app.services.dashboard import period_bounds
from app.text import normalize_text
from tests.test_balance import wait_until_not_near_midnight

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


# --- API ---------------------------------------------------------------------

VALIDATION_ERROR = {
    "error": {"code": "validation_error", "message": "Dados inválidos na requisição."}
}
PERIODS = ("week", "month", "year")
ANA = 1


def charts(client, period, offset=0) -> dict:
    response = client.get("/dashboard/charts", params={"period": period, "offset": offset})
    assert response.status_code == 200
    return response.json()


def expected_own_spending(db, start: str, end: str) -> int:
    """Independent of the service: loop over every expense in Python."""
    total = 0
    for amount, occurred_on, share in db.execute(
        "SELECT t.amount_cents, t.occurred_on, s.share_cents FROM transactions t"
        " LEFT JOIN split_share s ON s.transaction_id = t.id WHERE t.type = 'expense'"
    ):
        if start <= occurred_on <= end:
            total += amount - (share or 0)
    return total


@pytest.fixture
def same_day(db):
    """Tests below compare a few calls; keep them on one Brasília day."""
    wait_until_not_near_midnight(db)


@pytest.mark.parametrize("period", PERIODS)
@pytest.mark.parametrize("offset", [0, -1, -2, -5])
def test_total_is_own_share_of_expenses_in_period(client, db, same_day, period, offset):
    # AC1, AC3: bounds from Brasília today; incomes and friend shares excluded.
    body = charts(client, period, offset)
    assert body["period"] == period
    start, end = period_bounds(period, offset, brasilia_today())
    assert (body["start"], body["end"]) == (start.isoformat(), end.isoformat())
    assert body["total_cents"] == expected_own_spending(db, body["start"], body["end"])


def test_offset_defaults_to_current_period(client, same_day):
    response = client.get("/dashboard/charts", params={"period": "month"})
    assert response.status_code == 200
    assert response.json() == charts(client, "month", 0)


def test_seed_has_spending_in_current_periods(client, same_day):
    for period in PERIODS:
        assert charts(client, period)["total_cents"] > 0


@pytest.mark.parametrize("period", PERIODS)
@pytest.mark.parametrize("offset", [0, -1, -3])
def test_category_and_item_sums(client, same_day, period, offset):
    # AC4, AC5: categories sum to the total, items to their category.
    body = charts(client, period, offset)
    assert sum(c["total_cents"] for c in body["by_category"]) == body["total_cents"]
    for category in body["by_category"]:
        assert category["items"]
        assert sum(i["own_share_cents"] for i in category["items"]) == category["total_cents"]
        order = [(i["occurred_on"], i["transaction_id"]) for i in category["items"]]
        assert order == sorted(order, reverse=True)
        for item in category["items"]:
            assert body["start"] <= item["occurred_on"] <= body["end"]


def test_categories_sorted_by_total_then_name(client, same_day):
    for period in PERIODS:
        categories = charts(client, period)["by_category"]
        keys = [(-c["total_cents"], normalize_text(c["category_name"])) for c in categories]
        assert keys == sorted(keys)
        assert len({c["category_id"] for c in categories}) == len(categories)


def test_items_match_database_rows(client, db, same_day):
    body = charts(client, "year")
    items = {i["transaction_id"]: i for c in body["by_category"] for i in c["items"]}
    rows = db.execute(
        "SELECT t.id, t.description, t.occurred_on, t.category_id,"
        " t.amount_cents - coalesce(s.share_cents, 0) FROM transactions t"
        " LEFT JOIN split_share s ON s.transaction_id = t.id"
        " WHERE t.type = 'expense' AND t.occurred_on BETWEEN ? AND ?",
        (body["start"], body["end"]),
    ).fetchall()
    assert set(items) == {row[0] for row in rows}
    for transaction_id, description, occurred_on, _, own in rows:
        assert items[transaction_id] == {
            "transaction_id": transaction_id,
            "description": description,
            "occurred_on": occurred_on,
            "own_share_cents": own,
        }
    # Incomes never appear.
    income_ids = {row[0] for row in db.execute("SELECT id FROM transactions WHERE type = 'income'")}
    assert not income_ids & set(items)


def test_uncategorized_expense_grouped_as_sem_categoria(client, same_day):
    # AC4: no category -> category_id null, "Sem categoria".
    before = charts(client, "week")
    created = client.post(
        "/transactions",
        json={"type": "expense", "description": "Xyzzy", "amount_cents": 1234},
    )
    assert created.status_code == 201
    assert created.json()["category_id"] is None

    after = charts(client, "week")
    assert after["total_cents"] == before["total_cents"] + 1234
    bucket = [c for c in after["by_category"] if c["category_id"] is None]
    assert len(bucket) == 1
    assert bucket[0]["category_name"] == "Sem categoria"
    assert bucket[0]["items"][0]["transaction_id"] == created.json()["id"]
    assert bucket[0]["items"][0]["own_share_cents"] == 1234


def test_uncategorized_goes_last_among_equal_totals(client, db, same_day):
    # Make the "Sem categoria" bucket tie with a new category of the same total
    # whose name sorts after it, in an otherwise empty past year.
    db.execute("INSERT INTO category (id, name) VALUES (99, 'Zzz')")
    old = period_bounds("year", -3, brasilia_today())[0].isoformat()
    db.executemany(
        "INSERT INTO transactions (type, description, amount_cents, category_id, occurred_on)"
        " VALUES ('expense', ?, 500, ?, ?)",
        [("Sem", None, old), ("Com", 99, old)],
    )
    db.commit()
    names = [c["category_name"] for c in charts(client, "year", -3)["by_category"]]
    assert names == ["Zzz", "Sem categoria"]


def test_by_person_sums_friend_shares_any_status(client, db, same_day):
    # AC6: every status counts; sorted by total, then by name.
    for period in PERIODS:
        body = charts(client, period)
        expected: dict[int, int] = {}
        for person_id, share in db.execute(
            "SELECT s.person_id, s.share_cents FROM split_share s"
            " JOIN transactions t ON t.id = s.transaction_id"
            " WHERE t.occurred_on BETWEEN ? AND ?",
            (body["start"], body["end"]),
        ):
            expected[person_id] = expected.get(person_id, 0) + share
        assert {p["person_id"]: p["total_cents"] for p in body["by_person"]} == expected
        keys = [(-p["total_cents"], normalize_text(p["person_name"])) for p in body["by_person"]]
        assert keys == sorted(keys)


def test_by_person_counts_closed_shares(client, same_day):
    before = charts(client, "year")["by_person"]
    response = client.patch("/reimbursements/2", json={"status": "acertado"})
    assert response.status_code == 200
    assert charts(client, "year")["by_person"] == before


def test_empty_period_returns_zero_and_empty_lists(client, db, same_day):
    # AC7: the seed has a navigable period with no expenses.
    empty = charts(client, "year", -2)
    assert empty["total_cents"] == 0
    assert empty["by_category"] == []
    assert empty["by_person"] == []

    # Search only the months the seed covers, so an empty month here is a real
    # gap inside the seeded range, not a month older than the seed.
    first_expense = date.fromisoformat(
        db.execute("SELECT min(occurred_on) FROM transactions WHERE type = 'expense'").fetchone()[0]
    )
    today = brasilia_today()
    oldest_offset = (first_expense.year - today.year) * 12 + first_expense.month - today.month
    assert charts(client, "month", oldest_offset)["total_cents"] > 0
    empty_months = [
        offset
        for offset in range(0, oldest_offset, -1)
        if charts(client, "month", offset)["total_cents"] == 0
    ]
    assert empty_months
    body = charts(client, "month", empty_months[0])
    assert (body["by_category"], body["by_person"]) == ([], [])


def test_people_tie_sorted_ignoring_case_and_accents(client, same_day):
    # AC6: equal totals -> name order ignoring case and accents. Created in
    # the reverse of the expected order, so neither the raw name nor the id
    # gives it.
    ids = {}
    for name in ("Zeca", "beto", "Álvaro"):
        created = client.post("/friends", json={"name": name})
        assert created.status_code == 201
        ids[created.json()["id"]] = name
        expense = client.post(
            "/transactions",
            json={
                "type": "expense",
                "description": f"Rateio com {name}",
                "amount_cents": 2000,
                "category_id": 8,
                "split": {"person_id": created.json()["id"], "mode": "fixed", "share_cents": 777},
            },
        )
        assert expense.status_code == 201
    people = [p for p in charts(client, "week")["by_person"] if p["person_id"] in ids]
    assert [p["person_name"] for p in people] == ["Álvaro", "beto", "Zeca"]
    assert {p["total_cents"] for p in people} == {777}


def test_categories_tie_sorted_ignoring_case_and_accents(client, db, same_day):
    # AC4: equal totals -> name order ignoring case and accents. Inserted in
    # the reverse of the expected order, so neither the raw name nor the id
    # gives it.
    db.executemany(
        "INSERT INTO category (id, name) VALUES (?, ?)",
        [(97, "chá"), (98, "Bebidas"), (99, "Álcool")],
    )
    db.commit()
    for category_id in (97, 98, 99):
        created = client.post(
            "/transactions",
            json={
                "type": "expense",
                "description": "Empate",
                "amount_cents": 98765,
                "category_id": category_id,
            },
        )
        assert created.status_code == 201
    categories = [
        c for c in charts(client, "week")["by_category"] if c["category_id"] in (97, 98, 99)
    ]
    assert [c["category_name"] for c in categories] == ["Álcool", "Bebidas", "chá"]
    assert {c["total_cents"] for c in categories} == {98765}


def test_same_day_items_newest_id_first(client, db, same_day):
    # AC5: items on the same day keep a stable order, newest id first.
    db.execute("INSERT INTO category (id, name) VALUES (99, 'Mesmo dia')")
    db.commit()
    ids = []
    for amount in (100, 200, 300):
        created = client.post(
            "/transactions",
            json={"type": "expense", "description": "Mesmo dia", "amount_cents": amount,
                  "category_id": 99},
        )
        assert created.status_code == 201
        ids.append(created.json()["id"])
    category = next(c for c in charts(client, "week")["by_category"] if c["category_id"] == 99)
    assert [i["transaction_id"] for i in category["items"]] == ids[::-1]


@pytest.mark.parametrize(
    ("utc_instant", "week", "month", "year"),
    [
        # Sunday 1 Nov 2026 in UTC, still Saturday 31 Oct 22:30 in Brasília.
        (datetime(2026, 11, 1, 1, 30), ("2026-10-26", "2026-11-01"), "2026-10", "2026"),
        # Monday 26 Oct in UTC, still Sunday 25 Oct 22:30 in Brasília.
        (datetime(2026, 10, 26, 1, 30), ("2026-10-19", "2026-10-25"), "2026-10", "2026"),
        # 1 Jan 2027 in UTC, still 31 Dec 2026 22:30 in Brasília.
        (datetime(2027, 1, 1, 1, 30), ("2026-12-28", "2027-01-03"), "2026-12", "2026"),
    ],
)
def test_periods_follow_brasilia_date_not_server_clock(
    client, monkeypatch, utc_instant, week, month, year
):
    # Business Rule 18: a server clock in UTC is already on the next day.
    instant = utc_instant.replace(tzinfo=timezone.utc)

    class FrozenDateTime(datetime):
        @classmethod
        def now(cls, tz=None):
            return instant.astimezone(tz) if tz else instant.replace(tzinfo=None)

    class ServerDate(date):
        @classmethod
        def today(cls):
            return instant.date()

    monkeypatch.setattr(app.services, "datetime", FrozenDateTime)
    # The server's own date, should the service ever read it instead.
    monkeypatch.setattr(app.services.dashboard, "date", ServerDate)

    assert (charts(client, "week")["start"], charts(client, "week")["end"]) == week
    month_body = charts(client, "month")
    assert month_body["start"][:7] == month_body["end"][:7] == month
    assert month_body["start"].endswith("-01")
    assert charts(client, "year")["start"] == f"{year}-01-01"


def test_current_month_matches_budget(client, same_day):
    # AC8: the same number the budget counts.
    assert charts(client, "month")["total_cents"] == client.get("/budget").json()["spent_cents"]


def test_new_split_expense_moves_category_and_person(client, same_day):
    before = charts(client, "week")
    created = client.post(
        "/transactions",
        json={
            "type": "expense",
            "description": "Janta com a Ana",
            "amount_cents": 10001,
            "category_id": 1,
            "split": {"person_id": ANA, "mode": "equal"},
        },
    )
    assert created.status_code == 201
    friend_share = 5000  # floor(10001 / 2)
    own_share = 10001 - friend_share
    after = charts(client, "week")

    def category_total(body):
        return next((c["total_cents"] for c in body["by_category"] if c["category_id"] == 1), 0)

    def person_total(body):
        return next((p["total_cents"] for p in body["by_person"] if p["person_id"] == ANA), 0)

    assert after["total_cents"] == before["total_cents"] + own_share
    assert category_total(after) == category_total(before) + own_share
    assert person_total(after) == person_total(before) + friend_share


@pytest.mark.parametrize(
    "params",
    [
        {},
        {"offset": 0},
        {"period": "day"},
        {"period": "WEEK"},
        {"period": ""},
        {"period": "month", "offset": 1},
        {"period": "month", "offset": -521},
        {"period": "month", "offset": "1.5"},
        {"period": "month", "offset": "abc"},
        {"period": "month", "offset": ""},
    ],
)
def test_invalid_query_is_validation_error(client, params):
    response = client.get("/dashboard/charts", params=params)
    assert response.status_code == 422
    assert response.json() == VALIDATION_ERROR


@pytest.mark.parametrize("period", PERIODS)
def test_oldest_offset_is_accepted(client, period):
    body = charts(client, period, -520)
    assert body["total_cents"] == 0


def test_openapi_documents_dashboard_endpoint(client):
    # AC9: every error response uses ErrorResponse.
    spec = client.get("/openapi.json").json()
    operation = spec["paths"]["/dashboard/charts"]
    assert set(operation) == {"get"}
    responses = operation["get"]["responses"]
    assert responses["200"]["content"]["application/json"]["schema"]["$ref"].endswith("/Charts")
    assert "validation_error" in responses["422"]["description"]
    for status, response in responses.items():
        if status.startswith("4"):
            assert response["content"]["application/json"]["schema"]["$ref"].endswith(
                "/ErrorResponse"
            )
    params = {p["name"]: p for p in operation["get"]["parameters"]}
    assert params["period"]["required"] is True
    assert params["period"]["schema"]["enum"] == ["week", "month", "year"]
    assert params["offset"]["schema"]["minimum"] == -520
    assert params["offset"]["schema"]["maximum"] == 0
