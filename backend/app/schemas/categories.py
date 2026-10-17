"""Categories and the keyword rules that suggest one (US02)."""

from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictInt

from app.schemas.common import Id, VisibleText


class Category(BaseModel):
    id: StrictInt
    name: str


class CategorySuggestion(BaseModel):
    """The winning rule's category and keyword; all three null when no rule matches."""

    category_id: StrictInt | None
    category_name: str | None
    keyword: str | None


class CategoryRuleCreate(BaseModel):
    """A user rule. extra="forbid" so a client cannot send is_default.

    80 characters is a raw limit before normalizing; the service then requires
    1..40 characters of letters and digits, the column limit.
    """

    model_config = ConfigDict(extra="forbid")

    keyword: VisibleText(max_length=80)
    category_id: Id


class CategoryRule(BaseModel):
    id: StrictInt
    keyword: str = Field(description="Normalized: lowercase, no accents, single spaces.")
    category_id: StrictInt
    category_name: str
    is_default: StrictBool = Field(description="Default rules cannot be deleted.")
