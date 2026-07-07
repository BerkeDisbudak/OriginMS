# pyright: reportUnknownMemberType=false, reportUnknownVariableType=false, reportUnusedFunction=false, reportUnknownArgumentType=false
"""Real-persistence integration tests -- additive to the 53 in-memory tests,
never replacing them. Requires ORIGIN_MS_DATABASE_URL to point at a real
Postgres database (skipped entirely otherwise). Proves the exact gap
CODEX_BRIEF §8a flagged: that data survives independently of any single
in-process object, by reading it back through a second, unrelated session.
"""

import asyncio
import subprocess
import sys
from collections.abc import Coroutine
from datetime import date, timedelta
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text

from origin_ms.core.config import get_settings, uses_real_database
from origin_ms.core.time import today_istanbul
from origin_ms.main import create_app
from origin_ms.repositories.database import SessionLocal, engine
from origin_ms.repositories.models import (
    AuditEventModel,
    DepartmentModel,
    EmployeeModel,
    LeaveBalanceModel,
    LeaveRequestModel,
    PublicHolidayModel,
    UserModel,
)
from origin_ms.scripts.seed_database import seed

pytestmark = pytest.mark.skipif(
    not uses_real_database(get_settings()),
    reason="Requires a real database: set ORIGIN_MS_DATABASE_URL to run these.",
)

BACKEND_ROOT = Path(__file__).resolve().parents[1]

_HOLIDAY_MONTH_DAYS = {(1, 1), (4, 23), (5, 1), (5, 19), (7, 15), (8, 30), (10, 29)}


def _next_business_day(candidate: date) -> date:
    while candidate.weekday() >= 5 or (candidate.month, candidate.day) in _HOLIDAY_MONTH_DAYS:
        candidate += timedelta(days=1)
    return candidate


# Unlike test_leave_policy.py's pure-logic tests, this one must land within
# today_istanbul().year specifically: the demo seed only creates a leave
# balance row for the *current* year (build_demo_uow() -> ensure_balance()),
# so a date in any other year 404s with "Leave balance not found" regardless
# of business-day correctness. +45 days keeps clear of the seed's own
# pending request for emp_employee (seeded at today+11).
LEAVE_DATE = _next_business_day(today_istanbul() + timedelta(days=45))


def _run[T](coro: Coroutine[Any, Any, T]) -> T:
    # `engine` (repositories/database.py) is a module-level singleton whose
    # connection pool binds to whatever event loop first used it. Each
    # `asyncio.run()` call here creates a brand-new loop, so a pooled
    # connection left behind by a previous call is unusable under this one --
    # disposing both before and after forces a fresh connection under
    # whichever loop is actually running right now. Callers must ensure no
    # *other* loop (e.g. TestClient's own internal one) is concurrently
    # alive when this runs, or disposal itself will try to close a
    # foreign-loop connection and blow up -- see the fully-closed-before-
    # verification pattern in the tests below.
    async def _wrapped() -> T:
        await engine.dispose()
        try:
            return await coro
        finally:
            await engine.dispose()

    return asyncio.run(_wrapped())


def _run_alembic_upgrade() -> None:
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=BACKEND_ROOT,
        check=True,
    )


async def _truncate_all() -> None:
    async with engine.begin() as conn:
        for model in (
            AuditEventModel,
            LeaveRequestModel,
            LeaveBalanceModel,
            PublicHolidayModel,
            UserModel,
            EmployeeModel,
            DepartmentModel,
        ):
            await conn.execute(text(f'TRUNCATE TABLE "{model.__tablename__}" CASCADE'))


@pytest.fixture(scope="module", autouse=True)
def _prepare_schema() -> None:
    _run_alembic_upgrade()


@pytest.fixture
def seeded_database() -> None:
    _run(_truncate_all())
    _run(seed())


def _login(client: TestClient, email: str) -> dict[str, str]:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": "password"})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


async def _fetch_leave_request(leave_request_id: str) -> LeaveRequestModel | None:
    async with SessionLocal() as session:
        return (
            await session.execute(
                select(LeaveRequestModel).where(LeaveRequestModel.id == leave_request_id)
            )
        ).scalar_one_or_none()


