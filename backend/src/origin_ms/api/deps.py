from typing import Annotated, cast

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from origin_ms.core.config import Settings, get_settings
from origin_ms.core.security import decode_token
from origin_ms.domain.entities import Actor
from origin_ms.domain.errors import DomainError
from origin_ms.services.auth_service import AuthService, actor_from_user
from origin_ms.services.employee_service import EmployeeService
from origin_ms.services.leave_service import LeaveService
from origin_ms.services.unit_of_work import UnitOfWork

bearer = HTTPBearer(auto_error=False)


def get_uow(request: Request) -> UnitOfWork:
    return cast(UnitOfWork, request.app.state.uow)


def get_request_id(request: Request) -> str:
    return cast(str, request.state.request_id)


def get_ip(request: Request) -> str | None:
    if request.client is None:
        return None
    return request.client.host


def get_auth_service(
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthService:
    return AuthService(uow, settings)


def get_employee_service(uow: Annotated[UnitOfWork, Depends(get_uow)]) -> EmployeeService:
    return EmployeeService(uow)


def get_leave_service(uow: Annotated[UnitOfWork, Depends(get_uow)]) -> LeaveService:
    return LeaveService(uow)


def get_current_actor(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    service: Annotated[AuthService, Depends(get_auth_service)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> Actor:
    if credentials is None:
        raise DomainError(detail="Authentication required.", status_code=401, title="Unauthorized")
    user_id = decode_token(credentials.credentials, secret=settings.jwt_secret)
    return actor_from_user(service.get_user(user_id))
