import sqlite3
import threading
from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.db import connect, init_db
from app.main import create_app


@pytest.fixture
def database_path(tmp_path: Path) -> str:
    """A fresh temporary database file for each test."""
    return str(tmp_path / "splitpay.db")


@pytest.fixture
def client(database_path: str) -> Iterator[TestClient]:
    # The context manager runs the lifespan, which rebuilds the database.
    with TestClient(create_app(database_path)) as test_client:
        yield test_client


@pytest.fixture
def db(database_path: str, request: pytest.FixtureRequest) -> Iterator[sqlite3.Connection]:
    """Connection to the test database with schema and seed loaded."""
    if "client" in request.fixturenames:
        # The app startup rebuilds the file; start it first so both share it.
        request.getfixturevalue("client")
    else:
        init_db(database_path)
    conn = connect(database_path)
    yield conn
    conn.close()


def send_in_parallel(client: TestClient, requests: list[tuple]) -> list[int]:
    """Send every (method, path, body) through one client at the same moment,
    one thread each. Returns the status codes in request order."""
    barrier = threading.Barrier(len(requests))

    def send(request):
        method, path, body = request
        barrier.wait()
        return client.request(method, path, json=body).status_code

    with ThreadPoolExecutor(max_workers=len(requests)) as pool:
        return list(pool.map(send, requests))


def parallel_requests(database_path: str, requests: list[tuple]) -> list[int]:
    """Send the requests in parallel to a fresh app on a real database file.

    raise_server_exceptions=False turns a server error into the 500 a visitor
    would get, instead of an exception inside the worker thread.
    """
    with TestClient(create_app(database_path), raise_server_exceptions=False) as client:
        return send_in_parallel(client, requests)
