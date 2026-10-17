import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from tests.conftest import parallel_requests, send_in_parallel

VALIDATION_ERROR = {
    "error": {"code": "validation_error", "message": "Dados inválidos na requisição."}
}
KEYWORD_ERROR = {
    "error": {
        "code": "validation_error",
        "message": "A palavra-chave precisa ter letras ou números e no máximo 40 caracteres.",
    }
}


def create(client, keyword, category_id=1):
    return client.post("/categories/rules", json={"keyword": keyword, "category_id": category_id})


def rule_count(db) -> int:
    return db.execute("SELECT count(*) FROM category_rule").fetchone()[0]


def suggest(client, description):
    return client.get("/categories/suggest", params={"description": description}).json()


def default_id(db, keyword) -> int:
    return db.execute("SELECT id FROM category_rule WHERE keyword = ?", (keyword,)).fetchone()[0]


# --- GET /categories/rules ------------------------------------------------------


def test_list_rules_seeded_defaults_sorted_by_keyword(client):
    rules = client.get("/categories/rules").json()

    assert len(rules) == 31
    assert [rule["keyword"] for rule in rules] == sorted(rule["keyword"] for rule in rules)
    assert all(rule["is_default"] is True for rule in rules)
    janta = next(rule for rule in rules if rule["keyword"] == "janta")
    assert set(janta) == {"id", "keyword", "category_id", "category_name", "is_default"}
    assert janta["category_id"] == 1
    assert janta["category_name"] == "Alimentação"


def test_list_rules_user_rules_first_newest_first(client):
    first = create(client, "pizza").json()
    second = create(client, "uber eats").json()

    rules = client.get("/categories/rules").json()

    assert [rule["id"] for rule in rules[:2]] == [second["id"], first["id"]]
    assert all(rule["is_default"] is False for rule in rules[:2])
    assert all(rule["is_default"] is True for rule in rules[2:])
    assert rules[2]["keyword"] == "academia"


# --- POST /categories/rules -----------------------------------------------------


def test_create_rule_returns_201_and_the_rule(client):
    response = create(client, "Pizza", 1)

    assert response.status_code == 201
    body = response.json()
    assert body == {
        "id": body["id"],
        "keyword": "pizza",
        "category_id": 1,
        "category_name": "Alimentação",
        "is_default": False,
    }
    assert body in client.get("/categories/rules").json()


@pytest.mark.parametrize(
    ("keyword", "stored"),
    [
        ("  Uber-Eats ", "uber eats"),
        ("PÃO de   Açúcar", "pao de acucar"),
        ("uber_eats!!", "uber eats"),
        ("​SushiㅤBar", "sushi bar"),
    ],
)
def test_create_rule_stores_keyword_normalized(client, db, keyword, stored):
    response = create(client, keyword)

    assert response.status_code == 201
    assert response.json()["keyword"] == stored
    row = db.execute(
        "SELECT keyword, is_default FROM category_rule WHERE id = ?", (response.json()["id"],)
    ).fetchone()
    assert tuple(row) == (stored, 0)


def test_create_rule_accepts_40_characters_after_normalizing(client):
    response = create(client, "a" * 40)

    assert response.status_code == 201


@pytest.mark.parametrize("keyword", ["!!!", "-- ?", "🍕", "a" * 41, "ab-" * 14])
def test_create_rule_rejects_keyword_empty_or_long_after_normalizing(client, db, keyword):
    before = rule_count(db)

    response = create(client, keyword)

    assert response.status_code == 422
    assert response.json() == KEYWORD_ERROR
    assert rule_count(db) == before


@pytest.mark.parametrize(
    "body",
    [
        {"keyword": "", "category_id": 1},
        {"keyword": "   ", "category_id": 1},
        {"keyword": "x" * 81, "category_id": 1},
        {"keyword": 123, "category_id": 1},
        {"category_id": 1},
        {"keyword": "pizza"},
        {"keyword": "pizza", "category_id": "1"},
        {"keyword": "pizza", "category_id": 0},
        {"keyword": "pizza", "category_id": 2**63},
        {"keyword": "pizza", "category_id": 1, "is_default": True},
    ],
)
def test_create_rule_rejects_invalid_body(client, db, body):
    before = rule_count(db)

    response = client.post("/categories/rules", json=body)

    assert response.status_code == 422
    assert response.json() == VALIDATION_ERROR
    assert rule_count(db) == before


def test_create_rule_unknown_category_is_422(client, db):
    before = rule_count(db)

    response = create(client, "pizza", 999)

    assert response.status_code == 422
    assert response.json() == {
        "error": {"code": "category_not_found", "message": "Categoria não encontrada."}
    }
    assert rule_count(db) == before


@pytest.mark.parametrize("keyword", ["Ubér", "UBER", " uber! ", "jãnta"])
def test_create_rule_duplicate_of_default_is_409(client, db, keyword):
    before = rule_count(db)

    response = create(client, keyword, 3)

    assert response.status_code == 409
    assert response.json() == {
        "error": {"code": "rule_exists", "message": "Já existe uma regra com essa palavra-chave."}
    }
    assert rule_count(db) == before


