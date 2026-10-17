"""Categories and keyword rules (US02, Business Rule 8).

Matching runs in Python, not SQL: SQLite cannot strip accents, and LIKE matches
substrings ("bar" inside "barbearia"). With a few dozen rules, loading them all
per request costs nothing.
"""

import sqlite3
from collections.abc import Iterable, Mapping
from typing import Any

from app.services import DomainError
from app.text import words

# The category_rule.keyword column limit (schema.sql).
MAX_KEYWORD_LENGTH = 40

RULES_WITH_CATEGORY_SQL = """
SELECT r.id, r.keyword, r.category_id, c.name AS category_name, r.is_default
FROM category_rule r
JOIN category c ON c.id = r.category_id
"""

# User rules first, newest first (the one just added is on top); then the
# defaults by keyword. The CASE is NULL for defaults, so it only orders users.
LIST_RULES_SQL = (
    RULES_WITH_CATEGORY_SQL
    + "ORDER BY r.is_default, CASE WHEN r.is_default = 0 THEN r.id END DESC, r.keyword"
)

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


def _rule_out(row: Mapping[str, Any]) -> dict[str, Any]:
    rule = dict(row)
    rule["is_default"] = bool(rule["is_default"])
    return rule


def list_rules(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    return [_rule_out(row) for row in conn.execute(LIST_RULES_SQL)]


def create_rule(conn: sqlite3.Connection, keyword: str, category_id: int) -> dict[str, Any]:
    """Add a user rule with the keyword stored normalized ("  Uber-Eats " -> "uber eats").

    Storing the same word list that matching compares lets the UNIQUE column
    catch "Ubér" vs "uber". BEGIN IMMEDIATE takes the write lock before the
    checks, so two visitors adding the same keyword cannot both pass them.
    """
    normalized = " ".join(words(keyword))
    if not 1 <= len(normalized) <= MAX_KEYWORD_LENGTH:
        raise DomainError(
            "validation_error",
            "A palavra-chave precisa ter letras ou números e no máximo 40 caracteres.",
        )

    conn.execute("BEGIN IMMEDIATE")
    try:
        if conn.execute("SELECT 1 FROM category WHERE id = ?", (category_id,)).fetchone() is None:
            raise DomainError("category_not_found", "Categoria não encontrada.")
        existing = conn.execute(
            "SELECT 1 FROM category_rule WHERE keyword = ?", (normalized,)
        ).fetchone()
        if existing is not None:
            raise DomainError(
                "rule_exists", "Já existe uma regra com essa palavra-chave.", status_code=409
            )
        cursor = conn.execute(
            "INSERT INTO category_rule (keyword, category_id, is_default) VALUES (?, ?, 0)",
            (normalized, category_id),
        )
        row = conn.execute(RULES_WITH_CATEGORY_SQL + "WHERE r.id = ?", (cursor.lastrowid,))
        rule = _rule_out(row.fetchone())
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    return rule


def delete_rule(conn: sqlite3.Connection, rule_id: int) -> None:
    """Delete a user rule. Default rules stay (the data is shared by every
    visitor, so one deletion would break the demo for the rest).

    The DELETE only touches user rules; when it removes nothing, a lookup in
    the same transaction tells an unknown id (404) from a default rule (409).
    """
    conn.execute("BEGIN IMMEDIATE")
    try:
        cursor = conn.execute(
            "DELETE FROM category_rule WHERE id = ? AND is_default = 0", (rule_id,)
        )
        if cursor.rowcount == 0:
            found = conn.execute("SELECT 1 FROM category_rule WHERE id = ?", (rule_id,)).fetchone()
            if found is None:
                raise DomainError("not_found", "Regra não encontrada.", status_code=404)
            raise DomainError(
                "rule_is_default", "Regras padrão não podem ser excluídas.", status_code=409
            )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
