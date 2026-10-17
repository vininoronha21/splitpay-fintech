import pytest

from app.text import normalize_text

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


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("A\u200bna Lima", "ana lima"),  # zero-width space inside a word
        ("Ana\u200d Lima\u2060", "ana lima"),  # zero-width joiner, word joiner
        ("\ufeffAna\u00adLima", "analima"),  # BOM, soft hyphen
        ("Ana  Lima", "ana lima"),  # double space
        ("Ana \t\u00a0\u3000 Lima", "ana lima"),  # mixed whitespace run
        ("Ana \u200b Lima", "ana lima"),  # format character between two spaces
        ("  Ana Lima  ", "ana lima"),
    ],
)
def test_normalize_text_ignores_invisible_characters_and_extra_spaces(text, expected):
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
    [
        "Ana Lima",
        "ana lima",
        "ANA LIMA",
        "Âna Lima",
        "Ana Lìma",
        "  ana lima  ",
        "\u200bAna Lima",
        "A\u200bna Lima",
        "Ana\u200d Lima",
        "Ana  Lima",
        "ana \u00a0 lima",
        "A\u200bna  Li\u2060ma",
    ],
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
        {"name": "\u3164\u3164"},
        {"name": "\u2800 \u115f\u1160\uffa0"},
        {"name": "b" * 61},
        {"name": "Zé", "id": 1},
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
        "hangul_filler_only",
        "braille_blank_and_fillers_only",
        "too_long",
        "extra_field",
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


def test_create_friend_trims_blank_letter_characters(client):
    response = client.post("/friends", json={"name": "\u3164Beatriz Nunes\u2800"})

    assert response.status_code == 201
    assert response.json()["name"] == "Beatriz Nunes"


def test_openapi_friend_create_forbids_extra_fields(client):
    schemas = client.get("/openapi.json").json()["components"]["schemas"]

    assert schemas["FriendCreate"]["additionalProperties"] is False


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
