"""Profile, balance, balance adjustments and the monthly budget."""

from datetime import datetime

from pydantic import BaseModel, Field, StrictInt

from app.schemas.common import Cents, NonNegativeCents, VisibleText


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


# --- Budget -------------------------------------------------------------------


class Budget(BaseModel):
    """Business Rule 5: only the user's own share counts against the budget."""

    month: str = Field(description="Current Brasília month, YYYY-MM.", examples=["2026-10"])
    budget_cents: StrictInt
    spent_cents: StrictInt = Field(description="The user's own share of this month's expenses.")
    remaining_cents: StrictInt = Field(description="budget - spent; negative when over budget.")
    used_percent: StrictInt = Field(description="floor(spent * 100 / budget); may pass 100.")
