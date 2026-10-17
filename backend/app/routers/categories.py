import sqlite3
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.db import get_db
from app.schemas.categories import Category, CategorySuggestion
from app.schemas.common import VisibleText, error_responses
from app.services import categories as categories_service

router = APIRouter(prefix="/categories", tags=["categories"])

Db = Annotated[sqlite3.Connection, Depends(get_db)]

# Same limit as a transaction description: the form asks for a suggestion
# from the text the user is typing there.
Description = Annotated[VisibleText(max_length=120), Query()]


@router.get("", response_model=list[Category])
def list_categories(conn: Db) -> list[Category]:
    return [Category.model_validate(row) for row in categories_service.list_categories(conn)]


@router.get(
    "/suggest",
    response_model=CategorySuggestion,
    responses=error_responses({422: "validation_error"}),
)
def suggest_category(description: Description, conn: Db) -> CategorySuggestion:
    return CategorySuggestion.model_validate(
        categories_service.suggest_category(conn, description)
    )
