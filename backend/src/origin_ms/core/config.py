from functools import lru_cache

from pydantic import BaseModel


class Settings(BaseModel):
    api_prefix: str = "/api/v1"
    jwt_secret: str = "phase2a-development-secret"
    access_token_minutes: int = 15
    refresh_token_days: int = 7
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/origin_ms"


@lru_cache
def get_settings() -> Settings:
    return Settings()
