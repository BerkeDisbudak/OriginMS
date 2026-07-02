from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query

from origin_ms.api.deps import get_current_actor, get_ip, get_leave_service, get_request_id
from origin_ms.domain.entities import Actor
from origin_ms.domain.enums import LeaveStatus
from origin_ms.schemas.common import PageInfo
from origin_ms.schemas.errors import ProblemDetail
from origin_ms.schemas.leave import (
    LeaveRequestCreate,
    LeaveRequestPage,
    LeaveRequestResponse,
    RejectLeaveRequestBody,
)
from origin_ms.services.leave_service import LeaveService

router = APIRouter(prefix="/leave-requests", tags=["leave_requests"])

problem_responses: dict[int | str, dict[str, Any]] = {
    401: {"model": ProblemDetail, "description": "Unauthorized."},
    403: {"model": ProblemDetail, "description": "Forbidden."},
    404: {"model": ProblemDetail, "description": "Not found."},
    409: {"model": ProblemDetail, "description": "Transition conflict."},
    422: {"model": ProblemDetail, "description": "Validation failed."},
}


@router.post(
    "",
    operation_id="create_leave_request",
    response_model=LeaveRequestResponse,
    responses=problem_responses,
)
def create_leave_request(
    body: LeaveRequestCreate,
    actor: Annotated[Actor, Depends(get_current_actor)],
    service: Annotated[LeaveService, Depends(get_leave_service)],
    request_id: Annotated[str, Depends(get_request_id)],
    ip: Annotated[str | None, Depends(get_ip)],
) -> LeaveRequestResponse:
    request = service.create_leave_request(
        actor=actor,
        employee_id=body.employee_id,
        leave_type=body.type,
        start_date=body.start_date,
        end_date=body.end_date,
        note=body.note,
        request_id=request_id,
        ip=ip,
    )
    return LeaveRequestResponse.model_validate(request)


@router.get(
    "",
    operation_id="list_leave_requests",
    response_model=LeaveRequestPage,
    responses=problem_responses,
)
def list_leave_requests(
    actor: Annotated[Actor, Depends(get_current_actor)],
    service: Annotated[LeaveService, Depends(get_leave_service)],
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
    items, next_cursor = service.list_leave_requests(
        actor=actor,
        status=status,
        cursor=cursor,
        limit=limit,
    )
    return LeaveRequestPage(
        items=[LeaveRequestResponse.model_validate(item) for item in items],
        page=PageInfo(next_cursor=next_cursor),
    )


@router.get(
    "/{leave_request_id}",
    operation_id="get_leave_request",
    response_model=LeaveRequestResponse,
    responses=problem_responses,
)
def get_leave_request(
    leave_request_id: str,
    actor: Annotated[Actor, Depends(get_current_actor)],
    service: Annotated[LeaveService, Depends(get_leave_service)],
) -> LeaveRequestResponse:
    return LeaveRequestResponse.model_validate(
        service.get_leave_request(actor=actor, leave_request_id=leave_request_id)
    )


@router.post(
    "/{leave_request_id}/approve",
    operation_id="approve_leave_request",
    response_model=LeaveRequestResponse,
    responses=problem_responses,
)
def approve_leave_request(
    leave_request_id: str,
    actor: Annotated[Actor, Depends(get_current_actor)],
    service: Annotated[LeaveService, Depends(get_leave_service)],
    request_id: Annotated[str, Depends(get_request_id)],
    ip: Annotated[str | None, Depends(get_ip)],
) -> LeaveRequestResponse:
    return LeaveRequestResponse.model_validate(
        service.approve_leave_request(
            actor=actor,
            leave_request_id=leave_request_id,
            request_id=request_id,
            ip=ip,
        )
    )


@router.post(
    "/{leave_request_id}/reject",
    operation_id="reject_leave_request",
    response_model=LeaveRequestResponse,
    responses=problem_responses,
)
def reject_leave_request(
    leave_request_id: str,
    body: RejectLeaveRequestBody,
    actor: Annotated[Actor, Depends(get_current_actor)],
    service: Annotated[LeaveService, Depends(get_leave_service)],
    request_id: Annotated[str, Depends(get_request_id)],
    ip: Annotated[str | None, Depends(get_ip)],
) -> LeaveRequestResponse:
    return LeaveRequestResponse.model_validate(
        service.reject_leave_request(
            actor=actor,
            leave_request_id=leave_request_id,
            reason=body.reason,
            request_id=request_id,
            ip=ip,
        )
    )


@router.post(
    "/{leave_request_id}/cancel",
    operation_id="cancel_leave_request",
    response_model=LeaveRequestResponse,
    responses=problem_responses,
)
def cancel_leave_request(
    leave_request_id: str,
    actor: Annotated[Actor, Depends(get_current_actor)],
    service: Annotated[LeaveService, Depends(get_leave_service)],
    request_id: Annotated[str, Depends(get_request_id)],
    ip: Annotated[str | None, Depends(get_ip)],
) -> LeaveRequestResponse:
    return LeaveRequestResponse.model_validate(
        service.cancel_leave_request(
            actor=actor,
            leave_request_id=leave_request_id,
            request_id=request_id,
            ip=ip,
        )
    )
