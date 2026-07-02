from datetime import timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Response

from origin_ms.api.deps import get_auth_service, get_current_actor, get_ip, get_request_id
from origin_ms.core.config import get_settings
from origin_ms.core.security import create_token
from origin_ms.domain.entities import Actor
from origin_ms.schemas.auth import CurrentUserResponse, LoginRequest, LoginResponse
from origin_ms.schemas.errors import ProblemDetail
from origin_ms.services.auth_service import AuthService

router = APIRouter(tags=["auth"])

problem_responses: dict[int | str, dict[str, Any]] = {
    401: {"model": ProblemDetail, "description": "Unauthorized."},
    422: {"model": ProblemDetail, "description": "Validation failed."},
}


@router.post(
    "/auth/login",
    operation_id="login",
    response_model=LoginResponse,
    responses=problem_responses,
)
def login(
    body: LoginRequest,
    response: Response,
    service: Annotated[AuthService, Depends(get_auth_service)],
    request_id: Annotated[str, Depends(get_request_id)],
    ip: Annotated[str | None, Depends(get_ip)],
) -> LoginResponse:
    settings = get_settings()
    access_token = service.login(
        email=str(body.email),
        password=body.password,
        request_id=request_id,
        ip=ip,
    )
    refresh_token = create_token(
        subject=f"refresh:{body.email}",
        secret=settings.jwt_secret,
        expires_delta=timedelta(days=settings.refresh_token_days),
    )
    response.set_cookie(
        "refresh_token",
        refresh_token,
        httponly=True,
        samesite="lax",
        max_age=settings.refresh_token_days * 24 * 60 * 60,
    )
    return LoginResponse(access_token=access_token)


@router.get(
    "/me",
    operation_id="get_current_user",
    response_model=CurrentUserResponse,
    responses=problem_responses,
)
def get_current_user(
    actor: Annotated[Actor, Depends(get_current_actor)],
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> CurrentUserResponse:
    user = service.get_user(actor.actor_id)
    return CurrentUserResponse(
        id=actor.actor_id,
        email=user.email,
        role=actor.role,
        employee_id=actor.employee_id,
    )
