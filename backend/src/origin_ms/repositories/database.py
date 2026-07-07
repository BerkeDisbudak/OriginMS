from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from origin_ms.core.config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()
engine = create_async_engine(
    settings.database_url,
    future=True,
    # Defensive: PgBouncer's Session mode doesn't need this (each client
    # gets a real dedicated server connection), but Transaction mode does --
    # protects against prepared-statement conflicts if this pooler ever
    # behaves like transaction mode under load. Harmless either way.
    connect_args={"statement_cache_size": 0},
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session
