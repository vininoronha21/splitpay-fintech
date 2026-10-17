import time
from datetime import UTC, datetime, timedelta

import pytest

VALID_REASON = "Conferência com o extrato"
VALIDATION_ERROR = {
    "error": {"code": "validation_error", "message": "Dados inválidos na requisição."}
}


def counts_for_adjustment(row, until: str) -> bool:
    """An income or expense counts toward an adjustment made at `until`
    (YYYY-MM-DD HH:MM:SS) if dated before its day, or dated that day and
    recorded no later than it."""
    day = until[:10]
    return row["occurred_on"] < day or (
        row["occurred_on"] == day and row["created_at"] <= until
    )


def expected_parts(db, until: str | None = None) -> dict[str, int]:
    """Balance parts summed in Python from raw rows, independent of the service SQL.

    With `until` (an adjustment's created_at), only movements up to that
    adjustment count (pago shares by date only), and adjustments are left out
    (the caller adds the running total).
    """
    incomes = expenses = reimbursements = 0
    for row in db.execute(
        "SELECT type, amount_cents, occurred_on, created_at FROM transactions"
    ):
        if until is not None and not counts_for_adjustment(row, until):
            continue
        if row["type"] == "income":
            incomes += row["amount_cents"]
        else:
            expenses += row["amount_cents"]
    for row in db.execute("SELECT share_cents, status, settled_on FROM split_share"):
        if row["status"] != "pago":
            continue
        if until is not None and row["settled_on"] > until[:10]:
            continue
        reimbursements += row["share_cents"]
    adjustments = sum(
        row["delta_cents"] for row in db.execute("SELECT delta_cents FROM balance_adjustment")
    )
    initial = db.execute("SELECT initial_balance_cents FROM user_profile").fetchone()[0]
    return {
        "initial_balance_cents": initial,
        "incomes_cents": incomes,
        "reimbursements_received_cents": reimbursements,
        "expenses_cents": expenses,
        "adjustments_cents": adjustments,
        "balance_cents": initial + incomes + reimbursements - expenses + adjustments,
    }


def current_balance(client) -> int:
    return client.get("/balance").json()["balance_cents"]


def post_adjustment(client, new_balance_cents, reason=VALID_REASON):
    return client.post(
        "/balance/adjustments",
        json={"new_balance_cents": new_balance_cents, "reason": reason},
    )


# --- GET /balance -----------------------------------------------------------


def test_balance_matches_independent_sum_over_seed_rows(client, db):
    response = client.get("/balance")

    assert response.status_code == 200
    assert response.json() == expected_parts(db)


def test_balance_parts_add_up_to_balance(client):
    body = client.get("/balance").json()

    assert body["balance_cents"] == (
        body["initial_balance_cents"]
        + body["incomes_cents"]
        + body["reimbursements_received_cents"]
        - body["expenses_cents"]
        + body["adjustments_cents"]
    )


def test_balance_counts_only_pago_shares_as_reimbursements(client, db):
    before = client.get("/balance").json()
    # Settling an open share as 'acertado' closes the debt without moving money.
    db.execute(
        "UPDATE split_share SET status = 'acertado', settled_on = date('now', '-3 hours')"
        " WHERE transaction_id = 2"
    )
    db.commit()
    assert client.get("/balance").json() == before

    db.execute(
        "UPDATE split_share SET status = 'pago' WHERE transaction_id = 2"
    )
    db.commit()
    after = client.get("/balance").json()
    assert after["reimbursements_received_cents"] == before["reimbursements_received_cents"] + 9395
    assert after["balance_cents"] == before["balance_cents"] + 9395


# --- POST /balance/adjustments ----------------------------------------------


def test_create_adjustment_stores_delta_from_current_balance(client, db):
    current = current_balance(client)
    target = current + 12345

    response = post_adjustment(client, target)

    assert response.status_code == 201
    body = response.json()
    assert body["delta_cents"] == 12345
    assert body["previous_balance_cents"] == current
    assert body["new_balance_cents"] == target
    assert body["reason"] == VALID_REASON
    stored = db.execute(
        "SELECT delta_cents, reason FROM balance_adjustment WHERE id = ?", (body["id"],)
    ).fetchone()
    assert tuple(stored) == (12345, VALID_REASON)


