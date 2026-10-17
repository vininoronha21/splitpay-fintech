import pytest

from app.text import INVISIBLE_CHARACTERS, normalize_text, trim_invisible, words

# --- normalize_text -----------------------------------------------------------


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("ÂNA", "ana"),
        ("Pão de Açúcar", "pao de acucar"),
        ("Straße", "strasse"),  # casefold, not lower
        ("A​na ‍Lima⁠", "ana lima"),  # zero-width characters are dropped
        ("  Ana \t  Lima  ", "ana lima"),  # whitespace runs collapse
    ],
)
def test_normalize_text_accents_case_and_zero_width(text, expected):
    assert normalize_text(text) == expected


@pytest.mark.parametrize("blank", sorted(INVISIBLE_CHARACTERS))
def test_normalize_text_treats_blank_letters_as_spaces(blank):
    # Hangul fillers and the empty Braille cell look like a space, so they
    # separate words instead of gluing them or surviving as letters.
    assert normalize_text(f"Ana{blank}Lima") == "ana lima"
    assert normalize_text(f"{blank}Ana {blank}{blank} Lima{blank}") == "ana lima"


def test_trim_invisible_still_trims_blank_letters():
    assert trim_invisible("ㅤ Ana Lima ⠀") == "Ana Lima"
    assert trim_invisible(5) == 5


# --- words --------------------------------------------------------------------


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Jantar no Outback", ["jantar", "no", "outback"]),
        ("Pão-de-Açúcar!", ["pao", "de", "acucar"]),
        ("uber_eats", ["uber", "eats"]),  # underscore separates words
        ("Uber, 99 e iFood.", ["uber", "99", "e", "ifood"]),
        ("MercadoㅤExtra", ["mercado", "extra"]),
        ("cine​ma", ["cinema"]),
        ("🍕 & 🍺", []),
        ("", []),
    ],
)
def test_words_are_runs_of_letters_and_digits(text, expected):
    assert words(text) == expected


# --- Friend duplicates (004 regression) ---------------------------------------


@pytest.mark.parametrize("name", ["AnaㅤLima", "ANA⠀LIMA", "ánaᅟ lima"])
def test_friend_with_blank_letter_is_a_duplicate_of_seeded_friend(client, db, name):
    before = db.execute("SELECT count(*) FROM person").fetchone()[0]

    response = client.post("/friends", json={"name": name})

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "friend_exists"
    assert db.execute("SELECT count(*) FROM person").fetchone()[0] == before
