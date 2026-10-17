import pytest

from app.db import connect
from app.services import brasilia_today
from app.text import normalize_text
from tests.conftest import parallel_requests
from tests.test_balance import post_adjustment, wait_for_next_second
from tests.test_db import CHECKS

VALIDATION_ERROR = {
    "error": {"code": "validation_error", "message": "Dados inválidos na requisição."}
}
NOT_FOUND = {"error": {"code": "not_found", "message": "Reembolso não encontrado."}}
ALREADY_SETTLED = {
    "error": {"code": "already_settled", "message": "Este reembolso já foi encerrado."}
}
SPLIT_FIELDS = {
    "person_id",
    "person_name",
    "mode",
    "percent",
    "friend_share_cents",
    "user_share_cents",
    "status",
    "settled_on",
}
LIST_FIELDS = {
    "transaction_id",
    "description",
    "occurred_on",
    "person_id",
    "person_name",
    "share_cents",
    "status",
    "settled_on",
}
STATUSES = ("em_aberto", "pago", "acertado")
OPEN_SEED_SHARE = 2  # 'Ana Lima', 9395 cents, em_aberto
UNSPLIT_EXPENSE = 3
INCOME = 1
ANA = 1


def settle(client, transaction_id, status):
    return client.patch(f"/reimbursements/{transaction_id}", json={"status": status})


def balance(client) -> int:
    return client.get("/balance").json()["balance_cents"]


def spent(client) -> int:
    return client.get("/budget").json()["spent_cents"]


def share_row(db, transaction_id):
    return db.execute(
        "SELECT share_cents, status, settled_at FROM split_share WHERE transaction_id = ?",
        (transaction_id,),
    ).fetchone()


def new_split_expense(client, amount_cents=10000, person_id=ANA) -> dict:
    response = client.post(
        "/transactions",
        json={
            "type": "expense",
            "description": "Janta com a Ana",
            "amount_cents": amount_cents,
            "split": {"person_id": person_id, "mode": "equal"},
        },
    )
    assert response.status_code == 201
    return response.json()


# --- AC1: PATCH /reimbursements/{transaction_id} ------------------------------


def test_seed_share_is_open(db):
    assert share_row(db, OPEN_SEED_SHARE)["status"] == "em_aberto"


def test_pago_returns_split_block_and_moves_balance_not_budget(client, db):
    share = share_row(db, OPEN_SEED_SHARE)["share_cents"]
    balance_before, spent_before = balance(client), spent(client)

    response = settle(client, OPEN_SEED_SHARE, "pago")

    assert response.status_code == 200
    body = response.json()
    assert set(body) == SPLIT_FIELDS
    assert body["status"] == "pago"
    assert body["friend_share_cents"] == share
    assert body["settled_on"] == brasilia_today().isoformat()
    assert body == client.get(f"/transactions/{OPEN_SEED_SHARE}").json()["split"]
    assert balance(client) == balance_before + share
    assert spent(client) == spent_before


def test_acertado_moves_neither_balance_nor_budget(client):
    balance_before, spent_before = balance(client), spent(client)

    response = settle(client, OPEN_SEED_SHARE, "acertado")

    assert response.status_code == 200
    assert response.json()["status"] == "acertado"
    assert response.json()["settled_on"] == brasilia_today().isoformat()
    assert balance(client) == balance_before
    assert spent(client) == spent_before


@pytest.mark.parametrize("status", ["pago", "acertado"])
def test_settle_stores_brasilia_now_and_keeps_checks_clean(client, db, status):
    created = new_split_expense(client)

    assert settle(client, created["id"], status).status_code == 200

    row = share_row(db, created["id"])
    assert row["status"] == status
    now = db.execute("SELECT datetime('now', '-3 hours')").fetchone()[0]
    assert row["settled_at"] <= now
    assert row["settled_at"][:10] == brasilia_today().isoformat()
    for name, sql in CHECKS:
        assert db.execute(sql).fetchall() == [], name


