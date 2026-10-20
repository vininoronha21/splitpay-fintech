import sqlite3
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.db import get_db
from app.schemas.common import error_responses
from app.schemas.dashboard import Charts, Period
from app.services import dashboard as dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

Db = Annotated[sqlite3.Connection, Depends(get_db)]

# Ten years back is far beyond the seed (12 months) and keeps the dates valid.
MAX_PAST_PERIODS = 520


@router.get(
    "/charts",
    response_model=Charts,
    responses=error_responses({422: "validation_error"}),
)
def get_charts(
    conn: Db,
    period: Annotated[Period, Query()],
    offset: Annotated[
        int,
        Query(
            ge=-MAX_PAST_PERIODS,
            le=0,
            description="0 is the period containing Brasília today, -1 the one before.",
        ),
    ] = 0,
) -> Charts:
    return Charts.model_validate(dashboard_service.get_charts(conn, period, offset))
