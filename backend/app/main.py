from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import FRONTEND_ORIGIN
from app.routers import health

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


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return error_response(500, "internal_error", "Erro interno do servidor.")


def create_app() -> FastAPI:
    app = FastAPI(title="SplitPay API")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[FRONTEND_ORIGIN],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
    app.include_router(health.router)
    return app


app = create_app()
