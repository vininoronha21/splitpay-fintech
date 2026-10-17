import sqlite3
from typing import Annotated

from fastapi import APIRouter, Depends

from app.db import get_db
from app.schemas.balance import Adjustment, AdjustmentCreate, Balance, Budget
from app.schemas.common import error_responses
from app.services import balance as balance_service

# No prefix: /budget lives here too, as a money summary like the balance.
router = APIRouter(tags=["balance"])

Db = Annotated[sqlite3.Connection, Depends(get_db)]


@router.get("/balance", response_model=Balance)
def get_balance(conn: Db) -> Balance:
    return Balance.model_validate(balance_service.get_balance(conn))


@router.get("/balance/adjustments", response_model=list[Adjustment])
def list_adjustments(conn: Db) -> list[Adjustment]:
    return [Adjustment.model_validate(row) for row in balance_service.list_adjustments(conn)]


@router.post(
    "/balance/adjustments",
    response_model=Adjustment,
    status_code=201,
    responses=error_responses({422: "validation_error, no_change"}),
)
def create_adjustment(body: AdjustmentCreate, conn: Db) -> Adjustment:
    entry = balance_service.create_adjustment(conn, body.new_balance_cents, body.reason)
    return Adjustment.model_validate(entry)


@router.get("/budget", response_model=Budget)
def get_budget(conn: Db) -> Budget:
    return Budget.model_validate(balance_service.get_budget(conn))
