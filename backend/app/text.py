"""Text helpers shared by the schemas and the services.

One definition of "invisible" and one normalization, so the API trims a name
the same way the friend duplicate check and the category matching compare it.
"""

import re
import unicodedata
from typing import Any

# Whitespace (Zs/Zl/Zp), format characters such as U+200B zero-width space
# (Cf) and control characters (Cc). str.strip() alone keeps Cf characters.
INVISIBLE_CATEGORIES = frozenset({"Cc", "Cf", "Zs", "Zl", "Zp"})
# Blank but counted as letters or symbols: Hangul fillers, empty Braille cell.
INVISIBLE_CHARACTERS = frozenset("ᅟᅠㅤﾠ⠀")


def _is_invisible(char: str) -> bool:
    category = unicodedata.category(char)
    return char.isspace() or char in INVISIBLE_CHARACTERS or category in INVISIBLE_CATEGORIES


def trim_invisible(value: Any) -> Any:
    """Trim invisible characters from both ends; non-strings pass through to
    the str check, which rejects them."""
    if not isinstance(value, str):
        return value
    start, end = 0, len(value)
    while start < end and _is_invisible(value[start]):
        start += 1
    while end > start and _is_invisible(value[end - 1]):
        end -= 1
    return value[start:end]


def normalize_text(text: str) -> str:
    """Lowercase without accents or invisible characters, so "Âna  Lima",
    "A​na Lima" and "ana lima" compare equal.

    NFKD splits "Â" into "A" + a combining accent; dropping the combining marks
    leaves the base letters. Format characters (category Cf, such as the
    zero-width space) render as nothing, so they are dropped too. The blank
    letters (INVISIBLE_CHARACTERS) look like a space, so they become one; then
    split() + join collapses every run of whitespace into one space. casefold()
    is lower() that also handles "ß".
    """
    decomposed = unicodedata.normalize("NFKD", text)
    visible = "".join(
        " " if char in INVISIBLE_CHARACTERS else char
        for char in decomposed
        if not unicodedata.combining(char) and unicodedata.category(char) != "Cf"
    )
    return " ".join(visible.split()).casefold()


def words(text: str) -> list[str]:
    """The runs of letters and digits in normalize_text(text): "Pão-de-Açúcar!"
    gives ["pao", "de", "acucar"].

    Punctuation and symbols separate words. [^\\W_] is \\w without the
    underscore, so "uber_eats" is two words, the same as "uber eats".
    """
    return re.findall(r"[^\W_]+", normalize_text(text))
