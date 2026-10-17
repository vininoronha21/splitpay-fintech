"""Categories and keyword rules (US02, Business Rule 8).

Matching runs in Python, not SQL: SQLite cannot strip accents, and LIKE matches
substrings ("bar" inside "barbearia"). With a few dozen rules, loading them all
per request costs nothing.
"""

import sqlite3
from collections.abc import Iterable, Mapping
from typing import Any

from app.text import words

RULES_WITH_CATEGORY_SQL = """
SELECT r.id, r.keyword, r.category_id, c.name AS category_name, r.is_default
FROM category_rule r
JOIN category c ON c.id = r.category_id
"""

NO_SUGGESTION = {"category_id": None, "category_name": None, "keyword": None}


def _contains_words(haystack: list[str], needle: list[str]) -> bool:
    """True when needle appears as consecutive whole words of haystack."""
    size = len(needle)
    return size > 0 and any(
        haystack[start : start + size] == needle for start in range(len(haystack) - size + 1)
    )


def pick_rule(
    description_words: list[str], rules: Iterable[Mapping[str, Any]]
) -> Mapping[str, Any] | None:
    """The rule that decides the suggestion, or None when no keyword matches.

    Rules carry an already-normalized keyword (single spaces), so its words are
    keyword.split(" "). Comparing word lists, not substrings, keeps "bar" off
    "barbearia". The sort key is Business Rule 8: a user rule beats a default
    (is_default 0 < 1), then the longest keyword ("uber eats" over "uber"),
    then the lowest id, so the answer never changes between calls.
    """
    matches = [
        rule for rule in rules if _contains_words(description_words, rule["keyword"].split(" "))
    ]
    if not matches:
        return None
    return min(
        matches, key=lambda rule: (bool(rule["is_default"]), -len(rule["keyword"]), rule["id"])
    )


def list_categories(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    """In id order, so "Outros" (the catch-all) stays last."""
    return [dict(row) for row in conn.execute("SELECT id, name FROM category ORDER BY id")]


def suggest_category(conn: sqlite3.Connection, description: str) -> dict[str, Any]:
    """The suggested category for a description; all fields None when nothing matches.

    Read-only: the form shows the suggestion and the user confirms it.
    """
    rules = [dict(row) for row in conn.execute(RULES_WITH_CATEGORY_SQL)]
    rule = pick_rule(words(description), rules)
    if rule is None:
        return dict(NO_SUGGESTION)
    return {
        "category_id": rule["category_id"],
        "category_name": rule["category_name"],
        "keyword": rule["keyword"],
    }
