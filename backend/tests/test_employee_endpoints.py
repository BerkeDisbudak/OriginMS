# pyright: reportUnknownMemberType=false, reportUnknownVariableType=false
# pyright: reportUnknownArgumentType=false
from datetime import timedelta

from conftest import login, problem
from fastapi.testclient import TestClient

from origin_ms.core.time import today_istanbul, utc_now
from origin_ms.domain.entities import LeaveRequest
from origin_ms.domain.enums import LeaveStatus, LeaveType
from origin_ms.services.unit_of_work import InMemoryUnitOfWork


def test_list_employees_employee_sees_only_self(client: TestClient) -> None:
    headers = login(client, "employee@origin-fgl.local")

    response = client.get("/api/v1/employees", params={"limit": 100}, headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert {item["id"] for item in body["items"]} == {"emp_employee"}
    assert body["page"]["next_cursor"] is None


def test_list_employees_manager_sees_self_and_direct_reports(
    client: TestClient, uow: InMemoryUnitOfWork
) -> None:
    headers = login(client, "manager@origin-fgl.local")
    expected_ids = {
        employee.id
        for employee in uow.employees.values()
        if employee.id == "emp_manager" or employee.manager_id == "emp_manager"
    }

    response = client.get("/api/v1/employees", params={"limit": 100}, headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert {item["id"] for item in body["items"]} == expected_ids
    assert "emp_hr" not in {item["id"] for item in body["items"]}


def test_list_employees_hr_admin_sees_everyone(client: TestClient, uow: InMemoryUnitOfWork) -> None:
    headers = login(client, "hr@origin-fgl.local")

    response = client.get("/api/v1/employees", params={"limit": 100}, headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert {item["id"] for item in body["items"]} == set(uow.employees.keys())
    assert body["page"]["next_cursor"] is None


def test_update_employee_hr_admin_can_patch_and_audit_is_scoped_to_changed_fields(
    client: TestClient, uow: InMemoryUnitOfWork
) -> None:
    headers = login(client, "hr@origin-fgl.local")

    response = client.patch(
        "/api/v1/employees/emp_employee",
        json={"title": "Senior Operations Specialist"},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Senior Operations Specialist"

    audit_event = uow.audit_events[-1]
    assert audit_event.action == "employee.update"
    assert audit_event.entity_id == "emp_employee"
    assert audit_event.before == {"title": "Operations Specialist"}
    assert audit_event.after == {"title": "Senior Operations Specialist"}


def test_update_employee_manager_denied(client: TestClient) -> None:
    headers = login(client, "manager@origin-fgl.local")

    response = client.patch(
        "/api/v1/employees/emp_employee",
        json={"title": "New Title"},
        headers=headers,
    )

    assert response.status_code == 403
    assert problem(response)["title"] == "Forbidden"


def test_update_employee_self_service_denied(client: TestClient) -> None:
    headers = login(client, "employee@origin-fgl.local")

    response = client.patch(
        "/api/v1/employees/emp_employee",
        json={"title": "New Title"},
        headers=headers,
    )

    assert response.status_code == 403


def test_update_employee_email_collision_returns_field_error(client: TestClient) -> None:
    headers = login(client, "hr@origin-fgl.local")

    response = client.patch(
        "/api/v1/employees/emp_employee",
        json={"email": "manager@origin-fgl.local"},
        headers=headers,
    )

    body = problem(response)
    assert response.status_code == 422
    assert body["errors"] == [
        {
            "field": "email",
            "code": "email_taken",
            "message": "Email is already in use by another employee.",
        }
    ]


def test_update_employee_unknown_manager_id_returns_field_error(client: TestClient) -> None:
    headers = login(client, "hr@origin-fgl.local")

    response = client.patch(
        "/api/v1/employees/emp_employee",
        json={"manager_id": "emp_does_not_exist"},
        headers=headers,
    )

    body = problem(response)
    assert response.status_code == 422
    assert body["errors"][0]["field"] == "manager_id"


def test_update_employee_circular_manager_rejected(
    client: TestClient, uow: InMemoryUnitOfWork
) -> None:
    headers = login(client, "hr@origin-fgl.local")
    assert uow.employees["emp_employee"].manager_id == "emp_manager"

    response = client.patch(
        "/api/v1/employees/emp_manager",
        json={"manager_id": "emp_employee"},
        headers=headers,
    )

    body = problem(response)
    assert response.status_code == 422
    assert body["errors"] == [
        {
            "field": "manager_id",
            "code": "circular_management",
            "message": "Manager assignment would create a circular reporting chain.",
        }
    ]


def test_update_employee_self_management_rejected(client: TestClient) -> None:
    headers = login(client, "hr@origin-fgl.local")

    response = client.patch(
        "/api/v1/employees/emp_employee",
        json={"manager_id": "emp_employee"},
        headers=headers,
    )

    body = problem(response)
    assert response.status_code == 422
    assert body["errors"] == [
        {
            "field": "manager_id",
            "code": "self_management",
            "message": "An employee cannot be their own manager.",
        }
    ]


def test_leave_history_self_can_read(client: TestClient) -> None:
    headers = login(client, "employee@origin-fgl.local")

    response = client.get("/api/v1/employees/emp_employee/leave-history", headers=headers)

    assert response.status_code == 200
    assert len(response.json()["items"]) >= 1


def test_leave_history_direct_report_manager_can_read(client: TestClient) -> None:
    headers = login(client, "manager@origin-fgl.local")

    response = client.get("/api/v1/employees/emp_employee/leave-history", headers=headers)

    assert response.status_code == 200


def test_leave_history_unrelated_actor_denied(client: TestClient) -> None:
    headers = login(client, "manager@origin-fgl.local")

    response = client.get("/api/v1/employees/emp_hr/leave-history", headers=headers)

    assert response.status_code == 403


def test_leave_history_hr_admin_can_read_anyone(client: TestClient) -> None:
    headers = login(client, "hr@origin-fgl.local")

    response = client.get("/api/v1/employees/emp_employee/leave-history", headers=headers)

    assert response.status_code == 200


def test_leave_history_newest_first_with_cursor_pagination_and_status_filter(
    client: TestClient, uow: InMemoryUnitOfWork
) -> None:
    today = today_istanbul()
    created_at = utc_now()
    for suffix, status in (
        ("01", LeaveStatus.APPROVED),
        ("02", LeaveStatus.REJECTED),
        ("03", LeaveStatus.APPROVED),
    ):
        request_id = f"lvr_hist_test_{suffix}"
        start = today + timedelta(days=100)
        uow.leave_requests[request_id] = LeaveRequest(
            id=request_id,
            employee_id="emp_employee",
            type=LeaveType.ANNUAL,
            start_date=start,
            end_date=start,
            business_days=1,
            status=status,
            created_at=created_at,
        )

    headers = login(client, "employee@origin-fgl.local")

    first_page = client.get(
        "/api/v1/employees/emp_employee/leave-history",
        params={"limit": 2},
        headers=headers,
    )
    assert first_page.status_code == 200
    first_body = first_page.json()
    first_ids = [item["id"] for item in first_body["items"]]
    assert first_ids == sorted(first_ids, reverse=True)
    assert first_body["page"]["next_cursor"] is not None

    second_page = client.get(
        "/api/v1/employees/emp_employee/leave-history",
        params={"limit": 2, "cursor": first_body["page"]["next_cursor"]},
        headers=headers,
    )
    assert second_page.status_code == 200
    second_ids = {item["id"] for item in second_page.json()["items"]}
    assert second_ids.isdisjoint(set(first_ids))

    filtered = client.get(
        "/api/v1/employees/emp_employee/leave-history",
        params={"status": "rejected", "limit": 100},
        headers=headers,
    )
    assert filtered.status_code == 200
    filtered_ids = {item["id"] for item in filtered.json()["items"]}
    assert "lvr_hist_test_02" in filtered_ids
    assert "lvr_hist_test_01" not in filtered_ids
