import sqlite3
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query

from app.db import get_db
from app.schemas.categories import Category, CategoryRule, CategoryRuleCreate, CategorySuggestion
from app.schemas.common import MAX_ID, VisibleText, error_responses
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


# Static paths only (/suggest, /rules) under /categories: there is no
# /categories/{id} route that could capture them.


@router.get("/rules", response_model=list[CategoryRule])
def list_rules(conn: Db) -> list[CategoryRule]:
    return [CategoryRule.model_validate(row) for row in categories_service.list_rules(conn)]


@router.post(
    "/rules",
    response_model=CategoryRule,
    status_code=201,
    responses=error_responses(
        {409: "rule_exists", 422: "validation_error, category_not_found"}
    ),
)
def create_rule(body: CategoryRuleCreate, conn: Db) -> CategoryRule:
    return CategoryRule.model_validate(
        categories_service.create_rule(conn, body.keyword, body.category_id)
    )


@router.delete(
    "/rules/{rule_id}",
    status_code=204,
    responses=error_responses(
        {404: "not_found", 409: "rule_is_default", 422: "validation_error"}
    ),
)
def delete_rule(rule_id: Annotated[int, Path(ge=1, le=MAX_ID)], conn: Db) -> None:
    categories_service.delete_rule(conn, rule_id)
