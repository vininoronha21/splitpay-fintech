"""Pydantic request and response models: the API contract.

Money is integer cents as StrictInt, so "1000" and 10.5 are rejected instead of
silently converted. MAX_CENTS (R$ 10 bilhões) keeps values inside SQLite's
64-bit integers, so an absurd number is a 422, not a 500.

Text fields use VisibleText: invisible characters are trimmed from both ends,
so a value made only of spaces or zero-width characters is rejected as empty.
"""

import re
import unicodedata
from datetime import date, datetime
from typing import Annotated, Any, Literal, Self

from pydantic import (
    BaseModel,
    BeforeValidator,
    ConfigDict,
    Field,
    StrictInt,
    StringConstraints,
    model_validator,
)

MAX_CENTS = 10**12
# SQLite's largest INTEGER: a bigger id would overflow (a 500) instead of a 422.
MAX_ID = 2**63 - 1
# Display-only installments (Business Rule 2); 360 = 30 years of monthly payments.
MAX_INSTALLMENTS = 360

Cents = Annotated[StrictInt, Field(ge=-MAX_CENTS, le=MAX_CENTS)]
NonNegativeCents = Annotated[StrictInt, Field(ge=0, le=MAX_CENTS)]
PositiveCents = Annotated[StrictInt, Field(gt=0, le=MAX_CENTS)]
Id = Annotated[StrictInt, Field(ge=1, le=MAX_ID)]

TransactionType = Literal["expense", "income"]
SplitMode = Literal["equal", "percentage", "fixed"]
SplitStatus = Literal["em_aberto", "pago", "acertado"]
PaymentMethod = Literal["pix", "debito", "credito", "dinheiro"]


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


# --- Transactions -------------------------------------------------------------


def _iso_date_only(value: Any) -> Any:
    """Only "YYYY-MM-DD". Pydantic alone would also take a Unix timestamp or
    "2026-10-17T00:00:00"; the calendar check (no 30 February) comes after."""
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return value
    raise ValueError("date must be a YYYY-MM-DD string")


IsoDate = Annotated[date, BeforeValidator(_iso_date_only)]


class SplitCreate(BaseModel):
    """Exactly one friend (Business Rule 6). extra="forbid" rejects any second
    friend field, such as person_ids or friends, instead of ignoring it.

    Business Rule 7: one input per mode, always about the friend.
    """

    model_config = ConfigDict(extra="forbid")

    person_id: Id
    mode: SplitMode
    percent: Annotated[StrictInt, Field(ge=0, le=100)] | None = Field(
        default=None, description="The friend's whole percentage. Only in percentage mode."
    )
    share_cents: PositiveCents | None = Field(
        default=None, description="The friend's share in cents. Only in fixed mode."
    )

    @model_validator(mode="after")
    def check_mode_fields(self) -> Self:
        if (self.percent is not None) != (self.mode == "percentage"):
            raise ValueError("percent is required in percentage mode and only there")
        if (self.share_cents is not None) != (self.mode == "fixed"):
            raise ValueError("share_cents is required in fixed mode and only there")
        return self


class TransactionCreate(BaseModel):
    """An expense or an income (Business Rule 14). extra="forbid" so a field
    the API does not know, such as a list of friends, is an error."""

    model_config = ConfigDict(extra="forbid")

    type: TransactionType
    description: VisibleText(max_length=120)
    amount_cents: PositiveCents
    occurred_on: IsoDate | None = Field(
        default=None, description="Defaults to today in Brasília. Never in the future."
    )
    category_id: Id | None = None
    place: OptionalVisibleText(max_length=120) = None
    payment_method: PaymentMethod | None = None
    installment_number: Annotated[StrictInt, Field(ge=1, le=MAX_INSTALLMENTS)] | None = None
    installment_total: Annotated[StrictInt, Field(ge=1, le=MAX_INSTALLMENTS)] | None = None
    notes: OptionalVisibleText(max_length=500) = None
    split: SplitCreate | None = Field(default=None, description="Expenses only.")

    @model_validator(mode="after")
    def check_rules(self) -> Self:
        if self.type == "income" and self.split is not None:
            raise ValueError("an income cannot be split")
        if (self.installment_number is None) != (self.installment_total is None):
            raise ValueError("installment_number and installment_total go together")
        if self.installment_number is not None and self.installment_number > self.installment_total:
            raise ValueError("installment_number cannot exceed installment_total")
        if self.split is not None and self.split.mode == "fixed":
            if self.split.share_cents > self.amount_cents:
                raise ValueError("share_cents cannot exceed amount_cents")
        return self


class SplitDetail(BaseModel):
    person_id: StrictInt
    person_name: str
    mode: SplitMode
    percent: StrictInt | None
    friend_share_cents: StrictInt
    user_share_cents: StrictInt = Field(description="Always amount_cents - friend_share_cents.")
    status: SplitStatus
    settled_on: date | None


class TransactionDetail(BaseModel):
    id: StrictInt
    type: TransactionType
    description: str
    amount_cents: StrictInt
    category_id: StrictInt | None
    category_name: str | None
    occurred_on: date
    place: str | None
    payment_method: PaymentMethod | None
    installment_number: StrictInt | None
    installment_total: StrictInt | None
    notes: str | None
    created_at: datetime = Field(description="Brasília time (UTC-3), without offset.")
    split: SplitDetail | None


class TransactionSummary(BaseModel):
    id: StrictInt
    type: TransactionType
    description: str
    amount_cents: StrictInt
    own_share_cents: StrictInt = Field(
        description="The user's part: amount_cents minus the friend's share, if split."
    )
    category_name: str | None
    occurred_on: date
    friend_name: str | None
    split_status: SplitStatus | None


# --- Budget -------------------------------------------------------------------


class Budget(BaseModel):
    """Business Rule 5: only the user's own share counts against the budget."""

    month: str = Field(description="Current Brasília month, YYYY-MM.", examples=["2026-10"])
    budget_cents: StrictInt
    spent_cents: StrictInt = Field(description="The user's own share of this month's expenses.")
    remaining_cents: StrictInt = Field(description="budget - spent; negative when over budget.")
    used_percent: StrictInt = Field(description="floor(spent * 100 / budget); may pass 100.")
