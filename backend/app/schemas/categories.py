"""Categories and the keyword rules that suggest one (US02)."""

from pydantic import BaseModel, StrictInt


class Category(BaseModel):
    id: StrictInt
    name: str


class CategorySuggestion(BaseModel):
    """The winning rule's category and keyword; all three null when no rule matches."""

    category_id: StrictInt | None
    category_name: str | None
    keyword: str | None
