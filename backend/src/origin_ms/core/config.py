from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Absolute path to backend/.env -- a relative ".env" resolves against the
# process's cwd, which differs depending on how the app is launched (e.g.
# `uv run --project backend ...` from the repo root vs. from within
# backend/), so this must not depend on invocation location.
_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


DEFAULT_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/origin_ms"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="ORIGIN_MS_", env_file=_ENV_FILE)

    api_prefix: str = "/api/v1"
    jwt_secret: str = "phase2a-development-secret"
    access_token_minutes: int = 15
    refresh_token_days: int = 7
    database_url: str = DEFAULT_DATABASE_URL


@lru_cache
def get_settings() -> Settings:
    return Settings()


def uses_real_database(settings: Settings) -> bool:
    """True once ORIGIN_MS_DATABASE_URL has been overridden (via real env var
    or backend/.env) away from the unreachable local-Postgres placeholder
    default -- this, not raw os.environ, is the single source of truth for
    which UnitOfWork get_uow() selects."""
    return settings.database_url != DEFAULT_DATABASE_URL
