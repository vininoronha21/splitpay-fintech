"""Dashboard charts: the user's spending in one period (US04, Business Rule 9)."""

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, StrictInt

Period = Literal["week", "month", "year"]


class ChartItem(BaseModel):
    """One expense behind a category's slice."""

    transaction_id: StrictInt
    description: str
    occurred_on: date
    own_share_cents: StrictInt = Field(description="The user's share of the expense.")


class CategoryTotal(BaseModel):
    category_id: StrictInt | None = Field(description="null groups expenses without a category.")
    category_name: str = Field(examples=["Alimentação", "Sem categoria"])
    total_cents: StrictInt
    items: list[ChartItem] = Field(description="Newest first; they sum to total_cents.")


class PersonTotal(BaseModel):
    person_id: StrictInt
    person_name: str
    total_cents: StrictInt = Field(description="Sum of the friend's shares, whatever their status.")


class Charts(BaseModel):
    period: Period
    start: date = Field(description="First day of the period (inclusive).")
    end: date = Field(description="Last day of the period (inclusive).")
    total_cents: StrictInt = Field(description="The user's own spending in the period.")
    by_category: list[CategoryTotal] = Field(
        description="Categories with spending; largest first, then by name."
    )
    by_person: list[PersonTotal] = Field(
        description="Friends with split expenses; largest first, then by name."
    )
