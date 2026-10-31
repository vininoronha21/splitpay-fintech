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

# Unicode Default_Ignorable_Code_Point (DerivedCoreProperties.txt): characters
# a font draws as nothing, such as U+034F combining grapheme joiner, the
# variation selectors U+FE00-FE0F and the tags U+E0000-E0FFF. Most are Cf, but
# some are marks (U+034F, U+FE0F, U+17B4) or letters (Hangul fillers), so the
# categories above miss them. Python has no lookup for this property, so the
# ranges are listed (inclusive).
DEFAULT_IGNORABLE_RANGES = (
    (0x00AD, 0x00AD),
    (0x034F, 0x034F),
    (0x061C, 0x061C),
    (0x115F, 0x1160),
    (0x17B4, 0x17B5),
    (0x180B, 0x180F),
    (0x200B, 0x200F),
    (0x202A, 0x202E),
    (0x2060, 0x206F),
    (0x3164, 0x3164),
    (0xFE00, 0xFE0F),
    (0xFEFF, 0xFEFF),
    (0xFFA0, 0xFFA0),
    (0xFFF0, 0xFFF8),
    (0x1BCA0, 0x1BCA3),
    (0x1D173, 0x1D17A),
    (0xE0000, 0xE0FFF),
)

# Blank but drawn as a gap, like a space: Hangul fillers and the empty Braille
# cell. normalize_text turns them into a space, so they separate words.
BLANK_LETTERS = frozenset("\u115f\u1160\u3164\uffa0\u2800")


def _is_default_ignorable(char: str) -> bool:
    code = ord(char)
    return any(low <= code <= high for low, high in DEFAULT_IGNORABLE_RANGES)


def is_invisible(char: str) -> bool:
    return (
        char.isspace()
        or char in BLANK_LETTERS
        or unicodedata.category(char) in INVISIBLE_CATEGORIES
        or _is_default_ignorable(char)
    )


def trim_invisible(value: Any) -> Any:
    """Trim invisible characters from both ends; non-strings pass through to
    the str check, which rejects them."""
    if not isinstance(value, str):
        return value
    start, end = 0, len(value)
    while start < end and is_invisible(value[start]):
        start += 1
    while end > start and is_invisible(value[end - 1]):
        end -= 1
    return value[start:end]


def is_blank(text: str) -> bool:
    """True when nothing would be drawn on its own: after NFKD, every character
    is invisible or a mark (category M, such as U+0301 combining acute).

    A mark only decorates the character before it, so a name made of marks
    alone looks empty. NFKD first so "´" (U+00B4, a space + U+0301) counts as
    the bare accent it is.
    """
    decomposed = unicodedata.normalize("NFKD", text)
    return all(
        is_invisible(char) or unicodedata.category(char).startswith("M")
        for char in decomposed
    )


def normalize_text(text: str) -> str:
    """Lowercase without accents or invisible characters, so "Âna  Lima",
    "A\u200bna Lima", "Ana Lima\u034f" and "ana lima" compare equal.

    NFKD splits "Â" into "A" + a combining accent; dropping the combining marks
    leaves the base letters. Spaces and the blank letters (BLANK_LETTERS) look
    like a gap, so they become a space; every other invisible character (Cc,
    Cf, default ignorable) renders as nothing, so it is dropped. Then split() +
    join collapses every run of spaces into one. casefold() is lower() that
    also handles "ß".
    """
    decomposed = unicodedata.normalize("NFKD", text)
    kept = []
    for char in decomposed:
        if char.isspace() or char in BLANK_LETTERS:
            kept.append(" ")
        elif not unicodedata.combining(char) and not is_invisible(char):
            kept.append(char)
    return " ".join("".join(kept).split()).casefold()


def words(text: str) -> list[str]:
    """The runs of letters and digits in normalize_text(text): "Pão-de-Açúcar!"
    gives ["pao", "de", "acucar"].

    Punctuation and symbols separate words. [^\\W_] is \\w without the
    underscore, so "uber_eats" is two words, the same as "uber eats".
    """
    return re.findall(r"[^\W_]+", normalize_text(text))
