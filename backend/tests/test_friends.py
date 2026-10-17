import pytest

from app.services.friends import normalize_text

SEED_FRIENDS = [
    "Ana Lima",
    "Carlos Mendes",
    "Fernanda Costa",
    "Juliana Ramos",
    "Lucas Oliveira",
    "Mariana Duarte",
    "Pedro Souza",
    "Thiago Ferreira",
]
VALIDATION_ERROR = {
    "error": {"code": "validation_error", "message": "Dados inválidos na requisição."}
}


def friend_count(db) -> int:
    return db.execute("SELECT count(*) FROM person").fetchone()[0]


# --- normalize_text -----------------------------------------------------------


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Ana", "ana"),
        ("ÂNA", "ana"),
        ("João Conceição", "joao conceicao"),
        ("Ação", "acao"),
        ("Straße", "strasse"),  # casefold, not lower
        ("Zoë", "zoe"),
    ],
)
def test_normalize_text_ignores_case_and_accents(text, expected):
    assert normalize_text(text) == expected


# --- GET /friends -------------------------------------------------------------


def test_list_friends_returns_seed_sorted_by_name(client):
    response = client.get("/friends")

    assert response.status_code == 200
    body = response.json()
    assert [friend["name"] for friend in body] == SEED_FRIENDS
    assert all(set(friend) == {"id", "name"} for friend in body)


def test_list_friends_sorts_ignoring_case_and_accents(client):
    client.post("/friends", json={"name": "Álvaro"})
    client.post("/friends", json={"name": "bruno"})

    names = [friend["name"] for friend in client.get("/friends").json()]

    assert names[:4] == ["Álvaro", "Ana Lima", "bruno", "Carlos Mendes"]


# --- POST /friends ------------------------------------------------------------


def test_create_friend_returns_it_and_lists_it(client, db):
    response = client.post("/friends", json={"name": "Beatriz Nunes"})

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Beatriz Nunes"
    assert isinstance(body["id"], int)
    assert body in client.get("/friends").json()
    stored = db.execute("SELECT name FROM person WHERE id = ?", (body["id"],)).fetchone()[0]
    assert stored == "Beatriz Nunes"


def test_create_friend_trims_name(client):
    response = client.post("/friends", json={"name": "  ​Beatriz Nunes  "})

    assert response.status_code == 201
    assert response.json()["name"] == "Beatriz Nunes"


@pytest.mark.parametrize("name", ["B", "b" * 60, "  " + "c" * 60 + "  ", "Zoë 🎉"])
def test_create_friend_accepts_length_limits(client, name):
    assert client.post("/friends", json={"name": name}).status_code == 201


@pytest.mark.parametrize(
    "name",
    ["Ana Lima", "ana lima", "ANA LIMA", "Âna Lima", "Ana Lìma", "  ana lima  ", "​Ana Lima"],
)
def test_create_friend_rejects_duplicate_ignoring_case_and_accents(client, db, name):
    before = friend_count(db)

    response = client.post("/friends", json={"name": name})

    assert response.status_code == 409
    assert response.json() == {
        "error": {"code": "friend_exists", "message": "Já existe um amigo com esse nome."}
    }
    assert friend_count(db) == before


def test_create_friend_keeps_what_the_user_typed(client):
    client.post("/friends", json={"name": "joão"})

    response = client.post("/friends", json={"name": "JOAO"})

    assert response.status_code == 409
    assert "joão" in [friend["name"] for friend in client.get("/friends").json()]


@pytest.mark.parametrize(
    "body",
    [
        {"name": ""},
        {"name": "   "},
        {"name": "​‌‍﻿"},
        {"name": " 　\t\n"},
        {"name": "b" * 61},
        {"name": None},
        {"name": 123},
        {"name": ["Ana"]},
        {},
    ],
    ids=[
        "empty",
        "blank",
        "zero_width_only",
        "unicode_spaces_only",
        "too_long",
        "null",
        "number",
        "list",
        "missing",
    ],
)
def test_create_friend_rejects_invalid_name(client, db, body):
    before = friend_count(db)

    response = client.post("/friends", json=body)

    assert response.status_code == 422
    assert response.json() == VALIDATION_ERROR
    assert friend_count(db) == before


# --- Swagger ------------------------------------------------------------------


def test_openapi_documents_friends_endpoints(client):
    paths = client.get("/openapi.json").json()["paths"]

    assert set(paths["/friends"]) == {"get", "post"}
    post = paths["/friends"]["post"]
    assert post["requestBody"]["content"]["application/json"]["schema"]["$ref"].endswith(
        "/FriendCreate"
    )
    assert post["responses"]["201"]["content"]["application/json"]["schema"]["$ref"].endswith(
        "/Friend"
    )
    assert "friend_exists" in post["responses"]["409"]["description"]
    assert "validation_error" in post["responses"]["422"]["description"]
