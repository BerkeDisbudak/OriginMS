from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, Response

from origin_ms.api.errors import install_error_handlers
from origin_ms.api.routers import auth, employees, leave_requests
from origin_ms.core.config import get_settings
from origin_ms.core.ids import new_id
from origin_ms.services.unit_of_work import InMemoryUnitOfWork, build_demo_uow


async def request_id_middleware(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    request_id = request.headers.get("x-request-id", new_id("req"))
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["x-request-id"] = request_id
    return response


def create_app(uow: InMemoryUnitOfWork | None = None) -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Origin FGL HRMS Backend",
        version="2.0.0",
        description="Phase 2a backend contract for Approval Inbox.",
    )
    app.state.uow = uow or build_demo_uow()
    # An explicit `uow` (every test, via conftest.py's fixture) always wins
    # and always means in-memory, regardless of ORIGIN_MS_DATABASE_URL --
    # get_uow() only consults settings when create_app() is called bare, the
    # way the real `app = create_app()` below (what uvicorn actually serves)
    # does.
    app.state.uses_explicit_uow = uow is not None

    app.middleware("http")(request_id_middleware)
    install_error_handlers(app)
    app.include_router(auth.router, prefix=settings.api_prefix)
    app.include_router(employees.router, prefix=settings.api_prefix)
    app.include_router(leave_requests.router, prefix=settings.api_prefix)
    return app


app = create_app()
