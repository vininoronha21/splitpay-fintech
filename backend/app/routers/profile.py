import sqlite3
from typing import Annotated

from fastapi import APIRouter, Depends

from app.db import get_db
from app.schemas import Profile, ProfileUpdate, error_responses
from app.services import balance as balance_service

router = APIRouter(prefix="/profile", tags=["profile"])

Db = Annotated[sqlite3.Connection, Depends(get_db)]


@router.get("", response_model=Profile)
def get_profile(conn: Db) -> Profile:
    return Profile.model_validate(balance_service.get_profile(conn))


@router.patch(
    "", response_model=Profile, responses=error_responses({422: "validation_error"})
)
def update_profile(body: ProfileUpdate, conn: Db) -> Profile:
    profile = balance_service.set_initial_balance(conn, body.initial_balance_cents)
    return Profile.model_validate(profile)
