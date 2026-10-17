"""Pydantic request and response models: the API contract.

Money is integer cents as StrictInt, so "1000" and 10.5 are rejected instead of
silently converted. MAX_CENTS (R$ 10 bilhões) keeps values inside SQLite's
64-bit integers, so an absurd number is a 422, not a 500.
"""

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, StrictInt, StringConstraints

MAX_CENTS = 10**12

Cents = Annotated[StrictInt, Field(ge=-MAX_CENTS, le=MAX_CENTS)]
NonNegativeCents = Annotated[StrictInt, Field(ge=0, le=MAX_CENTS)]


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
    reason: Annotated[str, StringConstraints(strip_whitespace=True, min_length=10, max_length=200)]


class Adjustment(BaseModel):
    """One history entry. previous/new balances are computed, never stored."""

    id: StrictInt
    created_at: datetime = Field(description="Brasília time (UTC-3), without offset.")
    delta_cents: StrictInt
    reason: str
    previous_balance_cents: StrictInt
    new_balance_cents: StrictInt
