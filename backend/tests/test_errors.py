from fastapi.testclient import TestClient

from app.main import create_app


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


def test_validation_failure_returns_validation_error():
    app = create_app()

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


def test_unhandled_exception_returns_generic_internal_error():
    app = create_app()

    @app.get("/test-crash")
    def crash() -> dict:
        raise RuntimeError("secret detail: SELECT * FROM users")

    response = TestClient(app, raise_server_exceptions=False).get("/test-crash")

    assert response.status_code == 500
    assert response.json() == {
        "error": {"code": "internal_error", "message": "Erro interno do servidor."}
    }
    assert "secret detail" not in response.text
