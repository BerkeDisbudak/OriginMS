# pyright: reportUnknownMemberType=false, reportUnknownVariableType=false
from conftest import login, problem
from fastapi.testclient import TestClient


def test_login_and_me(client: TestClient) -> None:
    headers = login(client, "employee@origin-fgl.local")

    response = client.get("/api/v1/me", headers=headers)

    assert response.status_code == 200
    assert response.json()["email"] == "employee@origin-fgl.local"


def test_employee_cannot_read_manager_profile(client: TestClient) -> None:
    headers = login(client, "employee@origin-fgl.local")

    response = client.get("/api/v1/employees/emp_manager", headers=headers)

    assert response.status_code == 403
    assert problem(response)["title"] == "Forbidden"


def test_manager_can_read_direct_report(client: TestClient) -> None:
    headers = login(client, "manager@origin-fgl.local")

    response = client.get("/api/v1/employees/emp_employee", headers=headers)

    assert response.status_code == 200
    assert response.json()["id"] == "emp_employee"


def test_executive_cannot_approve(client: TestClient) -> None:
    headers = login(client, "executive@origin-fgl.local")

    response = client.post("/api/v1/leave-requests/lvr_pending_01/approve", headers=headers)

    assert response.status_code == 403
