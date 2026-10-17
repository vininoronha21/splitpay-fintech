"""Pydantic request and response models: the API contract.

Money is integer cents as StrictInt, so "1000" and 10.5 are rejected instead of
silently converted. MAX_CENTS (R$ 10 bilhões) keeps values inside SQLite's
64-bit integers, so an absurd number is a 422, not a 500.

Text fields use VisibleText: invisible characters are trimmed from both ends,
so a value made only of spaces or zero-width characters is rejected as empty.
"""

import unicodedata
from datetime import datetime
from typing import Annotated, Any

from pydantic import BaseModel, BeforeValidator, Field, StrictInt, StringConstraints

MAX_CENTS = 10**12

Cents = Annotated[StrictInt, Field(ge=-MAX_CENTS, le=MAX_CENTS)]
NonNegativeCents = Annotated[StrictInt, Field(ge=0, le=MAX_CENTS)]


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

# Whitespace (Zs/Zl/Zp), format characters such as U+200B zero-width space
# (Cf) and control characters (Cc). str.strip() alone keeps Cf characters.
INVISIBLE_CATEGORIES = frozenset({"Cc", "Cf", "Zs", "Zl", "Zp"})


def _is_invisible(char: str) -> bool:
    return char.isspace() or unicodedata.category(char) in INVISIBLE_CATEGORIES


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


def _blank_to_none(value: Any) -> Any:
    value = trim_invisible(value)
    return None if value == "" else value


def VisibleText(max_length: int, min_length: int = 1) -> Any:  # noqa: N802 (a type)
    """Required text: trimmed, then min_length..max_length characters.

    The trim runs first (the BeforeValidator is the outermost annotation), so
    the length limits count what is stored, the same as SQLite length().
    """
    return Annotated[
        str,
        StringConstraints(min_length=min_length, max_length=max_length),
        BeforeValidator(trim_invisible),
    ]


def OptionalVisibleText(max_length: int) -> Any:  # noqa: N802 (a type)
    """Optional text: trimmed; blank or invisible-only becomes null."""
    return Annotated[
        Annotated[str, StringConstraints(max_length=max_length)] | None,
        BeforeValidator(_blank_to_none),
    ]


class Profile(BaseModel):
    display_name: str
    initial_balance_cents: StrictInt
    monthly_budget_cents: StrictInt


class ProfileUpdate(BaseModel):
    initial_balance_cents: NonNegativeCents


class Balance(BaseModel):
    initial_balance_cents: StrictInt
    incomes_cents: StrictInt
    reimbursements_received_cents: StrictInt
    expenses_cents: StrictInt
    adjustments_cents: StrictInt
    balance_cents: StrictInt


class AdjustmentCreate(BaseModel):
    new_balance_cents: Cents
    reason: VisibleText(min_length=10, max_length=200)


class Adjustment(BaseModel):
    """One history entry. previous/new balances are computed, never stored."""

    id: StrictInt
    created_at: datetime = Field(description="Brasília time (UTC-3), without offset.")
    delta_cents: StrictInt
    reason: str
    previous_balance_cents: StrictInt
    new_balance_cents: StrictInt


# --- Friends ------------------------------------------------------------------


class FriendCreate(BaseModel):
    name: VisibleText(max_length=60)


class Friend(BaseModel):
    id: StrictInt
    name: str