async def _fetch_leave_balance(employee_id: str, year: int) -> LeaveBalanceModel | None:
    async with SessionLocal() as session:
        return (
            await session.execute(
                select(LeaveBalanceModel).where(
                    LeaveBalanceModel.employee_id == employee_id,
                    LeaveBalanceModel.year == year,
                )
            )
        ).scalar_one_or_none()


async def _fetch_employee(employee_id: str) -> EmployeeModel | None:
    async with SessionLocal() as session:
        return (
            await session.execute(select(EmployeeModel).where(EmployeeModel.id == employee_id))
        ).scalar_one_or_none()


def test_leave_approval_flow_persists_to_real_database(seeded_database: None) -> None:
    del seeded_database
    # emp_employee already has a seeded pending request (build_demo_uow()'s
    # pending_seed includes it), so pending_days' baseline isn't 0 -- assert
    # relative to it, same invariant test_leave_transitions_audit_balance.py's
    # in-memory equivalent checks (after_approve.pending_days ==
    # balance_before.pending_days).
    balance_before = _run(_fetch_leave_balance("emp_employee", LEAVE_DATE.year))
    assert balance_before is not None
    pending_before = balance_before.pending_days
    used_before = balance_before.used_days

    # The TestClient's `with` block must fully close (tearing down its own
    # internal event loop/connections) before any of this file's separate
    # `_run()`-driven verification calls -- otherwise two live event loops
    # fight over the same connection pool.
    with TestClient(create_app()) as client:
        employee_headers = _login(client, "employee@origin-fgl.local")
        hr_headers = _login(client, "hr@origin-fgl.local")

        create = client.post(
            "/api/v1/leave-requests",
            headers=employee_headers,
            json={
                "employee_id": "emp_employee",
                "type": "ANNUAL",
                "start_date": str(LEAVE_DATE),
                "end_date": str(LEAVE_DATE),
            },
        )
        assert create.status_code == 200, create.text
        leave_request_id = create.json()["id"]

        approve = client.post(
            f"/api/v1/leave-requests/{leave_request_id}/approve",
            headers=hr_headers,
        )
        assert approve.status_code == 200, approve.text

    # The real point of this test: read it back through a completely
    # independent session/connection, not the one the request just used.
    persisted_request = _run(_fetch_leave_request(leave_request_id))
    assert persisted_request is not None
    assert persisted_request.status == "approved"

    persisted_balance = _run(_fetch_leave_balance("emp_employee", LEAVE_DATE.year))
    assert persisted_balance is not None
    assert persisted_balance.used_days == used_before + 1
    assert persisted_balance.pending_days == pending_before


def test_manager_cycle_guard_rejected_and_valid_reassignment_persists(
    seeded_database: None,
) -> None:
    del seeded_database
    with TestClient(create_app()) as client:
        hr_headers = _login(client, "hr@origin-fgl.local")

        # emp_hr (root, no manager) -> would-be manager_id=emp_employee
        # creates a cycle, since emp_employee -> emp_manager -> emp_hr already.
        cyclic = client.patch(
            "/api/v1/employees/emp_hr",
            headers=hr_headers,
            json={"manager_id": "emp_employee"},
        )
        assert cyclic.status_code == 422, cyclic.text
        assert cyclic.json()["errors"][0]["code"] == "circular_management"

        # A valid reassignment (emp_employee reporting directly to emp_hr
        # instead of emp_manager) must succeed.
        valid = client.patch(
            "/api/v1/employees/emp_employee",
            headers=hr_headers,
            json={"manager_id": "emp_hr"},
        )
        assert valid.status_code == 200, valid.text

    # Both checked from a completely independent session/connection, after
    # the client's own session has fully closed.
    unchanged = _run(_fetch_employee("emp_hr"))
    assert unchanged is not None
    assert unchanged.manager_id is None

    persisted = _run(_fetch_employee("emp_employee"))
    assert persisted is not None
    assert persisted.manager_id == "emp_hr"
