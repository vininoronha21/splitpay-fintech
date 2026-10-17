import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.services import brasilia_today
from tests.test_db import CHECKS

VALIDATION_ERROR = {
    "error": {"code": "validation_error", "message": "Dados inválidos na requisição."}
}
DETAIL_FIELDS = {
    "id",
    "type",
    "description",
    "amount_cents",
    "category_id",
    "category_name",
    "occurred_on",
    "place",
    "payment_method",
    "installment_number",
    "installment_total",
    "notes",
    "created_at",
    "split",
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
SUMMARY_FIELDS = {
    "id",
    "type",
    "description",
    "amount_cents",
    "own_share_cents",
    "category_name",
    "occurred_on",
    "friend_name",
    "split_status",
}
ANA = 1  # seed person 'Ana Lima'


def expense(**overrides):
    body = {"type": "expense", "description": "Janta com a Ana", "amount_cents": 10000}
    body.update(overrides)
    return body


def counts(db) -> tuple[int, int]:
    return (
        db.execute("SELECT count(*) FROM transactions").fetchone()[0],
        db.execute("SELECT count(*) FROM split_share").fetchone()[0],
    )


def assert_rejected(client, db, body, code="validation_error"):
    before = counts(db)

    response = client.post("/transactions", json=body)

    assert response.status_code == 422, response.json()
    assert response.json()["error"]["code"] == code
    if code == "validation_error":
        assert response.json() == VALIDATION_ERROR
    assert counts(db) == before


# --- AC1: create expense or income -------------------------------------------


def test_create_minimal_expense_returns_detail_with_defaults(client):
    response = client.post("/transactions", json=expense())

    assert response.status_code == 201
    body = response.json()
    assert set(body) == DETAIL_FIELDS
    assert body["type"] == "expense"
    assert body["description"] == "Janta com a Ana"
    assert body["amount_cents"] == 10000
    assert body["occurred_on"] == brasilia_today().isoformat()
    assert body["created_at"].startswith(brasilia_today().isoformat())
    assert body["split"] is None
    for field in ("category_id", "category_name", "place", "payment_method",
                  "installment_number", "installment_total", "notes"):
        assert body[field] is None


def test_create_income(client):
    response = client.post(
        "/transactions",
        json={"type": "income", "description": "Freela", "amount_cents": 50000,
              "payment_method": "pix"},
    )

    assert response.status_code == 201
    assert response.json()["type"] == "income"
    assert response.json()["split"] is None


def test_create_stores_every_field(client, db):
    occurred_on = (brasilia_today() - timedelta(days=3)).isoformat()
    body = expense(
        description="  Curso de violão  ",
        amount_cents=29990,
        occurred_on=occurred_on,
        category_id=7,
        place=" Escola de Música ",
        payment_method="credito",
        installment_number=3,
        installment_total=10,
        notes="Terceira parcela",
    )

    response = client.post("/transactions", json=body)

    assert response.status_code == 201
    detail = response.json()
    assert detail["description"] == "Curso de violão"
    assert detail["occurred_on"] == occurred_on
    assert detail["category_id"] == 7
    assert detail["category_name"] == "Educação"
    assert detail["place"] == "Escola de Música"
    assert detail["payment_method"] == "credito"
    assert (detail["installment_number"], detail["installment_total"]) == (3, 10)
    assert detail["notes"] == "Terceira parcela"
    row = db.execute("SELECT * FROM transactions WHERE id = ?", (detail["id"],)).fetchone()
    assert row["description"] == "Curso de violão"
    assert row["occurred_on"] == occurred_on
    assert row["place"] == "Escola de Música"
    assert row["split_mode"] is None
    assert client.get(f"/transactions/{detail['id']}").json() == detail


@pytest.mark.parametrize("blank", ["", "   ", "​ "])
def test_create_turns_blank_optional_text_into_null(client, blank):
    response = client.post("/transactions", json=expense(place=blank, notes=blank))

    assert response.status_code == 201
    assert response.json()["place"] is None
    assert response.json()["notes"] is None


def test_create_accepts_today_and_installment_one_of_one(client):
    response = client.post(
        "/transactions",
        json=expense(
            occurred_on=brasilia_today().isoformat(), installment_number=1, installment_total=1
        ),
    )

    assert response.status_code == 201


# --- AC2: 1-to-1 split --------------------------------------------------------


@pytest.mark.parametrize(
    ("amount", "friend", "user"),
    [(10000, 5000, 5000), (10001, 5000, 5001), (1, 0, 1)],
    ids=["R$100,00", "R$100,01", "1_cent"],
)
def test_equal_split(client, db, amount, friend, user):
    response = client.post(
        "/transactions",
        json=expense(amount_cents=amount, split={"person_id": ANA, "mode": "equal"}),
    )

    assert response.status_code == 201
    split = response.json()["split"]
    assert split == {
        "person_id": ANA,
        "person_name": "Ana Lima",
        "mode": "equal",
        "percent": None,
        "friend_share_cents": friend,
        "user_share_cents": user,
        "status": "em_aberto",
        "settled_on": None,
    }
    tx_id = response.json()["id"]
    row = db.execute(
        "SELECT split_mode, split_percent FROM transactions WHERE id = ?", (tx_id,)
    ).fetchone()
    assert tuple(row) == ("equal", None)
    share = db.execute(
        "SELECT person_id, share_cents, status, settled_on FROM split_share"
        " WHERE transaction_id = ?",
        (tx_id,),
    ).fetchone()
    assert tuple(share) == (ANA, friend, "em_aberto", None)


@pytest.mark.parametrize(
    ("percent", "friend"), [(0, 0), (33, 3300), (40, 4000), (100, 10000)]
)
def test_percentage_split(client, db, percent, friend):
    response = client.post(
        "/transactions",
        json=expense(split={"person_id": 2, "mode": "percentage", "percent": percent}),
    )

    assert response.status_code == 201
    split = response.json()["split"]
    assert split["mode"] == "percentage"
    assert split["percent"] == percent
    assert split["person_name"] == "Carlos Mendes"
    assert split["friend_share_cents"] == friend
    assert split["user_share_cents"] == 10000 - friend
    stored = db.execute(
        "SELECT split_percent FROM transactions WHERE id = ?", (response.json()["id"],)
    ).fetchone()[0]
    assert stored == percent


def test_percentage_split_rounds_friend_share_down(client):
    response = client.post(
        "/transactions",
        json=expense(amount_cents=21437, split={"person_id": ANA, "mode": "percentage",
                                                "percent": 50}),
    )

    split = response.json()["split"]
    assert (split["friend_share_cents"], split["user_share_cents"]) == (10718, 10719)


@pytest.mark.parametrize("share", [1, 9000, 10000])
def test_fixed_split(client, share):
    response = client.post(
        "/transactions",
        json=expense(split={"person_id": ANA, "mode": "fixed", "share_cents": share}),
    )

    assert response.status_code == 201
    split = response.json()["split"]
    assert split["mode"] == "fixed"
    assert split["percent"] is None
    assert split["friend_share_cents"] == share
    assert split["user_share_cents"] == 10000 - share


def test_split_shares_always_sum_to_amount_and_checks_pass(client, db):
    bodies = [
        expense(amount_cents=amount, split=split)
        for amount in (1, 2, 3, 99, 101, 10001, 12345678)
        for split in (
            {"person_id": ANA, "mode": "equal"},
            {"person_id": ANA, "mode": "percentage", "percent": 33},
            {"person_id": ANA, "mode": "percentage", "percent": 67},
            {"person_id": ANA, "mode": "fixed", "share_cents": 1},
            {"person_id": ANA, "mode": "fixed", "share_cents": amount},
        )
    ]
    for body in bodies:
        split = client.post("/transactions", json=body).json()["split"]
        assert split["friend_share_cents"] + split["user_share_cents"] == body["amount_cents"]

    for name, sql in CHECKS:
        assert db.execute(sql).fetchall() == [], name


# --- AC3: rejections ------------------------------------------------------------


@pytest.mark.parametrize(
    "body",
    [
        {"type": "income", "description": "Salário", "amount_cents": 100,
         "split": {"person_id": ANA, "mode": "equal"}},
        expense(split=[{"person_id": ANA, "mode": "equal"}]),
        expense(split=[{"person_id": 1, "mode": "equal"}, {"person_id": 2, "mode": "equal"}]),
        expense(split={"person_id": [1, 2], "mode": "equal"}),
        expense(split={"person_id": ANA, "person_ids": [2], "mode": "equal"}),
        expense(split={"person_id": ANA, "person_id_2": 2, "mode": "equal"}),
        expense(split={"person_id": ANA, "mode": "equal", "friends": [{"person_id": 2}]}),
        expense(split={"person_id": ANA, "mode": "equal"}, friends=[2]),
        expense(split={"mode": "equal"}),
        expense(split={"person_id": "1", "mode": "equal"}),
        expense(split={"person_id": ANA, "mode": "group"}),
        expense(split={"person_id": ANA}),
    ],
    ids=[
        "income_with_split",
        "split_list_one",
        "split_list_two",
        "person_id_list",
        "person_ids_field",
        "second_person_field",
        "friends_inside_split",
        "friends_at_top_level",
        "person_missing",
        "person_string",
        "mode_unknown",
        "mode_missing",
    ],
)
def test_rejects_anything_but_one_friend(client, db, body):
    assert_rejected(client, db, body)


@pytest.mark.parametrize(
    "amount",
    [0, -1, 10**12 + 1, 10.5, 100.0, "1000", True, None],
    ids=["zero", "negative", "too_large", "decimal", "float_whole", "string", "bool", "null"],
)
def test_rejects_invalid_amount(client, db, amount):
    assert_rejected(client, db, expense(amount_cents=amount))


def test_accepts_amount_at_cents_limit(client):
    assert client.post("/transactions", json=expense(amount_cents=10**12)).status_code == 201


@pytest.mark.parametrize(
    "occurred_on",
    ["2026-02-30", "17/10/2026", "2026-10-17T00:00:00", "20261017", "", 1760659200],
    ids=["no_such_day", "br_format", "datetime", "compact", "empty", "timestamp"],
)
def test_rejects_invalid_date(client, db, occurred_on):
    assert_rejected(client, db, expense(occurred_on=occurred_on))


def test_null_date_means_today(client):
    response = client.post("/transactions", json=expense(occurred_on=None))

    assert response.status_code == 201
    assert response.json()["occurred_on"] == brasilia_today().isoformat()


def test_rejects_future_date(client, db):
    tomorrow = (brasilia_today() + timedelta(days=1)).isoformat()
    before = counts(db)

    response = client.post("/transactions", json=expense(occurred_on=tomorrow))

    assert response.status_code == 422
    assert response.json() == {
        "error": {"code": "future_date", "message": "A data da transação não pode ser no futuro."}
    }
    assert counts(db) == before


@pytest.mark.parametrize(
    "split",
    [
        {"person_id": ANA, "mode": "percentage"},
        {"person_id": ANA, "mode": "percentage", "percent": -1},
        {"person_id": ANA, "mode": "percentage", "percent": 101},
        {"person_id": ANA, "mode": "percentage", "percent": 33.3},
        {"person_id": ANA, "mode": "percentage", "percent": "50"},
        {"person_id": ANA, "mode": "equal", "percent": 50},
        {"person_id": ANA, "mode": "fixed", "share_cents": 100, "percent": 50},
        {"person_id": ANA, "mode": "percentage", "percent": 50, "share_cents": 100},
        {"person_id": ANA, "mode": "fixed"},
        {"person_id": ANA, "mode": "fixed", "share_cents": 0},
        {"person_id": ANA, "mode": "fixed", "share_cents": -1},
        {"person_id": ANA, "mode": "fixed", "share_cents": 10001},
        {"person_id": ANA, "mode": "fixed", "share_cents": 10.5},
        {"person_id": ANA, "mode": "equal", "share_cents": 100},
    ],
    ids=[
        "percent_missing",
        "percent_below_0",
        "percent_above_100",
        "percent_decimal",
        "percent_string",
        "percent_in_equal",
        "percent_in_fixed",
        "share_in_percentage",
        "share_missing",
        "share_zero",
        "share_negative",
        "share_above_amount",
        "share_decimal",
        "share_in_equal",
    ],
)
def test_rejects_invalid_mode_fields(client, db, split):
    assert_rejected(client, db, expense(split=split))


@pytest.mark.parametrize(
    "fields",
    [
        {"installment_number": 3},
        {"installment_total": 10},
        {"installment_number": 11, "installment_total": 10},
        {"installment_number": 0, "installment_total": 10},
        {"installment_number": 1, "installment_total": 361},
        {"installment_number": 1.0, "installment_total": 2},
    ],
    ids=["number_only", "total_only", "number_above_total", "number_zero", "total_too_large",
         "decimal"],
)
def test_rejects_invalid_installments(client, db, fields):
    assert_rejected(client, db, expense(**fields))


@pytest.mark.parametrize(
    "fields",
    [
        {"description": ""},
        {"description": "   "},
        {"description": "​‌‍⁠﻿"},
        {"description": " 　 \t"},
        {"description": "\u3164\u3164"},
        {"description": "\u2800\u2800"},
        {"description": "\u115f\u1160\uffa0 \u200b"},
        {"description": "d" * 121},
        {"description": None},
        {"description": 123},
        {"place": "p" * 121},
        {"notes": "n" * 501},
        {"type": "transfer"},
        {"type": None},
        {"payment_method": "boleto"},
        {"category_id": "1"},
        {"category_id": 0},
        {"created_at": "2020-01-01 00:00:00"},
        {"id": 999},
    ],
    ids=[
        "description_empty",
        "description_blank",
        "description_zero_width",
        "description_unicode_spaces",
        "description_hangul_filler",
        "description_braille_blank",
        "description_mixed_blank_letters",
        "description_too_long",
        "description_null",
        "description_number",
        "place_too_long",
        "notes_too_long",
        "type_unknown",
        "type_null",
        "payment_method_unknown",
        "category_string",
        "category_zero",
        "created_at_sent",
        "id_sent",
    ],
)
def test_rejects_invalid_fields(client, db, fields):
    assert_rejected(client, db, expense(**fields))


@pytest.mark.parametrize("missing", ["type", "description", "amount_cents"])
def test_rejects_missing_required_field(client, db, missing):
    body = expense()
    del body[missing]
    assert_rejected(client, db, body)


@pytest.mark.parametrize("description", ["d", "d" * 120, "  " + "d" * 120 + "  ", "🍕 Pizza"])
def test_accepts_description_length_limits(client, description):
    assert client.post("/transactions", json=expense(description=description)).status_code == 201


def test_rejects_unknown_friend(client, db):
    before = counts(db)

    response = client.post(
        "/transactions", json=expense(split={"person_id": 999, "mode": "equal"})
    )

    assert response.status_code == 422
    assert response.json() == {
        "error": {"code": "friend_not_found", "message": "Amigo não encontrado."}
    }
    assert counts(db) == before


def test_rejects_unknown_category(client, db):
    before = counts(db)

    response = client.post("/transactions", json=expense(category_id=999))

    assert response.status_code == 422
    assert response.json() == {
        "error": {"code": "category_not_found", "message": "Categoria não encontrada."}
    }
    assert counts(db) == before


def test_split_with_a_newly_added_friend(client):
    friend = client.post("/friends", json={"name": "Beatriz Nunes"}).json()

    response = client.post(
        "/transactions", json=expense(split={"person_id": friend["id"], "mode": "equal"})
    )

    assert response.status_code == 201
    assert response.json()["split"]["person_name"] == "Beatriz Nunes"


# --- AC4: list -------------------------------------------------------------------


def test_list_returns_every_seed_transaction_newest_first(client, db):
    response = client.get("/transactions")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == db.execute("SELECT count(*) FROM transactions").fetchone()[0]
    assert all(set(item) == SUMMARY_FIELDS for item in body)
    keys = [(item["occurred_on"], item["id"]) for item in body]
    assert keys == sorted(keys, reverse=True)


def test_list_own_share_and_friend_match_independent_rows(client, db):
    shares = {
        row["transaction_id"]: row
        for row in db.execute(
            "SELECT s.transaction_id, s.share_cents, s.status, p.name"
            " FROM split_share s JOIN person p ON p.id = s.person_id"
        )
    }
    categories = dict(db.execute("SELECT id, name FROM category").fetchall())
    expected = {}
    for row in db.execute("SELECT * FROM transactions"):
        share = shares.get(row["id"])
        expected[row["id"]] = {
            "id": row["id"],
            "type": row["type"],
            "description": row["description"],
            "amount_cents": row["amount_cents"],
            "own_share_cents": row["amount_cents"] - (share["share_cents"] if share else 0),
            "category_name": categories.get(row["category_id"]),
            "occurred_on": row["occurred_on"],
            "friend_name": share["name"] if share else None,
            "split_status": share["status"] if share else None,
        }

    body = client.get("/transactions").json()

    assert {item["id"]: item for item in body} == expected


def test_list_shows_seed_split_and_unsplit_examples(client):
    by_id = {item["id"]: item for item in client.get("/transactions").json()}

    assert by_id[2]["own_share_cents"] == 18790 - 9395
    assert (by_id[2]["friend_name"], by_id[2]["split_status"]) == ("Ana Lima", "em_aberto")
    assert by_id[3]["own_share_cents"] == 2350
    assert (by_id[3]["friend_name"], by_id[3]["split_status"]) == (None, None)
    assert by_id[1]["type"] == "income"
    assert by_id[1]["category_name"] is None


def test_new_transaction_appears_first(client):
    created = client.post(
        "/transactions",
        json=expense(amount_cents=10001, split={"person_id": ANA, "mode": "equal"}),
    ).json()

    first = client.get("/transactions").json()[0]

    assert first["id"] == created["id"]
    assert first["own_share_cents"] == 5001
    assert first["friend_name"] == "Ana Lima"
    assert first["split_status"] == "em_aberto"


def test_list_orders_by_date_before_id(client):
    old = client.post(
        "/transactions",
        json=expense(occurred_on=(brasilia_today() - timedelta(days=400)).isoformat()),
    ).json()

    body = client.get("/transactions").json()

    assert body[-1]["id"] == old["id"]


# --- AC5: detail -----------------------------------------------------------------


def test_detail_of_seed_fixed_split_that_was_paid(client, db):
    response = client.get("/transactions/7")

    assert response.status_code == 200
    body = response.json()
    assert set(body) == DETAIL_FIELDS
    assert body["description"] == "Aluguel"
    assert body["category_name"] == "Moradia"
    assert set(body["split"]) == SPLIT_FIELDS
    settled_on = db.execute(
        "SELECT settled_on FROM split_share WHERE transaction_id = 7"
    ).fetchone()[0]
    assert body["split"] == {
        "person_id": 4,
        "person_name": "Pedro Souza",
        "mode": "fixed",
        "percent": None,
        "friend_share_cents": 90000,
        "user_share_cents": 90000,
        "status": "pago",
        "settled_on": settled_on,
    }


def test_detail_of_seed_percentage_split(client):
    split = client.get("/transactions/4").json()["split"]

    assert split["mode"] == "percentage"
    assert split["percent"] == 40
    assert (split["friend_share_cents"], split["user_share_cents"]) == (13712, 34280 - 13712)


def test_detail_of_seed_installment(client):
    body = client.get("/transactions/9").json()

    assert (body["installment_number"], body["installment_total"]) == (3, 10)
    assert body["split"] is None


@pytest.mark.parametrize("tx_id", [999999, 2**63 - 1])
def test_detail_of_unknown_id_is_not_found(client, tx_id):
    response = client.get(f"/transactions/{tx_id}")

    assert response.status_code == 404
    assert response.json() == {
        "error": {"code": "not_found", "message": "Transação não encontrada."}
    }


@pytest.mark.parametrize("tx_id", ["abc", "0", "-1", "1.5", str(2**63)])
def test_detail_with_invalid_id_is_validation_error(client, tx_id):
    response = client.get(f"/transactions/{tx_id}")

    assert response.status_code == 422
    assert response.json() == VALIDATION_ERROR


# --- AC8: balance moves by the full amount ------------------------------------------


def test_split_expense_moves_balance_by_full_amount(client):
    before = client.get("/balance").json()

    client.post(
        "/transactions",
        json=expense(amount_cents=10001, split={"person_id": ANA, "mode": "equal"}),
    )

    after = client.get("/balance").json()
    assert after["expenses_cents"] == before["expenses_cents"] + 10001
    assert after["balance_cents"] == before["balance_cents"] - 10001
    # The new share is 'em_aberto', so nothing comes back yet.
    assert after["reimbursements_received_cents"] == before["reimbursements_received_cents"]


def test_income_moves_balance_up(client):
    before = client.get("/balance").json()["balance_cents"]

    client.post("/transactions", json={"type": "income", "description": "Freela",
                                       "amount_cents": 7000})

    assert client.get("/balance").json()["balance_cents"] == before + 7000


def test_back_dated_expense_keeps_history_consistent(client):
    # Business Rule 3: the newest adjustment still equals the current balance
    # after a past-dated expense, because dates are never in the future.
    client.post(
        "/transactions",
        json=expense(occurred_on=(brasilia_today() - timedelta(days=1)).isoformat()),
    )
    balance = client.get("/balance").json()["balance_cents"]
    client.post(
        "/balance/adjustments",
        json={"new_balance_cents": balance + 100, "reason": "Conferência com o extrato"},
    )

    history = client.get("/balance/adjustments").json()

    assert history[0]["new_balance_cents"] == client.get("/balance").json()["balance_cents"]


# --- Swagger -------------------------------------------------------------------------


def test_openapi_documents_transaction_endpoints(client):
    paths = client.get("/openapi.json").json()["paths"]

    assert set(paths["/transactions"]) == {"get", "post"}
    assert set(paths["/transactions/{transaction_id}"]) == {"get"}
    post = paths["/transactions"]["post"]
    assert post["requestBody"]["content"]["application/json"]["schema"]["$ref"].endswith(
        "/TransactionCreate"
    )
    assert post["responses"]["201"]["content"]["application/json"]["schema"]["$ref"].endswith(
        "/TransactionDetail"
    )
    for code in ("validation_error", "future_date", "friend_not_found", "category_not_found"):
        assert code in post["responses"]["422"]["description"]
    detail = paths["/transactions/{transaction_id}"]["get"]["responses"]
    assert "not_found" in detail["404"]["description"]
    listing = paths["/transactions"]["get"]["responses"]["200"]
    assert listing["content"]["application/json"]["schema"]["items"]["$ref"].endswith(
        "/TransactionSummary"
    )


def test_openapi_split_create_forbids_extra_fields(client):
    schemas = client.get("/openapi.json").json()["components"]["schemas"]

    assert schemas["SplitCreate"]["additionalProperties"] is False
    assert schemas["TransactionCreate"]["additionalProperties"] is False


# --- Concurrency (shared public demo, Business Rule 17) -----------------------------


def parallel_requests(database_path, requests):
    """Send every (method, path, body) at the same moment, one thread each, to a
    real database file. Returns the status codes in request order.

    raise_server_exceptions=False turns a server error into the 500 a visitor
    would get, instead of an exception inside the worker thread.
    """
    barrier = threading.Barrier(len(requests))

    with TestClient(create_app(database_path), raise_server_exceptions=False) as client:

        def send(request):
            method, path, body = request
            barrier.wait()
            return client.request(method, path, json=body).status_code

        with ThreadPoolExecutor(max_workers=len(requests)) as pool:
            return list(pool.map(send, requests))


def test_parallel_split_expenses_with_category_all_succeed(database_path):
    # A split or a category means a read before the INSERT; with a deferred
    # BEGIN, SQLite refused the lock upgrade at once ("database is locked").
    requests = [
        (
            "POST",
            "/transactions",
            expense(
                description=f"Conta paralela {i}",
                amount_cents=1001 + i,
                category_id=1,
                split={"person_id": 1 + i % 8, "mode": "equal"},
            ),
        )
        for i in range(20)
    ]

    for _ in range(3):
        assert parallel_requests(database_path, requests) == [201] * len(requests)


def test_parallel_mixed_writes_all_succeed(database_path):
    requests = []
    for i in range(24):
        kind = i % 4
        if kind == 0:
            body = expense(
                description=f"Mercado paralelo {i}",
                category_id=1,
                split={"person_id": 2, "mode": "percentage", "percent": 40},
            )
            requests.append(("POST", "/transactions", body))
        elif kind == 1:
            body = {"new_balance_cents": 100000 + i, "reason": "Ajuste em paralelo"}
            requests.append(("POST", "/balance/adjustments", body))
        elif kind == 2:
            requests.append(("POST", "/friends", {"name": f"Pessoa paralela {i}"}))
        else:
            requests.append(("PATCH", "/profile", {"initial_balance_cents": 250000 + i}))

    statuses = parallel_requests(database_path, requests)

    assert 500 not in statuses
    for (_, path, _), status in zip(requests, statuses, strict=True):
        if path == "/balance/adjustments":
            # Two targets may meet the same balance (no_change) only by chance;
            # every other write must be created.
            assert status in (201, 422)
        elif path == "/profile":
            assert status == 200
        else:
            assert status == 201