def test_create_adjustment_with_lower_target_stores_negative_delta(client):
    current = current_balance(client)

    body = post_adjustment(client, current - 500).json()

    assert body["delta_cents"] == -500


def test_balance_reflects_adjustment(client):
    before = client.get("/balance").json()

    post_adjustment(client, before["balance_cents"] + 1000)

    after = client.get("/balance").json()
    assert after["balance_cents"] == before["balance_cents"] + 1000
    assert after["adjustments_cents"] == before["adjustments_cents"] + 1000


def test_create_adjustment_accepts_negative_target(client):
    response = post_adjustment(client, -5000)

    assert response.status_code == 201
    assert response.json()["new_balance_cents"] == -5000
    assert current_balance(client) == -5000


def test_create_adjustment_trims_reason(client, db):
    response = post_adjustment(client, current_balance(client) + 1, "   Ajuste do extrato   ")

    assert response.status_code == 201
    assert response.json()["reason"] == "Ajuste do extrato"
    stored = db.execute(
        "SELECT reason FROM balance_adjustment WHERE id = ?", (response.json()["id"],)
    ).fetchone()[0]
    assert stored == "Ajuste do extrato"


def test_create_adjustment_trims_invisible_characters_at_the_ends(client):
    reason = "\u200b\ufeff Ajuste do extrato \u200b\u00a0"

    response = post_adjustment(client, current_balance(client) + 1, reason)

    assert response.status_code == 201
    assert response.json()["reason"] == "Ajuste do extrato"


@pytest.mark.parametrize("reason", ["a" * 10, "b" * 200, "  " + "c" * 200 + "  "])
def test_create_adjustment_accepts_reason_length_limits(client, reason):
    assert post_adjustment(client, current_balance(client) + 1, reason).status_code == 201


@pytest.mark.parametrize(
    "body",
    [
        {"new_balance_cents": 1, "reason": "a" * 9},
        {"new_balance_cents": 1, "reason": "   " + "a" * 9 + "   "},
        {"new_balance_cents": 1, "reason": "a" * 201},
        {"new_balance_cents": 1, "reason": " " * 20},
        {"new_balance_cents": 1, "reason": "\u200b" * 12},
        {"new_balance_cents": 1, "reason": "\ufeff\u200c\u200d\u2060\u00a0\u3000" * 3},
        {"new_balance_cents": 1, "reason": "a" + "\u200b" * 11},
        {"new_balance_cents": 1, "reason": "\u2028\u2029\t\n" * 5},
        {"new_balance_cents": 1},
        {"new_balance_cents": 1, "reason": 1234567890},
        {"reason": VALID_REASON},
        {"new_balance_cents": "1000", "reason": VALID_REASON},
        {"new_balance_cents": 10.5, "reason": VALID_REASON},
        {"new_balance_cents": None, "reason": VALID_REASON},
        {"new_balance_cents": -(10**12) - 1, "reason": VALID_REASON},
    ],
    ids=[
        "reason_9",
        "reason_9_after_trim",
        "reason_201",
        "reason_blank",
        "reason_zero_width_only",
        "reason_mixed_invisible_only",
        "reason_9_invisible_padding",
        "reason_line_separators_only",
        "reason_missing",
        "reason_number",
        "balance_missing",
        "balance_string",
        "balance_decimal",
        "balance_null",
        "balance_too_small",
    ],
)
def test_create_adjustment_rejects_invalid_body(client, db, body):
    count_before = db.execute("SELECT count(*) FROM balance_adjustment").fetchone()[0]

    response = client.post("/balance/adjustments", json=body)

    assert response.status_code == 422
    assert response.json() == VALIDATION_ERROR
    assert db.execute("SELECT count(*) FROM balance_adjustment").fetchone()[0] == count_before


