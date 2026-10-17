"""Expenses, incomes and their 1-to-1 split."""

import re
from datetime import date, datetime
from typing import Annotated, Any, Literal, Self

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, StrictInt, model_validator

from app.schemas.common import Id, OptionalVisibleText, PositiveCents, VisibleText

# Display-only installments (Business Rule 2); 360 = 30 years of monthly payments.
MAX_INSTALLMENTS = 360

TransactionType = Literal["expense", "income"]
SplitMode = Literal["equal", "percentage", "fixed"]
SplitStatus = Literal["em_aberto", "pago", "acertado"]
PaymentMethod = Literal["pix", "debito", "credito", "dinheiro"]


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
