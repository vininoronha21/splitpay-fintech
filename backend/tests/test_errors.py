from fastapi.testclient import TestClient

from app.config import FRONTEND_ORIGIN
from app.main import create_app


def crashing_app(database_path: str):
    app = create_app(database_path)

    @app.get("/test-crash")
    def crash() -> dict:
        raise RuntimeError("secret detail: SELECT * FROM users")

    return app


def test_unknown_route_returns_not_found(client):
    response = client.get("/does-not-exist")

    assert response.status_code == 404
    assert response.json() == {
        "error": {"code": "not_found", "message": "Recurso não encontrado."}
    }


def test_wrong_method_returns_method_not_allowed(client):
    response = client.post("/health")

    assert response.status_code == 405
    assert response.json()["error"]["code"] == "method_not_allowed"


def test_validation_failure_returns_validation_error(database_path):
    app = create_app(database_path)

    @app.get("/test-validation")
    def needs_int(amount_cents: int) -> dict:
        return {"amount_cents": amount_cents}

    response = TestClient(app).get("/test-validation", params={"amount_cents": "abc"})

    assert response.status_code == 422
    assert response.json() == {
        "error": {
            "code": "validation_error",
            "message": "Dados inválidos na requisição.",
        }
    }


def test_unhandled_exception_returns_generic_internal_error(database_path):
    client = TestClient(crashing_app(database_path), raise_server_exceptions=False)

    response = client.get("/test-crash")

    assert response.status_code == 500
    assert response.json() == {
        "error": {"code": "internal_error", "message": "Erro interno do servidor."}
    }
    assert "secret detail" not in response.text


def test_internal_error_carries_cors_header_for_allowed_origin(database_path):
    client = TestClient(crashing_app(database_path), raise_server_exceptions=False)

    response = client.get("/test-crash", headers={"Origin": FRONTEND_ORIGIN})

    assert response.status_code == 500
    assert response.headers["access-control-allow-origin"] == FRONTEND_ORIGIN


def test_internal_error_has_no_cors_header_for_other_origin(database_path):
    client = TestClient(crashing_app(database_path), raise_server_exceptions=False)

    response = client.get("/test-crash", headers={"Origin": "http://evil.example.com"})

    assert response.status_code == 500
    assert "access-control-allow-origin" not in response.headers


def test_openapi_documents_every_error_with_error_response(client):
    spec = client.get("/openapi.json").json()

    assert "HTTPValidationError" not in spec["components"]["schemas"]
    assert set(spec["components"]["schemas"]["ErrorResponse"]["properties"]) == {"error"}
    for path, operations in spec["paths"].items():
        for method, operation in operations.items():
            for status, response in operation["responses"].items():
                if status.startswith(("4", "5")):
                    schema = response["content"]["application/json"]["schema"]
                    assert schema["$ref"].endswith("/ErrorResponse"), (path, method, status)


def test_openapi_documents_003_error_codes(client):
    paths = client.get("/openapi.json").json()["paths"]

    assert "validation_error" in paths["/profile"]["patch"]["responses"]["422"]["description"]
    post_adjustment = paths["/balance/adjustments"]["post"]["responses"]["422"]
    assert "validation_error" in post_adjustment["description"]
    assert "no_change" in post_adjustment["description"]
