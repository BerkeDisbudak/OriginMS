# pyright: reportUnknownMemberType=false, reportUnknownVariableType=false
from collections.abc import Generator
from typing import Any

import pytest
from fastapi.testclient import TestClient

from origin_ms.main import create_app
from origin_ms.services.unit_of_work import InMemoryUnitOfWork, build_demo_uow


@pytest.fixture
def uow() -> InMemoryUnitOfWork:
    return build_demo_uow(password="password")


@pytest.fixture
def client(uow: InMemoryUnitOfWork) -> Generator[TestClient, None, None]:
    with TestClient(create_app(uow)) as test_client:
        yield test_client


def login(client: TestClient, email: str) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "password"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def problem(response: Any) -> dict[str, Any]:
    assert response.headers["content-type"].startswith("application/problem+json")
    return response.json()
