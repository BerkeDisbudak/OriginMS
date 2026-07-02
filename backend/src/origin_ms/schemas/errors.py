from pydantic import BaseModel, Field


class ProblemFieldError(BaseModel):
    field: str = Field(description="Field path associated with the validation or policy error.")
    code: str = Field(description="Stable machine-readable error code.")
    message: str = Field(description="Human-readable English error message.")


def default_problem_errors() -> list[ProblemFieldError]:
    return []


class ProblemDetail(BaseModel):
    type: str = Field(default="about:blank", description="RFC 9457 problem type URI.")
    title: str = Field(description="Short problem title.")
    status: int = Field(description="HTTP status code.")
    detail: str = Field(description="Human-readable problem detail.")
    errors: list[ProblemFieldError] = Field(
        default_factory=default_problem_errors, description="Field-level errors."
    )
