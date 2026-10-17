from datetime import timedelta

from app.services import brasilia_today

ANA = 1  # seed person 'Ana Lima'


def independent_spent(db, month: str) -> int:
    """The user's own share of the month's expenses, summed in Python from raw
    rows, independent of the service SQL."""
    shares = dict(db.execute("SELECT transaction_id, share_cents FROM split_share").fetchall())
    spent = 0
    for row in db.execute("SELECT id, type, amount_cents, occurred_on FROM transactions"):
        if row["type"] == "expense" and row["occurred_on"][:7] == month:
            spent += row["amount_cents"] - shares.get(row["id"], 0)
    return spent


def budget(client) -> dict:
    response = client.get("/budget")
    assert response.status_code == 200
    return response.json()


def test_budget_matches_independent_own_share_sum_over_seed(client, db):
    month = brasilia_today().strftime("%Y-%m")
    spent = independent_spent(db, month)

    body = budget(client)

    assert body == {
        "month": month,
        "budget_cents": 300000,
        "spent_cents": spent,
        "remaining_cents": 300000 - spent,
        "used_percent": spent * 100 // 300000,
    }
    assert spent > 0  # the seed always has expenses in the current month


def test_budget_month_is_the_sql_brasilia_month(client, db):
    sql_month = db.execute("SELECT strftime('%Y-%m', 'now', '-3 hours')").fetchone()[0]

    assert budget(client)["month"] == sql_month


def test_split_expense_moves_budget_by_user_share_and_balance_by_full_amount(client):
    before_budget = budget(client)
    before_balance = client.get("/balance").json()["balance_cents"]

    response = client.post(
        "/transactions",
        json={"type": "expense", "description": "Janta com a Ana", "amount_cents": 10001,
              "split": {"person_id": ANA, "mode": "equal"}},
    )
    assert response.status_code == 201

    after_budget = budget(client)
    assert after_budget["spent_cents"] == before_budget["spent_cents"] + 5001
    assert after_budget["remaining_cents"] == before_budget["remaining_cents"] - 5001
    assert client.get("/balance").json()["balance_cents"] == before_balance - 10001


def test_fixed_split_counts_only_what_the_user_keeps(client):
    before = budget(client)["spent_cents"]

    client.post(
        "/transactions",
        json={"type": "expense", "description": "Aluguel", "amount_cents": 180000,
              "split": {"person_id": 4, "mode": "fixed", "share_cents": 180000}},
    )

    assert budget(client)["spent_cents"] == before  # the friend pays all of it


def test_unsplit_expense_moves_budget_by_full_amount(client):
    before = budget(client)["spent_cents"]

    client.post("/transactions", json={"type": "expense", "description": "Farmácia",
                                       "amount_cents": 4590})

    assert budget(client)["spent_cents"] == before + 4590


def test_income_does_not_move_budget(client):
    before = budget(client)

    client.post("/transactions", json={"type": "income", "description": "Freela",
                                       "amount_cents": 100000})

    assert budget(client) == before


def test_expense_from_an_earlier_month_does_not_move_budget(client):
    before = budget(client)
    last_month = brasilia_today().replace(day=1) - timedelta(days=1)

    client.post(
        "/transactions",
        json={"type": "expense", "description": "Mercado", "amount_cents": 5000,
              "occurred_on": last_month.isoformat()},
    )

    assert budget(client) == before


def test_remaining_may_be_negative_and_percent_pass_100(client):
    client.post("/transactions", json={"type": "expense", "description": "Notebook novo",
                                       "amount_cents": 1_000_000})

    body = budget(client)

    assert body["remaining_cents"] < 0
    assert body["remaining_cents"] == body["budget_cents"] - body["spent_cents"]
    assert body["used_percent"] == body["spent_cents"] * 100 // body["budget_cents"]
    assert body["used_percent"] > 100


def test_used_percent_rounds_down(client, db):
    spent = budget(client)["spent_cents"]
    db.execute("UPDATE user_profile SET monthly_budget_cents = ?", (spent * 3,))
    db.commit()

    assert budget(client)["used_percent"] == 33  # 33.33...%


def test_zero_budget_does_not_divide_by_zero(client, db):
    db.execute("UPDATE user_profile SET monthly_budget_cents = 0")
    db.commit()

    body = budget(client)

    assert body["budget_cents"] == 0
    assert body["remaining_cents"] == -body["spent_cents"]
    assert body["used_percent"] == 100


def test_openapi_documents_budget(client):
    paths = client.get("/openapi.json").json()["paths"]

    assert set(paths["/budget"]) == {"get"}
    schema = paths["/budget"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]
    assert schema["$ref"].endswith("/Budget")
    # The balance routes keep their paths after the router lost its prefix.
    assert set(paths["/balance"]) == {"get"}
    assert set(paths["/balance/adjustments"]) == {"get", "post"}