@pytest.mark.parametrize("first", ["pago", "acertado"])
@pytest.mark.parametrize("second", ["pago", "acertado"])
def test_second_close_is_409_and_changes_nothing(client, db, first, second):
    assert settle(client, OPEN_SEED_SHARE, first).status_code == 200
    before = tuple(share_row(db, OPEN_SEED_SHARE))
    balance_before = balance(client)

    response = settle(client, OPEN_SEED_SHARE, second)

    assert response.status_code == 409
    assert response.json() == ALREADY_SETTLED
    assert tuple(share_row(db, OPEN_SEED_SHARE)) == before
    assert balance(client) == balance_before


def test_seeded_closed_share_is_409(client, db):
    closed = db.execute(
        "SELECT transaction_id FROM split_share WHERE status <> 'em_aberto' LIMIT 1"
    ).fetchone()[0]

    response = settle(client, closed, "pago")

    assert response.status_code == 409
    assert response.json() == ALREADY_SETTLED


@pytest.mark.parametrize(
    "body",
    [
        {"status": "em_aberto"},
        {"status": "Pago"},
        {"status": "recebido"},
        {"status": ""},
        {"status": None},
        {"status": 1},
        {},
        {"status": "pago", "settled_on": "2026-01-01"},
        {"status": "pago", "settled_at": "2026-01-01 10:00:00"},
    ],
)
def test_invalid_body_is_422_and_changes_nothing(client, db, body):
    before = tuple(share_row(db, OPEN_SEED_SHARE))

    response = client.patch(f"/reimbursements/{OPEN_SEED_SHARE}", json=body)

    assert response.status_code == 422
    assert response.json() == VALIDATION_ERROR
    assert tuple(share_row(db, OPEN_SEED_SHARE)) == before


def test_missing_body_is_422(client):
    response = client.patch(f"/reimbursements/{OPEN_SEED_SHARE}")

    assert response.status_code == 422
    assert response.json() == VALIDATION_ERROR


@pytest.mark.parametrize("transaction_id", ["0", "-1", "abc", "1.5", str(2**63)])
def test_invalid_transaction_id_is_422(client, transaction_id):
    response = client.patch(f"/reimbursements/{transaction_id}", json={"status": "pago"})

    assert response.status_code == 422
    assert response.json() == VALIDATION_ERROR


@pytest.mark.parametrize("transaction_id", [999, 2**63 - 1, INCOME, UNSPLIT_EXPENSE])
def test_no_share_is_404(client, db, transaction_id):
    balance_before = balance(client)

    response = settle(client, transaction_id, "pago")

    assert response.status_code == 404
    assert response.json() == NOT_FOUND
    assert balance(client) == balance_before


def test_seed_income_and_unsplit_expense_ids_are_what_the_tests_assume(db):
    assert db.execute("SELECT type FROM transactions WHERE id = ?", (INCOME,)).fetchone()[0] == (
        "income"
    )
    unsplit = db.execute(
        "SELECT type, split_mode FROM transactions WHERE id = ?", (UNSPLIT_EXPENSE,)
    ).fetchone()
    assert tuple(unsplit) == ("expense", None)


def test_pago_after_same_day_adjustment_keeps_its_balance(client, db):
    # AC5 through the API: the payment counts from now on, not in the past entry.
    adjustment = post_adjustment(client, 123456).json()
    wait_for_next_second(db, adjustment["created_at"])

    assert settle(client, OPEN_SEED_SHARE, "pago").status_code == 200

    entry = client.get("/balance/adjustments").json()[0]
    assert entry == adjustment
    assert balance(client) == 123456 + share_row(db, OPEN_SEED_SHARE)["share_cents"]


# --- AC6: two visitors close the same share -------------------------------------


@pytest.mark.parametrize("status", ["pago", "acertado"])
def test_parallel_closes_same_share_one_wins(database_path, status):
    requests = [("PATCH", f"/reimbursements/{OPEN_SEED_SHARE}", {"status": status})] * 20

    statuses = parallel_requests(database_path, requests)

    assert not [code for code in statuses if code >= 500], statuses
    assert statuses.count(200) == 1, statuses
    assert statuses.count(409) == len(requests) - 1, statuses


