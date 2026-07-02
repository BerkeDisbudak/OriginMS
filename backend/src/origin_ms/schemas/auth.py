from pydantic import BaseModel, ConfigDict, Field

from origin_ms.domain.enums import Role


class LoginRequest(BaseModel):
    email: str = Field(description="Demo user email.")
    password: str = Field(min_length=1, description="Plaintext password submitted over TLS.")


class LoginResponse(BaseModel):
    access_token: str = Field(description="Bearer access token.")
    token_type: str = Field(default="bearer", description="Token type.")


class CurrentUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(description="User id.")
    email: str = Field(description="User email.")
    role: Role = Field(description="Resolved RBAC role.")
    employee_id: str | None = Field(default=None, description="Linked employee id, if any.")
