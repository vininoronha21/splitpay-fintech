import pytest


def adjustment_count(db) -> int:
    return db.execute("SELECT count(*) FROM balance_adjustment").fetchone()[0]


def test_get_profile_returns_seeded_profile(client):
    response = client.get("/profile")

    assert response.status_code == 200
    assert response.json() == {
        "display_name": "Usuário",
        "initial_balance_cents": 250000,
        "monthly_budget_cents": 300000,
    }


@pytest.mark.parametrize("value", [0, 1, 123456])
def test_patch_profile_accepts_non_negative_integer(client, value):
    response = client.patch("/profile", json={"initial_balance_cents": value})

    assert response.status_code == 200
    assert response.json()["initial_balance_cents"] == value
    assert client.get("/profile").json()["initial_balance_cents"] == value


@pytest.mark.parametrize(
    "body",
    [
        {"initial_balance_cents": -1},
        {"initial_balance_cents": 10.5},
        {"initial_balance_cents": 10.0},
        {"initial_balance_cents": "1000"},
        {"initial_balance_cents": True},
        {"initial_balance_cents": None},
        {"initial_balance_cents": 10**12 + 1},
        {},
    ],
    ids=["negative", "decimal", "float_whole", "string", "bool", "null", "too_large", "missing"],
)
def test_patch_profile_rejects_invalid_value(client, body):
    response = client.patch("/profile", json=body)

    assert response.status_code == 422
    assert response.json() == {
        "error": {"code": "validation_error", "message": "Dados inválidos na requisição."}
    }
    assert client.get("/profile").json()["initial_balance_cents"] == 250000


def test_patch_profile_keeps_display_name_and_budget(client):
    response = client.patch(
        "/profile", json={"initial_balance_cents": 1000, "display_name": "Outro"}
    )

    assert response.status_code == 200
    assert response.json() == {
        "display_name": "Usuário",
        "initial_balance_cents": 1000,
        "monthly_budget_cents": 300000,
    }


def test_patch_profile_moves_balance_by_same_amount_without_adjustment(client, db):
    before = client.get("/balance").json()["balance_cents"]
    adjustments_before = adjustment_count(db)

    client.patch("/profile", json={"initial_balance_cents": 250000 + 7777})

    after = client.get("/balance").json()
    assert after["balance_cents"] == before + 7777
    assert after["initial_balance_cents"] == 257777
    assert adjustment_count(db) == adjustments_before
    assert len(client.get("/balance/adjustments").json()) == adjustments_before