def test_parallel_mixed_closes_one_wins_and_balance_matches(database_path):
    requests = [
        ("PATCH", f"/reimbursements/{OPEN_SEED_SHARE}", {"status": status})
        for status in ("pago", "acertado") * 10
    ]

    statuses = parallel_requests(database_path, requests)

    assert statuses.count(200) == 1, statuses
    assert statuses.count(409) == len(requests) - 1, statuses
    # The app is closed; the file keeps what the one winning request wrote.
    winner = requests[statuses.index(200)][2]["status"]
    conn = connect(database_path)
    try:
        assert share_row(conn, OPEN_SEED_SHARE)["status"] == winner
    finally:
        conn.close()


# --- AC2: GET /reimbursements ---------------------------------------------------


def expected_list(db, status=None) -> list[dict]:
    rows = db.execute(
        "SELECT t.id, t.description, t.occurred_on, s.person_id, p.name, s.share_cents,"
        " s.status, s.settled_at"
        " FROM split_share s, transactions t, person p"
        " WHERE t.id = s.transaction_id AND p.id = s.person_id"
    ).fetchall()
    items = [
        {
            "transaction_id": row[0],
            "description": row[1],
            "occurred_on": row[2],
            "person_id": row[3],
            "person_name": row[4],
            "share_cents": row[5],
            "status": row[6],
            "settled_on": row[7][:10] if row[7] else None,
        }
        for row in rows
        if status is None or row[6] == status
    ]
    return sorted(
        items, key=lambda item: (item["occurred_on"], item["transaction_id"]), reverse=True
    )


def test_list_matches_independent_query(client, db):
    response = client.get("/reimbursements")

    assert response.status_code == 200
    body = response.json()
    assert all(set(item) == LIST_FIELDS for item in body)
    assert body == expected_list(db)
    assert {item["status"] for item in body} == set(STATUSES)


@pytest.mark.parametrize("status", STATUSES)
def test_list_filtered_by_status(client, db, status):
    response = client.get("/reimbursements", params={"status": status})

    assert response.status_code == 200
    body = response.json()
    assert body
    assert body == expected_list(db, status)
    assert all(item["status"] == status for item in body)
    assert all((item["settled_on"] is None) == (status == "em_aberto") for item in body)


def test_list_follows_transactions_order(client):
    split_ids = [
        item["id"] for item in client.get("/transactions").json() if item["split_status"]
    ]

    assert [item["transaction_id"] for item in client.get("/reimbursements").json()] == split_ids


@pytest.mark.parametrize("status", ["", "Pago", "aberto", "all", "1"])
def test_list_invalid_status_is_422(client, status):
    response = client.get("/reimbursements", params={"status": status})

    assert response.status_code == 422
    assert response.json() == VALIDATION_ERROR


def test_list_reflects_a_settlement(client, db):
    open_before = client.get("/reimbursements", params={"status": "em_aberto"}).json()

    settle(client, OPEN_SEED_SHARE, "pago")

    open_after = client.get("/reimbursements", params={"status": "em_aberto"}).json()
    paid = client.get("/reimbursements", params={"status": "pago"}).json()
    assert len(open_after) == len(open_before) - 1
    assert OPEN_SEED_SHARE not in [item["transaction_id"] for item in open_after]
    moved = next(item for item in paid if item["transaction_id"] == OPEN_SEED_SHARE)
    assert moved["settled_on"] == brasilia_today().isoformat()
    assert client.get("/reimbursements").json() == expected_list(db)


# --- AC3: GET /reimbursements/summary -------------------------------------------


