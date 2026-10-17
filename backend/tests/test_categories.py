import pytest

from app.services.categories import pick_rule
from app.text import words

SEED_CATEGORIES = [
    {"id": 1, "name": "Alimentação"},
    {"id": 2, "name": "Transporte"},
    {"id": 3, "name": "Lazer"},
    {"id": 4, "name": "Compras"},
    {"id": 5, "name": "Moradia"},
    {"id": 6, "name": "Saúde"},
    {"id": 7, "name": "Educação"},
    {"id": 8, "name": "Outros"},
]
NO_SUGGESTION = {"category_id": None, "category_name": None, "keyword": None}
VALIDATION_ERROR = {
    "error": {"code": "validation_error", "message": "Dados inválidos na requisição."}
}


def rule(id_: int, keyword: str, is_default: bool = True) -> dict:
    return {"id": id_, "keyword": keyword, "category_id": 1, "is_default": int(is_default)}


def suggest(client, description: str):
    return client.get("/categories/suggest", params={"description": description})


# --- pick_rule (pure) -----------------------------------------------------------


def test_pick_rule_returns_none_without_a_match():
    assert pick_rule(["cinema", "hoje"], [rule(1, "janta")]) is None


def test_pick_rule_returns_none_without_rules():
    assert pick_rule(["janta"], []) is None


def test_pick_rule_user_rule_beats_default_even_if_shorter():
    rules = [rule(1, "restaurante"), rule(2, "jantar", is_default=False)]

    assert pick_rule(["jantar", "no", "restaurante"], rules)["id"] == 2


def test_pick_rule_longest_keyword_wins_among_defaults():
    rules = [rule(1, "uber"), rule(2, "uber eats")]

    assert pick_rule(["uber", "eats", "lanche"], rules)["id"] == 2


def test_pick_rule_longest_keyword_wins_among_user_rules():
    rules = [rule(1, "uber", is_default=False), rule(2, "uber eats", is_default=False)]

    assert pick_rule(["uber", "eats"], rules)["id"] == 2


def test_pick_rule_length_counts_characters_not_words():
    rules = [rule(1, "a b"), rule(2, "restaurante")]

    assert pick_rule(["a", "b", "restaurante"], rules)["id"] == 2


def test_pick_rule_equal_length_lowest_id_wins():
    rules = [rule(7, "show"), rule(3, "luz"), rule(5, "bar")]

    assert pick_rule(["show", "bar"], rules)["id"] == 7
    assert pick_rule(["luz", "bar"], rules)["id"] == 3
    assert pick_rule(["bar", "luz"], list(reversed(rules)))["id"] == 3


@pytest.mark.parametrize(
    ("description", "matches"),
    [
        ("Bar do Zé", True),
        ("Barbearia", False),
        ("Sambar", False),
        ("Happy hour no bar", True),
        ("bar-restaurante", True),
    ],
)
def test_pick_rule_matches_whole_words_only(description, matches):
    assert (pick_rule(words(description), [rule(1, "bar")]) is not None) is matches


@pytest.mark.parametrize(
    ("description", "matches"),
    [
        ("Uber Eats lanche", True),
        ("Pedido no uber-eats", True),
        ("Eats uber", False),
        ("Uber para o Eats", False),
        ("Uber Eatsy", False),
    ],
)
def test_pick_rule_multi_word_keyword_needs_consecutive_words(description, matches):
    assert (pick_rule(words(description), [rule(1, "uber eats")]) is not None) is matches


# --- GET /categories ------------------------------------------------------------


def test_list_categories_in_id_order(client):
    response = client.get("/categories")

    assert response.status_code == 200
    assert response.json() == SEED_CATEGORIES


# --- GET /categories/suggest ----------------------------------------------------


@pytest.mark.parametrize(
    ("description", "category_id", "category_name", "keyword"),
    [
        ("Janta com a galera", 1, "Alimentação", "janta"),
        ("Combustível", 2, "Transporte", "combustivel"),
        ("Uber para o trabalho", 2, "Transporte", "uber"),
        ("Bar do Zé", 3, "Lazer", "bar"),
        ("Farmácia", 6, "Saúde", "farmacia"),
    ],
)
def test_suggest_us02_examples(client, description, category_id, category_name, keyword):
    response = suggest(client, description)

    assert response.status_code == 200
    assert response.json() == {
        "category_id": category_id,
        "category_name": category_name,
        "keyword": keyword,
    }


@pytest.mark.parametrize("description", ["janta", "JANTA", "Jãnta", "  jAnTa!  "])
def test_suggest_ignores_case_and_accents(client, description):
    assert suggest(client, description).json() == {
        "category_id": 1,
        "category_name": "Alimentação",
        "keyword": "janta",
    }


@pytest.mark.parametrize("description", ["Barbearia", "xyz", "Corte de cabelo"])
def test_suggest_without_match_returns_all_null(client, description):
    response = suggest(client, description)

    assert response.status_code == 200
    assert response.json() == NO_SUGGESTION


def test_suggest_symbols_only_returns_all_null(client):
    response = suggest(client, "!!! ???")

    assert response.status_code == 200
    assert response.json() == NO_SUGGESTION


def test_suggest_accepts_120_characters(client):
    response = suggest(client, "janta " + "x" * 114)

    assert response.status_code == 200
    assert response.json()["keyword"] == "janta"


@pytest.mark.parametrize("description", ["", "   ", "​ㅤ", "x" * 121])
def test_suggest_rejects_blank_or_long_description(client, description):
    response = suggest(client, description)

    assert response.status_code == 422
    assert response.json() == VALIDATION_ERROR


def test_suggest_rejects_missing_description(client):
    response = client.get("/categories/suggest")

    assert response.status_code == 422
    assert response.json() == VALIDATION_ERROR


def test_suggest_counts_length_after_trimming(client):
    response = suggest(client, "  " + "janta " + "x" * 114 + "  ")

    assert response.status_code == 200


def test_suggest_is_read_only(client, db):
    before = db.execute("SELECT count(*) FROM category_rule").fetchone()[0]

    suggest(client, "Janta")

    assert db.execute("SELECT count(*) FROM category_rule").fetchone()[0] == before


# --- Seed -----------------------------------------------------------------------


def test_every_seeded_keyword_is_already_normalized(db):
    keywords = [row[0] for row in db.execute("SELECT keyword FROM category_rule")]

    assert len(keywords) == 31
    for keyword in keywords:
        assert keyword == " ".join(words(keyword)), keyword


# --- Swagger --------------------------------------------------------------------


def test_openapi_documents_categories_endpoints(client):
    paths = client.get("/openapi.json").json()["paths"]

    assert set(paths["/categories"]) == {"get"}
    suggest_op = paths["/categories/suggest"]["get"]
    assert suggest_op["responses"]["200"]["content"]["application/json"]["schema"][
        "$ref"
    ].endswith("/CategorySuggestion")
    error = suggest_op["responses"]["422"]
    assert "validation_error" in error["description"]
    assert error["content"]["application/json"]["schema"]["$ref"].endswith("/ErrorResponse")
    (param,) = suggest_op["parameters"]
    assert param["name"] == "description"
    assert param["in"] == "query"
    assert param["required"] is True
