import sqlite3
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query

from app.db import get_db
from app.schemas.common import MAX_ID, error_responses
from app.schemas.reimbursements import Reimbursement, ReimbursementSummary, SettleRequest
from app.schemas.transactions import SplitDetail, SplitStatus
from app.services import reimbursements as reimbursements_service

router = APIRouter(prefix="/reimbursements", tags=["reimbursements"])

Db = Annotated[sqlite3.Connection, Depends(get_db)]


@router.get(
    "",
    response_model=list[Reimbursement],
    responses=error_responses({422: "validation_error"}),
)
def list_reimbursements(
    conn: Db, status: Annotated[SplitStatus | None, Query()] = None
) -> list[Reimbursement]:
    rows = reimbursements_service.list_reimbursements(conn, status)
    return [Reimbursement.model_validate(row) for row in rows]


# /summary is a GET and the only path-parameter route is a PATCH, so they
# never compete; it is still declared first so a future GET /{id} cannot
# capture it.
@router.get("/summary", response_model=ReimbursementSummary)
def reimbursement_summary(conn: Db) -> ReimbursementSummary:
    return ReimbursementSummary.model_validate(reimbursements_service.reimbursement_summary(conn))


@router.patch(
    "/{transaction_id}",
    response_model=SplitDetail,
    responses=error_responses(
        {404: "not_found", 409: "already_settled", 422: "validation_error"}
    ),
)
def settle_share(
    transaction_id: Annotated[int, Path(ge=1, le=MAX_ID)], body: SettleRequest, conn: Db
) -> SplitDetail:
    return SplitDetail.model_validate(
        reimbursements_service.settle_share(conn, transaction_id, body.status)
    )
