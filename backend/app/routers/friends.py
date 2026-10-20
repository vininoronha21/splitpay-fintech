import sqlite3
from typing import Annotated

from fastapi import APIRouter, Depends

from app.db import get_db
from app.schemas.common import error_responses
from app.schemas.friends import Friend, FriendCreate
from app.services import friends as friends_service

router = APIRouter(prefix="/friends", tags=["friends"])

Db = Annotated[sqlite3.Connection, Depends(get_db)]


@router.get("", response_model=list[Friend])
def list_friends(conn: Db) -> list[Friend]:
    return [Friend.model_validate(row) for row in friends_service.list_friends(conn)]


@router.post(
    "",
    response_model=Friend,
    status_code=201,
    responses=error_responses({409: "friend_exists", 422: "validation_error"}),
)
def create_friend(body: FriendCreate, conn: Db) -> Friend:
    return Friend.model_validate(friends_service.create_friend(conn, body.name))