def test_create_adjustment_rejects_same_balance_with_no_change(client, db):
    count_before = db.execute("SELECT count(*) FROM balance_adjustment").fetchone()[0]

    response = post_adjustment(client, current_balance(client))

    assert response.status_code == 422
    assert response.json() == {
        "error": {"code": "no_change", "message": "O novo saldo é igual ao saldo atual."}
    }
    assert db.execute("SELECT count(*) FROM balance_adjustment").fetchone()[0] == count_before


def test_new_adjustment_created_at_is_brasilia_time(client):
    body = post_adjustment(client, current_balance(client) + 1).json()

    created_at = datetime.fromisoformat(body["created_at"])
    brasilia_now = datetime.now(UTC).replace(tzinfo=None) - timedelta(hours=3)
    assert abs(created_at - brasilia_now) < timedelta(seconds=10)


# --- GET /balance/adjustments -----------------------------------------------


def test_history_lists_seed_adjustments_newest_first(client):
    history = client.get("/balance/adjustments").json()

    assert len(history) == 2
    assert [entry["reason"] for entry in history] == [
        "Saque em dinheiro não registrado",
        "Correção após conferir o extrato do banco",
    ]
    assert history[0]["created_at"] > history[1]["created_at"]


def test_history_balances_match_independent_computation(client, db):
    adjustments = db.execute(
        "SELECT id, delta_cents, created_at FROM balance_adjustment ORDER BY created_at, id"
    ).fetchall()
    expected = {}
    running = 0
    for row in adjustments:
        running += row["delta_cents"]
        parts = expected_parts(db, until=row["created_at"])
        movements = parts["balance_cents"] - parts["adjustments_cents"]
        expected[row["id"]] = movements + running

    history = client.get("/balance/adjustments").json()

    assert {entry["id"]: entry["new_balance_cents"] for entry in history} == expected


def test_history_seed_balances_are_positive(client):
    # A demo history that dips below zero reads as a bug, so every seeded
    # adjustment must sit on a positive balance before and after it.
    history = client.get("/balance/adjustments").json()

    assert len(history) == 2
    for entry in history:
        assert entry["previous_balance_cents"] > 0
        assert entry["new_balance_cents"] > 0


def test_history_new_minus_previous_equals_delta(client):
    post_adjustment(client, current_balance(client) + 300)
    post_adjustment(client, current_balance(client) - 4500)

    history = client.get("/balance/adjustments").json()

    assert len(history) == 4
    for entry in history:
        assert entry["new_balance_cents"] - entry["previous_balance_cents"] == entry["delta_cents"]


def test_history_newest_entry_matches_balance_after_creation(client):
    first = post_adjustment(client, current_balance(client) + 300).json()
    second = post_adjustment(client, -1000).json()

    history = client.get("/balance/adjustments").json()

    assert [entry["id"] for entry in history[:2]] == [second["id"], first["id"]]
    assert history[0] == second
    assert history[0]["new_balance_cents"] == current_balance(client) == -1000
    assert history[1]["new_balance_cents"] == history[0]["previous_balance_cents"]


def post_expense(client, amount_cents, occurred_on=None):
    body = {"type": "expense", "description": "Padaria", "amount_cents": amount_cents}
    if occurred_on is not None:
        body["occurred_on"] = occurred_on
    response = client.post("/transactions", json=body)
    assert response.status_code == 201
    return response.json()


def wait_for_next_second(db, timestamp: str) -> None:
    """created_at has whole seconds, and a movement recorded in the same second
    as an adjustment counts as before it. Wait until SQLite's Brasília clock
    has moved past `timestamp`, so the next row is clearly recorded after it."""
    timestamp = timestamp.replace("T", " ")
    while db.execute("SELECT datetime('now', '-3 hours')").fetchone()[0] <= timestamp:
        time.sleep(0.02)


