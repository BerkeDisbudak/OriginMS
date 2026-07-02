# pyright: reportUnknownMemberType=false, reportUnknownVariableType=false
from datetime import timedelta

from conftest import login, problem
from fastapi.testclient import TestClient

from origin_ms.core.time import today_istanbul
from origin_ms.services.unit_of_work import InMemoryUnitOfWork


def test_end_before_start_returns_field_problem(client: TestClient) -> None:
    headers = login(client, "employee@origin-fgl.local")
    today = today_istanbul()

    response = client.post(
        "/api/v1/leave-requests",
        headers=headers,
        json={
            "employee_id": "emp_employee",
            "type": "ANNUAL",
            "start_date": str(today + timedelta(days=20)),
            "end_date": str(today + timedelta(days=19)),
        },
    )

    body = problem(response)
    assert response.status_code == 422
    assert body["errors"][0]["field"] == "end_date"


def test_past_annual_returns_field_problem(client: TestClient) -> None:
    headers = login(client, "employee@origin-fgl.local")
    past = today_istanbul() - timedelta(days=1)

    response = client.post(
        "/api/v1/leave-requests",
        headers=headers,
        json={
            "employee_id": "emp_employee",
            "type": "ANNUAL",
            "start_date": str(past),
            "end_date": str(past),
        },
    )

    assert response.status_code == 422
    assert problem(response)["errors"][0]["code"] == "past_annual"


def test_overlap_returns_field_problem(client: TestClient) -> None:
    headers = login(client, "employee@origin-fgl.local")
    first = client.get("/api/v1/leave-requests/lvr_pending_01", headers=headers).json()

    response = client.post(
        "/api/v1/leave-requests",
        headers=headers,
        json={
            "employee_id": "emp_employee",
            "type": "ANNUAL",
            "start_date": first["start_date"],
            "end_date": first["end_date"],
        },
    )

    assert response.status_code == 422
    assert problem(response)["errors"][0]["code"] == "overlap"


def test_insufficient_balance_returns_field_problem(
    client: TestClient,
    uow: InMemoryUnitOfWork,
) -> None:
    today = today_istanbul()
    balance = uow.leave_balances[("emp_employee", today.year)]
    uow.leave_balances[("emp_employee", today.year)] = balance.model_copy(
        update={"used_days": balance.entitled_days, "pending_days": 0}
    )
    headers = login(client, "employee@origin-fgl.local")

    response = client.post(
        "/api/v1/leave-requests",
        headers=headers,
        json={
            "employee_id": "emp_employee",
            "type": "ANNUAL",
            "start_date": str(today + timedelta(days=90)),
            "end_date": str(today + timedelta(days=90)),
        },
    )

    assert response.status_code == 422
    assert problem(response)["errors"][0]["code"] == "insufficient_balance"
