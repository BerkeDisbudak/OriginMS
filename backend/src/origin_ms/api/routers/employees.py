from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query

from origin_ms.api.deps import (
    get_current_actor,
    get_employee_service,
    get_ip,
    get_request_id,
)
from origin_ms.core.time import today_istanbul
from origin_ms.domain.entities import Actor
from origin_ms.domain.enums import LeaveStatus
from origin_ms.schemas.common import PageInfo
from origin_ms.schemas.employees import EmployeePage, EmployeeResponse, EmployeeUpdate
from origin_ms.schemas.errors import ProblemDetail
from origin_ms.schemas.leave import LeaveBalanceResponse, LeaveRequestPage, LeaveRequestResponse
from origin_ms.services.employee_service import EmployeeService

router = APIRouter(prefix="/employees", tags=["employees"])

problem_responses: dict[int | str, dict[str, Any]] = {
    401: {"model": ProblemDetail, "description": "Unauthorized."},
    403: {"model": ProblemDetail, "description": "Forbidden."},
    404: {"model": ProblemDetail, "description": "Not found."},
    422: {"model": ProblemDetail, "description": "Validation failed."},
}


@router.get(
    "",
    operation_id="list_employees",
    response_model=EmployeePage,
    responses=problem_responses,
)
def list_employees(
    actor: Annotated[Actor, Depends(get_current_actor)],
    service: Annotated[EmployeeService, Depends(get_employee_service)],
    cursor: Annotated[
        str | None,
        Query(description="Cursor from the previous page."),
    ] = None,
    limit: Annotated[int, Query(ge=1, le=100, description="Page size.")] = 25,
) -> EmployeePage:
    items, next_cursor = service.list_employees(actor=actor, cursor=cursor, limit=limit)
    return EmployeePage(
        items=[EmployeeResponse.model_validate(item) for item in items],
        page=PageInfo(next_cursor=next_cursor),
    )


@router.get(
    "/{employee_id}",
    operation_id="get_employee",
    response_model=EmployeeResponse,
    responses=problem_responses,
)
def get_employee(
    employee_id: str,
    actor: Annotated[Actor, Depends(get_current_actor)],
    service: Annotated[EmployeeService, Depends(get_employee_service)],
    request_id: Annotated[str, Depends(get_request_id)],
    ip: Annotated[str | None, Depends(get_ip)],
) -> EmployeeResponse:
    return EmployeeResponse.model_validate(
        service.get_employee(actor=actor, employee_id=employee_id, request_id=request_id, ip=ip)
    )


@router.patch(
    "/{employee_id}",
    operation_id="update_employee",
    response_model=EmployeeResponse,
    responses=problem_responses,
)
def update_employee(
    employee_id: str,
    body: EmployeeUpdate,
    actor: Annotated[Actor, Depends(get_current_actor)],
    service: Annotated[EmployeeService, Depends(get_employee_service)],
    request_id: Annotated[str, Depends(get_request_id)],
    ip: Annotated[str | None, Depends(get_ip)],
) -> EmployeeResponse:
    return EmployeeResponse.model_validate(
        service.update_employee(
            actor=actor,
            employee_id=employee_id,
            patch=body.model_dump(exclude_unset=True),
            request_id=request_id,
            ip=ip,
        )
    )


@router.get(
    "/{employee_id}/leave-history",
    operation_id="list_employee_leave_history",
    response_model=LeaveRequestPage,
    responses=problem_responses,
)
def list_employee_leave_history(
    employee_id: str,
    actor: Annotated[Actor, Depends(get_current_actor)],
    service: Annotated[EmployeeService, Depends(get_employee_service)],
    request_id: Annotated[str, Depends(get_request_id)],
    ip: Annotated[str | None, Depends(get_ip)],
    status: Annotated[
        LeaveStatus | None,
        Query(description="Optional status filter."),
    ] = None,
    cursor: Annotated[
        str | None,
        Query(description="Cursor from the previous page."),
    ] = None,
    limit: Annotated[int, Query(ge=1, le=100, description="Page size.")] = 25,
) -> LeaveRequestPage:
    items, next_cursor = service.list_employee_leave_history(
        actor=actor,
        employee_id=employee_id,
        status=status,
        cursor=cursor,
        limit=limit,
        request_id=request_id,
        ip=ip,
    )
    return LeaveRequestPage(
        items=[LeaveRequestResponse.model_validate(item) for item in items],
        page=PageInfo(next_cursor=next_cursor),
    )


@router.get(
    "/{employee_id}/leave-balance",
    operation_id="get_leave_balance",
    response_model=LeaveBalanceResponse,
    responses=problem_responses,
)
def get_leave_balance(
    employee_id: str,
    actor: Annotated[Actor, Depends(get_current_actor)],
    service: Annotated[EmployeeService, Depends(get_employee_service)],
    request_id: Annotated[str, Depends(get_request_id)],
    ip: Annotated[str | None, Depends(get_ip)],
) -> LeaveBalanceResponse:
    balance = service.get_leave_balance(
        actor=actor,
        employee_id=employee_id,
        year=today_istanbul().year,
        request_id=request_id,
        ip=ip,
    )
    return LeaveBalanceResponse.model_validate(balance)
