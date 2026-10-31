"""Shared pieces of the API contract: money and id types, errors and text.

The models live in one module per domain (balance, friends, transactions).

Money is integer cents as StrictInt, so "1000" and 10.5 are rejected instead of
silently converted. MAX_CENTS (R$ 10 bilhões) keeps values inside SQLite's
64-bit integers, so an absurd number is a 422, not a 500.

Text fields use VisibleText: invisible characters are trimmed from both ends,
so a value made only of spaces or zero-width characters is rejected as empty.
A value with nothing drawable left (only accents or other marks) is rejected
too (app.text.is_blank).
"""

from typing import Annotated, Any

from pydantic import AfterValidator, BaseModel, BeforeValidator, Field, StrictInt, StringConstraints

from app.text import is_blank, trim_invisible

MAX_CENTS = 10**12
# SQLite's largest INTEGER: a bigger id would overflow (a 500) instead of a 422.
MAX_ID = 2**63 - 1

Cents = Annotated[StrictInt, Field(ge=-MAX_CENTS, le=MAX_CENTS)]
NonNegativeCents = Annotated[StrictInt, Field(ge=0, le=MAX_CENTS)]
PositiveCents = Annotated[StrictInt, Field(gt=0, le=MAX_CENTS)]
Id = Annotated[StrictInt, Field(ge=1, le=MAX_ID)]


# --- Errors -------------------------------------------------------------------


class ErrorDetail(BaseModel):
    code: str = Field(examples=["validation_error"])
    message: str = Field(description="pt-BR, shown to the user as is.")


class ErrorResponse(BaseModel):
    """The one error shape every endpoint returns (main.py builds it)."""

    error: ErrorDetail


def error_responses(errors: dict[int, str]) -> dict[int | str, dict[str, Any]]:
    """`responses=` for a route: each status documented with ErrorResponse.

    Declaring 422 here also stops FastAPI from advertising its default
    `{"detail": [...]}` body, which this API never returns.
    """
    return {
        status: {"model": ErrorResponse, "description": f"Error codes: {codes}."}
        for status, codes in errors.items()
    }


# --- Text ---------------------------------------------------------------------

# What counts as invisible is defined once in app/text.py.


def _blank_to_none(value: Any) -> Any:
    value = trim_invisible(value)
    return None if isinstance(value, str) and is_blank(value) else value


def _reject_blank(value: str) -> str:
    if is_blank(value):
        raise ValueError("text has no visible character")
    return value


def VisibleText(max_length: int, min_length: int = 1) -> Any:  # noqa: N802 (a type)
    """Required text: trimmed, then min_length..max_length characters, then
    not blank (only marks or invisible characters left, see is_blank).

    The trim runs first (the BeforeValidator is the outermost annotation), so
    the length limits count what is stored, the same as SQLite length().
    """
    return Annotated[
        str,
        StringConstraints(min_length=min_length, max_length=max_length),
        AfterValidator(_reject_blank),
        BeforeValidator(trim_invisible),
    ]


def OptionalVisibleText(max_length: int) -> Any:  # noqa: N802 (a type)
    """Optional text: trimmed; blank (invisible characters or marks only)
    becomes null."""
    return Annotated[
        Annotated[str, StringConstraints(max_length=max_length)] | None,
        BeforeValidator(_blank_to_none),
    ]
