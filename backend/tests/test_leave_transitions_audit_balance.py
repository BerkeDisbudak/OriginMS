# pyright: reportUnknownMemberType=false, reportUnknownVariableType=false
from datetime import timedelta

from conftest import login
from fastapi.testclient import TestClient

from origin_ms.core.time import today_istanbul
from origin_ms.services.unit_of_work import InMemoryUnitOfWork


def next_weekday(days_from_today: int) -> str:
    target = today_istanbul() + timedelta(days=days_from_today)
    while target.weekday() >= 5:
        target += timedelta(days=1)
    return str(target)


def test_create_and_approve_asserts_audit_and_balance(
    client: TestClient,
    uow: InMemoryUnitOfWork,
) -> None:
    employee_headers = login(client, "employee@origin-fgl.local")
    manager_headers = login(client, "manager@origin-fgl.local")
    today = today_istanbul()
    balance_before = uow.leave_balances[("emp_employee", today.year)]
    target_date = next_weekday(70)

    create_response = client.post(
        "/api/v1/leave-requests",
        headers=employee_headers,
        json={
            "employee_id": "emp_employee",
            "type": "ANNUAL",
            "start_date": target_date,
            "end_date": target_date,
        },
    )
    assert create_response.status_code == 200
    created = create_response.json()
    after_create = uow.leave_balances[("emp_employee", today.year)]
    assert after_create.pending_days == balance_before.pending_days + 1

    approve_response = client.post(
        f"/api/v1/leave-requests/{created['id']}/approve",
        headers=manager_headers,
    )

    assert approve_response.status_code == 200
    after_approve = uow.leave_balances[("emp_employee", today.year)]
    assert after_approve.pending_days == balance_before.pending_days
    assert after_approve.used_days == balance_before.used_days + 1
    assert [event.action for event in uow.audit_events if event.entity_id == created["id"]] == [
        "leave_request.create",
        "leave_request.approved",
    ]


def test_reject_and_cancel_release_pending_days(
    client: TestClient, uow: InMemoryUnitOfWork
) -> None:
    employee_headers = login(client, "employee@origin-fgl.local")
    manager_headers = login(client, "manager@origin-fgl.local")
    today = today_istanbul()
    target_date = next_weekday(80)

    reject_response = client.post(
        "/api/v1/leave-requests/lvr_pending_01/reject",
        headers=manager_headers,
        json={"reason": "Not enough staffing coverage"},
    )
    assert reject_response.status_code == 200
    assert uow.leave_balances[("emp_employee", today.year)].pending_days >= 0
    assert any(event.action == "leave_request.rejected" for event in uow.audit_events)

    create_response = client.post(
        "/api/v1/leave-requests",
        headers=employee_headers,
        json={
            "employee_id": "emp_employee",
            "type": "ANNUAL",
            "start_date": target_date,
            "end_date": target_date,
        },
    )
    created = create_response.json()
    cancel_response = client.post(
        f"/api/v1/leave-requests/{created['id']}/cancel",
        headers=employee_headers,
    )

    assert cancel_response.status_code == 200
    assert any(event.action == "leave_request.cancelled" for event in uow.audit_events)


def test_cancel_endpoint_is_requester_only(client: TestClient) -> None:
    manager_headers = login(client, "manager@origin-fgl.local")

    response = client.post("/api/v1/leave-requests/lvr_pending_01/cancel", headers=manager_headers)

    assert response.status_code == 403
