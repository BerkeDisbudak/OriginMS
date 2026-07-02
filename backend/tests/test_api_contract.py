# pyright: reportAttributeAccessIssue=false, reportFunctionMemberAccess=false
# pyright: reportUnknownMemberType=false, reportUnknownVariableType=false
from fastapi.testclient import TestClient


def test_operation_ids_match_phase2a_table(client: TestClient) -> None:
    openapi = client.app.openapi()
    operation_ids = {
        operation["operationId"]
        for path in openapi["paths"].values()
        for operation in path.values()
    }

    assert operation_ids == {
        "login",
        "get_current_user",
        "get_employee",
        "get_leave_balance",
        "create_leave_request",
        "list_leave_requests",
        "get_leave_request",
        "approve_leave_request",
        "reject_leave_request",
        "cancel_leave_request",
    }


def test_problem_json_schema_is_declared(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login", json={"email": "missing@origin-fgl.local", "password": "bad"}
    )

    assert response.status_code == 401
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["errors"] == []
