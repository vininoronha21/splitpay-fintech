import sqlite3
from typing import Annotated

from fastapi import APIRouter, Depends

from app.db import get_db
from app.schemas import Adjustment, AdjustmentCreate, Balance
from app.services import balance as balance_service

router = APIRouter(prefix="/balance", tags=["balance"])

Db = Annotated[sqlite3.Connection, Depends(get_db)]


@router.get("", response_model=Balance)
def get_balance(conn: Db) -> Balance:
    return Balance.model_validate(balance_service.get_balance(conn))


@router.get("/adjustments", response_model=list[Adjustment])
def list_adjustments(conn: Db) -> list[Adjustment]:
    return [Adjustment.model_validate(row) for row in balance_service.list_adjustments(conn)]


@router.post("/adjustments", response_model=Adjustment, status_code=201)
def create_adjustment(body: AdjustmentCreate, conn: Db) -> Adjustment:
    entry = balance_service.create_adjustment(conn, body.new_balance_cents, body.reason)
    return Adjustment.model_validate(entry)
