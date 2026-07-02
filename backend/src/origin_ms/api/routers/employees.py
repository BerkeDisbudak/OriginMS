from typing import Annotated, Any

from fastapi import APIRouter, Depends

from origin_ms.api.deps import (
    get_current_actor,
    get_employee_service,
    get_ip,
    get_request_id,
)
from origin_ms.core.time import today_istanbul
from origin_ms.domain.entities import Actor
from origin_ms.schemas.employees import EmployeeResponse
from origin_ms.schemas.errors import ProblemDetail
from origin_ms.schemas.leave import LeaveBalanceResponse
from origin_ms.services.employee_service import EmployeeService

router = APIRouter(prefix="/employees", tags=["employees"])

problem_responses: dict[int | str, dict[str, Any]] = {
    401: {"model": ProblemDetail, "description": "Unauthorized."},
    403: {"model": ProblemDetail, "description": "Forbidden."},
    404: {"model": ProblemDetail, "description": "Not found."},
}


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