def expected_summary(db) -> dict:
    totals: dict[int, dict] = {}
    for person_id, name, share_cents in db.execute(
        "SELECT s.person_id, p.name, s.share_cents FROM split_share s, person p"
        " WHERE p.id = s.person_id AND s.status = 'em_aberto'"
    ):
        entry = totals.setdefault(
            person_id, {"person_id": person_id, "person_name": name, "open_cents": 0}
        )
        entry["open_cents"] += share_cents
    by_person = sorted(
        totals.values(),
        key=lambda e: (-e["open_cents"], normalize_text(e["person_name"]), e["person_id"]),
    )
    open_count = db.execute(
        "SELECT count(*) FROM split_share WHERE status = 'em_aberto'"
    ).fetchone()[0]
    return {
        "open_cents": sum(e["open_cents"] for e in by_person),
        "open_count": open_count,
        "by_person": by_person,
    }


def test_summary_matches_independent_sums_over_seed(client, db):
    response = client.get("/reimbursements/summary")

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"open_cents", "open_count", "by_person"}
    assert body == expected_summary(db)
    assert body["open_count"] > 0
    assert all(person["open_cents"] > 0 for person in body["by_person"])
    assert all(
        set(person) == {"person_id", "person_name", "open_cents"} for person in body["by_person"]
    )


def test_summary_changes_after_settling(client, db):
    before = client.get("/reimbursements/summary").json()
    share = share_row(db, OPEN_SEED_SHARE)["share_cents"]

    settle(client, OPEN_SEED_SHARE, "acertado")

    after = client.get("/reimbursements/summary").json()
    assert after == expected_summary(db)
    assert after["open_cents"] == before["open_cents"] - share
    assert after["open_count"] == before["open_count"] - 1


def test_summary_drops_friend_with_nothing_open(client, db):
    for (transaction_id,) in db.execute(
        "SELECT transaction_id FROM split_share WHERE status = 'em_aberto'"
    ).fetchall():
        assert settle(client, transaction_id, "pago").status_code == 200

    assert client.get("/reimbursements/summary").json() == {
        "open_cents": 0,
        "open_count": 0,
        "by_person": [],
    }


def test_summary_orders_ties_by_name_ignoring_accents(client):
    zeca = client.post("/friends", json={"name": "Zeca"}).json()
    alvaro = client.post("/friends", json={"name": "Álvaro"}).json()
    big = 10**10  # larger than any seed share, so these two come first
    new_split_expense(client, amount_cents=big, person_id=zeca["id"])
    new_split_expense(client, amount_cents=big, person_id=alvaro["id"])

    by_person = client.get("/reimbursements/summary").json()["by_person"]

    assert [person["person_name"] for person in by_person[:2]] == ["Álvaro", "Zeca"]
    assert by_person[0]["open_cents"] == big // 2


def test_summary_orders_largest_first(client):
    by_person = client.get("/reimbursements/summary").json()["by_person"]

    amounts = [person["open_cents"] for person in by_person]
    assert amounts == sorted(amounts, reverse=True)


# --- AC7: Swagger ---------------------------------------------------------------


def test_openapi_documents_reimbursement_endpoints(client):
    spec = client.get("/openapi.json").json()
    paths = spec["paths"]

    assert set(paths["/reimbursements"]) == {"get"}
    assert set(paths["/reimbursements/summary"]) == {"get"}
    assert set(paths["/reimbursements/{transaction_id}"]) == {"patch"}
    assert spec["components"]["schemas"]["SettleRequest"]["additionalProperties"] is False

    patch = paths["/reimbursements/{transaction_id}"]["patch"]["responses"]
    assert patch["200"]["content"]["application/json"]["schema"]["$ref"].endswith(
        "/SplitDetail"
    )
    assert "not_found" in patch["404"]["description"]
    assert "already_settled" in patch["409"]["description"]
    assert "validation_error" in patch["422"]["description"]
    listing = paths["/reimbursements"]["get"]["responses"]
    assert "validation_error" in listing["422"]["description"]
    for responses in (patch, listing):
        for status, response in responses.items():
            if status.startswith("4"):
                schema = response["content"]["application/json"]["schema"]
                assert schema["$ref"].endswith("/ErrorResponse")
