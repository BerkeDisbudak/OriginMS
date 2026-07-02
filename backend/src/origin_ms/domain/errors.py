from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class FieldError:
    field: str
    code: str
    message: str


class DomainError(Exception):
    def __init__(
        self,
        *,
        detail: str,
        errors: list[FieldError] | None = None,
        status_code: int = 400,
        title: str = "Request invalid",
    ) -> None:
        super().__init__(detail)
        self.detail = detail
        self.errors = errors or []
        self.status_code = status_code
        self.title = title

    def to_problem(self) -> dict[str, Any]:
        return {
            "type": "about:blank",
            "title": self.title,
            "status": self.status_code,
            "detail": self.detail,
            "errors": [
                {"field": error.field, "code": error.code, "message": error.message}
                for error in self.errors
            ],
        }


def field_error(field: str, code: str, message: str) -> FieldError:
    return FieldError(field=field, code=code, message=message)
