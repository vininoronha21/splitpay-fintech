from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import DATABASE_PATH, FRONTEND_ORIGIN
from app.db import init_db
from app.routers import (
    balance,
    categories,
    dashboard,
    friends,
    health,
    profile,
    reimbursements,
    transactions,
)
from app.services import DomainError

HTTP_ERRORS = {
    400: ("bad_request", "Requisição inválida."),
    401: ("unauthorized", "Não autenticado."),
    403: ("forbidden", "Acesso negado."),
    404: ("not_found", "Recurso não encontrado."),
    405: ("method_not_allowed", "Método não permitido."),
    409: ("conflict", "Conflito com o estado atual do recurso."),
}


def error_response(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}},
    )


async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    code, message = HTTP_ERRORS.get(
        exc.status_code, ("http_error", "Erro na requisição.")
    )
    return error_response(exc.status_code, code, message)


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    return error_response(422, "validation_error", "Dados inválidos na requisição.")


async def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
    return error_response(exc.status_code, exc.code, exc.message)


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    response = error_response(500, "internal_error", "Erro interno do servidor.")
    # This handler runs in Starlette's ServerErrorMiddleware, outside
    # CORSMiddleware, so the allowed origin must be added here or the browser
    # hides the error body from the frontend.
    if request.headers.get("origin") == FRONTEND_ORIGIN:
        response.headers["Access-Control-Allow-Origin"] = FRONTEND_ORIGIN
        response.headers["Vary"] = "Origin"
    return response


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    init_db(app.state.database_path)
    yield


def create_app(database_path: str | None = None) -> FastAPI:
    app = FastAPI(title="SplitPay API", lifespan=lifespan)
    app.state.database_path = database_path or DATABASE_PATH
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[FRONTEND_ORIGIN],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(DomainError, domain_error_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
    app.include_router(health.router)
    app.include_router(profile.router)
    app.include_router(balance.router)
    app.include_router(friends.router)
    app.include_router(transactions.router)
    app.include_router(categories.router)
    app.include_router(reimbursements.router)
    app.include_router(dashboard.router)
    return app


app = create_app()
