"""Reimbursements: the friend's share of a split expense (US03, Business Rules 1 and 6)."""

from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StrictInt

from app.schemas.transactions import SplitStatus

# em_aberto is the starting state only: a share can be closed, never reopened.
ClosedStatus = Literal["pago", "acertado"]


class SettleRequest(BaseModel):
    """Close a share. No date: the settlement is recorded at the request's
    moment (Brasília). extra="forbid" so a client cannot send settled_on."""

    model_config = ConfigDict(extra="forbid")

    status: ClosedStatus = Field(
        description="pago adds the share to the balance; acertado closes it without money."
    )


class Reimbursement(BaseModel):
    transaction_id: StrictInt
    description: str
    occurred_on: date
    person_id: StrictInt
    person_name: str
    share_cents: StrictInt
    status: SplitStatus
    settled_on: date | None = Field(description="Brasília day the share was closed.")


class PersonOpen(BaseModel):
    person_id: StrictInt
    person_name: str
    open_cents: StrictInt


class ReimbursementSummary(BaseModel):
    """What friends still owe the user ("a receber", Business Rule 6)."""

    open_cents: StrictInt
    open_count: StrictInt
    by_person: list[PersonOpen] = Field(
        description="Only friends with an open share; largest first, then by name."
    )
