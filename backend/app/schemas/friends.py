"""Friends the user can split an expense with."""

from pydantic import BaseModel, ConfigDict, StrictInt

from app.schemas.common import VisibleText


class FriendCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")  # an "id" sent by the client is a 422

    name: VisibleText(max_length=60)


class Friend(BaseModel):
    id: StrictInt
    name: str
