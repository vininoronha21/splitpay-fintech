import sqlite3
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query

from app.db import get_db
from app.schemas.common import MAX_ID, error_responses
from app.schemas.transactions import (
    SplitStatus,
    TransactionCreate,
    TransactionDetail,
    TransactionSummary,
)
from app.services import transactions as transactions_service

router = APIRouter(prefix="/transactions", tags=["transactions"])

Db = Annotated[sqlite3.Connection, Depends(get_db)]


@router.post(
    "",
    response_model=TransactionDetail,
    status_code=201,
    responses=error_responses(
        {422: "validation_error, future_date, friend_not_found, category_not_found"}
    ),
)
def create_transaction(body: TransactionCreate, conn: Db) -> TransactionDetail:
    detail = transactions_service.create_transaction(conn, body.model_dump())
    return TransactionDetail.model_validate(detail)


@router.get(
    "",
    response_model=list[TransactionSummary],
    responses=error_responses({422: "validation_error"}),
)
def list_transactions(
    conn: Db,
    status: Annotated[
        SplitStatus | None,
        Query(description="Only split expenses whose share has this status."),
    ] = None,
) -> list[TransactionSummary]:
    rows = transactions_service.list_transactions(conn, status)
    return [TransactionSummary.model_validate(row) for row in rows]


@router.get(
    "/{transaction_id}",
    response_model=TransactionDetail,
    responses=error_responses({404: "not_found", 422: "validation_error"}),
)
def get_transaction(
    transaction_id: Annotated[int, Path(ge=1, le=MAX_ID)], conn: Db
) -> TransactionDetail:
    return TransactionDetail.model_validate(
        transactions_service.get_transaction(conn, transaction_id)
    )