def test_create_rule_duplicate_of_user_rule_is_409(client):
    create(client, "Uber Eats")

    response = create(client, "uber-eats", 2)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "rule_exists"


# --- Suggestion with user rules -------------------------------------------------


def test_user_rule_wins_over_default_and_delete_restores_it(client):
    assert suggest(client, "Uber Eats lanche")["category_name"] == "Transporte"

    created = create(client, "uber eats", 1).json()

    assert suggest(client, "Uber Eats lanche") == {
        "category_id": 1,
        "category_name": "Alimentação",
        "keyword": "uber eats",
    }
    assert suggest(client, "Uber para o trabalho")["category_name"] == "Transporte"

    assert client.delete(f"/categories/rules/{created['id']}").status_code == 204

    assert suggest(client, "Uber Eats lanche") == {
        "category_id": 2,
        "category_name": "Transporte",
        "keyword": "uber",
    }


def test_shorter_user_rule_beats_longer_default(client):
    create(client, "amigos", 3)

    assert suggest(client, "Restaurante com amigos") == {
        "category_id": 3,
        "category_name": "Lazer",
        "keyword": "amigos",
    }


# --- DELETE /categories/rules/{id} ----------------------------------------------


def test_delete_user_rule_returns_204_and_removes_it(client, db):
    created = create(client, "pizza").json()
    before = rule_count(db)

    response = client.delete(f"/categories/rules/{created['id']}")

    assert response.status_code == 204
    assert response.content == b""
    assert rule_count(db) == before - 1
    assert created["id"] not in [rule["id"] for rule in client.get("/categories/rules").json()]


def test_delete_default_rule_is_409_and_keeps_it(client, db):
    janta = default_id(db, "janta")
    before = rule_count(db)

    response = client.delete(f"/categories/rules/{janta}")

    assert response.status_code == 409
    assert response.json() == {
        "error": {"code": "rule_is_default", "message": "Regras padrão não podem ser excluídas."}
    }
    assert rule_count(db) == before
    assert suggest(client, "Janta")["keyword"] == "janta"


def test_delete_unknown_rule_is_404(client):
    response = client.delete("/categories/rules/999999")

    assert response.status_code == 404
    assert response.json() == {
        "error": {"code": "not_found", "message": "Regra não encontrada."}
    }


def test_delete_twice_is_404(client):
    created = create(client, "pizza").json()
    client.delete(f"/categories/rules/{created['id']}")

    assert client.delete(f"/categories/rules/{created['id']}").status_code == 404


@pytest.mark.parametrize("rule_id", ["0", "-1", "abc", str(2**63)])
def test_delete_invalid_id_is_422(client, rule_id):
    response = client.delete(f"/categories/rules/{rule_id}")

    assert response.status_code == 422
    assert response.json() == VALIDATION_ERROR


def test_deleted_keyword_can_be_created_again(client):
    created = create(client, "pizza").json()
    client.delete(f"/categories/rules/{created['id']}")

    assert create(client, "Pizza").status_code == 201


# --- Concurrency (shared public demo) ------------------------------------------
# With a deferred BEGIN, the duplicate check reads before the INSERT, and SQLite
# refuses the lock upgrade at once ("database is locked" -> 500).


def test_parallel_creates_same_keyword_one_wins(database_path):
    for keyword in ("pizza", "sorveteria", "uber eats"):
        requests = [("POST", "/categories/rules", {"keyword": keyword, "category_id": 1})] * 20

        statuses = parallel_requests(database_path, requests)

        assert not [status for status in statuses if status >= 500], statuses
        assert statuses.count(201) == 1, statuses
        assert statuses.count(409) == len(requests) - 1, statuses


def test_parallel_deletes_same_rule_one_wins(database_path):
    with TestClient(create_app(database_path), raise_server_exceptions=False) as client:
        rule = client.post("/categories/rules", json={"keyword": "pizza", "category_id": 1})
        assert rule.status_code == 201
        requests = [("DELETE", f"/categories/rules/{rule.json()['id']}", None)] * 20

        statuses = send_in_parallel(client, requests)

    assert not [status for status in statuses if status >= 500], statuses
    assert statuses.count(204) == 1, statuses
    assert statuses.count(404) == len(requests) - 1, statuses


# --- Swagger --------------------------------------------------------------------


def test_openapi_documents_rule_endpoints(client):
    spec = client.get("/openapi.json").json()
    paths = spec["paths"]

    assert set(paths["/categories/rules"]) == {"get", "post"}
    assert set(paths["/categories/rules/{rule_id}"]) == {"delete"}
    assert spec["components"]["schemas"]["CategoryRuleCreate"]["additionalProperties"] is False

    post = paths["/categories/rules"]["post"]["responses"]
    assert "rule_exists" in post["409"]["description"]
    assert "validation_error" in post["422"]["description"]
    assert "category_not_found" in post["422"]["description"]
    delete = paths["/categories/rules/{rule_id}"]["delete"]["responses"]
    assert "not_found" in delete["404"]["description"]
    assert "rule_is_default" in delete["409"]["description"]
    for responses in (post, delete):
        for status, response in responses.items():
            if status.startswith("4"):
                schema = response["content"]["application/json"]["schema"]
                assert schema["$ref"].endswith("/ErrorResponse")
