from pydantic import BaseModel, Field


class PageInfo(BaseModel):
    next_cursor: str | None = Field(
        default=None, description="Cursor for the next page, if present."
    )


class HealthResponse(BaseModel):
    status: str = Field(description="Backend health status.")