def test_same_day_expense_after_adjustment_keeps_typed_balance(client, db):
    # Business Rule 12: the history shows the balance the user typed, even
    # after an expense dated today is added later the same day.
    adjustment = post_adjustment(client, 123456).json()
    wait_for_next_second(db, adjustment["created_at"])

    post_expense(client, 100)

    entry = client.get("/balance/adjustments").json()[0]
    assert entry["id"] == adjustment["id"]
    assert entry["new_balance_cents"] == 123456
    assert entry == adjustment
    assert current_balance(client) == 123356


def test_same_day_income_after_adjustment_keeps_typed_balance(client, db):
    adjustment = post_adjustment(client, 123456).json()
    wait_for_next_second(db, adjustment["created_at"])

    client.post(
        "/transactions",
        json={"type": "income", "description": "Pix recebido", "amount_cents": 700},
    )

    assert client.get("/balance/adjustments").json()[0] == adjustment
    assert current_balance(client) == 124156


def test_back_dated_expense_shifts_adjustment_entry(client):
    # The history shows the balance as of the adjustment's date, so an expense
    # dated before it, added afterwards, shifts the entry.
    adjustment = post_adjustment(client, 123456).json()
    yesterday = (datetime.fromisoformat(adjustment["created_at"]) - timedelta(days=1)).date()

    post_expense(client, 100, occurred_on=yesterday.isoformat())

    entry = client.get("/balance/adjustments").json()[0]
    assert entry["id"] == adjustment["id"]
    assert entry["delta_cents"] == adjustment["delta_cents"]
    assert entry["previous_balance_cents"] == adjustment["previous_balance_cents"] - 100
    assert entry["new_balance_cents"] == 123356
    assert current_balance(client) == 123356


def test_history_matches_independent_computation_after_new_transactions(client, db):
    first = post_adjustment(client, 500000).json()
    wait_for_next_second(db, first["created_at"])
    post_expense(client, 2500)
    post_expense(client, 4000, occurred_on="2026-01-02")
    post_adjustment(client, 480000)

    adjustments = db.execute(
        "SELECT id, delta_cents, created_at FROM balance_adjustment ORDER BY created_at, id"
    ).fetchall()
    expected = {}
    running = 0
    for row in adjustments:
        running += row["delta_cents"]
        parts = expected_parts(db, until=row["created_at"])
        expected[row["id"]] = parts["balance_cents"] - parts["adjustments_cents"] + running

    history = client.get("/balance/adjustments").json()

    assert {entry["id"]: entry["new_balance_cents"] for entry in history} == expected
    assert history[0]["new_balance_cents"] == current_balance(client) == 480000


def test_history_entries_have_contract_fields(client):
    entry = client.get("/balance/adjustments").json()[0]

    assert set(entry) == {
        "id",
        "created_at",
        "delta_cents",
        "reason",
        "previous_balance_cents",
        "new_balance_cents",
    }


# --- Swagger ----------------------------------------------------------------


def test_openapi_lists_profile_and_balance_endpoints(client):
    spec = client.get("/openapi.json").json()
    paths = spec["paths"]

    assert set(paths["/profile"]) == {"get", "patch"}
    assert set(paths["/balance"]) == {"get"}
    assert set(paths["/balance/adjustments"]) == {"get", "post"}

    def response_ref(path: str, method: str, status: str) -> str:
        content = paths[path][method]["responses"][status]["content"]["application/json"]
        schema = content["schema"]
        return schema.get("$ref") or schema["items"]["$ref"]

    def request_ref(path: str, method: str) -> str:
        return paths[path][method]["requestBody"]["content"]["application/json"]["schema"]["$ref"]

    assert response_ref("/profile", "get", "200").endswith("/Profile")
    assert response_ref("/profile", "patch", "200").endswith("/Profile")
    assert request_ref("/profile", "patch").endswith("/ProfileUpdate")
    assert response_ref("/balance", "get", "200").endswith("/Balance")
    assert response_ref("/balance/adjustments", "get", "200").endswith("/Adjustment")
    assert response_ref("/balance/adjustments", "post", "201").endswith("/Adjustment")
    assert request_ref("/balance/adjustments", "post").endswith("/AdjustmentCreate")
