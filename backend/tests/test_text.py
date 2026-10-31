import pytest

from app.text import (
    BLANK_LETTERS,
    DEFAULT_IGNORABLE_RANGES,
    is_blank,
    is_invisible,
    normalize_text,
    trim_invisible,
    words,
)

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


@pytest.mark.parametrize("blank", sorted(BLANK_LETTERS))
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


# --- Default ignorable code points and marks (015 m3) -------------------------

# One sample per DEFAULT_IGNORABLE_RANGES entry that the audit named or that is
# not Cf: marks with combining class 0, the Hangul fillers, the tags.
IGNORABLE_SAMPLES = [
    "\u034f",  # combining grapheme joiner (Mn)
    "\ufe0f",  # variation selector 16 (Mn)
    "\ufe00",  # variation selector 1 (Mn)
    "\u17b4",  # Khmer vowel inherent aq (Mn)
    "\u17b5",
    "\u180b",  # Mongolian free variation selectors (Mn)
    "\u180f",
    "\u200b",
    "\u200e",  # left-to-right mark
    "\u2060",
    "\u2065",  # unassigned inside the 2060-206F block
    "\ufeff",
    "\u115f",
    "\u1160",
    "\u3164",
    "\uffa0",
    "\U000e0001",  # language tag
    "\U000e0067",  # tag letter g
    "\U000e0100",  # variation selector 17 (Mn)
    "\U000e0fff",
]


def test_every_default_ignorable_code_point_is_invisible():
    for low, high in DEFAULT_IGNORABLE_RANGES:
        for code in range(low, high + 1):
            assert is_invisible(chr(code)), hex(code)


@pytest.mark.parametrize("char", IGNORABLE_SAMPLES)
def test_default_ignorable_is_trimmed_and_ignored_when_comparing(char):
    assert trim_invisible(f"{char}Ana Lima{char}") == "Ana Lima"
    assert normalize_text(f"Ana Lima{char}") == "ana lima"
    assert normalize_text(f"Ana{char} Lima") == "ana lima"
    assert is_blank(char * 3)


def test_trim_keeps_inner_ignorables_as_typed():
    assert trim_invisible("Ana\u034f Lima") == "Ana\u034f Lima"


@pytest.mark.parametrize(
    "text",
    ["", "   ", "\u0301", "\u0301\u0301 \u0301", "\u20dd", "\u0903", "\u00b4", "\u034f\u0301\ufe0f"],
)
def test_is_blank_for_marks_and_invisibles_only(text):
    assert is_blank(text)


@pytest.mark.parametrize("text", ["A", "é", "e\u0301", "\u0301a", "🍕", "❤\ufe0f", "1", "-", "ㅏ"])
def test_is_blank_false_when_something_is_drawn(text):
    assert not is_blank(text)


@pytest.mark.parametrize("suffix", ["\u034f", "\ufe0f", "\u17b4", "\U000e0100"])
@pytest.mark.parametrize("where", ["end", "middle"])
def test_friend_with_ignorable_is_a_duplicate_of_seeded_friend(client, db, suffix, where):
    name = "Ana Lima" + suffix if where == "end" else f"Ana{suffix} Lima"
    before = db.execute("SELECT count(*) FROM person").fetchone()[0]

    response = client.post("/friends", json={"name": name})

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "friend_exists"
    assert db.execute("SELECT count(*) FROM person").fetchone()[0] == before


@pytest.mark.parametrize(
    "name", ["\u0301", "\u034f", "\ufe0f", "\u17b4", "\u0301\u034f\ufe0f\u17b4", " \u0301 "]
)
def test_friend_name_without_visible_character_is_rejected(client, db, name):
    before = db.execute("SELECT count(*) FROM person").fetchone()[0]

    response = client.post("/friends", json={"name": name})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert db.execute("SELECT count(*) FROM person").fetchone()[0] == before


def test_blank_description_and_reason_are_rejected(client):
    expense = client.post(
        "/transactions",
        json={"type": "expense", "description": "\u0301", "amount_cents": 100},
    )
    adjustment = client.post(
        "/balance/adjustments", json={"new_balance_cents": 1, "reason": "\u0301" * 10}
    )

    assert expense.status_code == 422
    assert adjustment.status_code == 422


def test_blank_optional_text_becomes_null(client):
    response = client.post(
        "/transactions",
        json={
            "type": "expense",
            "description": "Café",
            "amount_cents": 100,
            "place": "\u0301\ufe0f",
            "notes": "\u034f",
        },
    )

    assert response.status_code == 201
    assert response.json()["place"] is None
    assert response.json()["notes"] is None


def test_accented_name_is_stored_as_typed(client):
    response = client.post("/friends", json={"name": "Zoe\u0301 Ma\u0301rio"})

    assert response.status_code == 201
    assert response.json()["name"] == "Zoe\u0301 Ma\u0301rio"
