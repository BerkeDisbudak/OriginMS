from typing import Any, cast

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from origin_ms.domain.errors import DomainError

PROBLEM_JSON = "application/problem+json"


async def domain_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, DomainError):
        raise exc
    return JSONResponse(exc.to_problem(), status_code=exc.status_code, media_type=PROBLEM_JSON)


async def validation_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, RequestValidationError):
        raise exc
    errors: list[dict[str, str]] = []
    for raw_error in exc.errors():
        error = cast(dict[str, Any], raw_error)
        loc = cast(tuple[object, ...], error.get("loc", ()))
        location = ".".join(str(part) for part in loc if part != "body")
        errors.append(
            {
                "field": location or "body",
                "code": str(error.get("type", "validation_error")),
                "message": str(error.get("msg", "Request validation failed.")),
            }
        )
    return JSONResponse(
        {
            "type": "about:blank",
            "title": "Validation failed",
            "status": 422,
            "detail": "Request validation failed.",
            "errors": errors,
        },
        status_code=422,
        media_type=PROBLEM_JSON,
    )


def install_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(DomainError, domain_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
