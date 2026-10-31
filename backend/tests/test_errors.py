import sqlite3

from fastapi.testclient import TestClient

import app.db

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


# --- Database busy (015 m1) ---------------------------------------------------


def test_database_locked_returns_busy_503_with_cors(database_path, monkeypatch):
    # Another connection holds the write lock longer than the busy timeout.
    monkeypatch.setattr(app.db, "BUSY_TIMEOUT_SECONDS", 0.1)
    client = TestClient(create_app(database_path), raise_server_exceptions=False)
    with client:
        blocker = sqlite3.connect(database_path, isolation_level=None)
        blocker.execute("BEGIN EXCLUSIVE")
        try:
            response = client.post(
                "/friends", json={"name": "Bruno"}, headers={"Origin": FRONTEND_ORIGIN}
            )
        finally:
            blocker.execute("ROLLBACK")
            blocker.close()

        assert response.status_code == 503
        assert response.json() == {
            "error": {
                "code": "busy",
                "message": "O servidor está ocupado. Tente de novo em instantes.",
            }
        }
        assert response.headers["retry-after"] == "1"
        assert response.headers["access-control-allow-origin"] == FRONTEND_ORIGIN
        # Nothing was written, and the same write goes through once the lock is free.
        assert client.post("/friends", json={"name": "Bruno"}).status_code == 201


def test_reads_are_not_blocked_by_a_writer(client, database_path):
    # WAL: a write in progress does not stop GET requests.
    blocker = sqlite3.connect(database_path, isolation_level=None)
    blocker.execute("BEGIN EXCLUSIVE")
    blocker.execute("INSERT INTO person (name) VALUES ('Escrita pendente')")
    try:
        assert client.get("/balance/adjustments").status_code == 200
        names = [friend["name"] for friend in client.get("/friends").json()]
        assert "Escrita pendente" not in names
    finally:
        blocker.execute("ROLLBACK")
        blocker.close()


def test_other_operational_error_stays_internal_error(database_path):
    app = create_app(database_path)

    @app.get("/test-operational")
    def broken() -> dict:
        raise sqlite3.OperationalError("no such table: secret_table")

    client = TestClient(app, raise_server_exceptions=False)

    response = client.get("/test-operational")

    assert response.status_code == 500
    assert response.json()["error"]["code"] == "internal_error"
    assert "secret_table" not in response.text
