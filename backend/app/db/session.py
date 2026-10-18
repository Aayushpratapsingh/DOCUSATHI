import logging
from contextvars import ContextVar
from time import perf_counter

from fastapi import HTTPException
from sqlalchemy import event
from sqlalchemy.engine import URL, make_url
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session
from app.core.config import settings

logger = logging.getLogger(__name__)
study_space_db_metrics: ContextVar[dict[str, float | int] | None] = ContextVar(
    "study_space_db_metrics", default=None
)


def async_database_url(value: str) -> URL:
    url = make_url(value)
    if url.drivername in {"postgres", "postgresql"}:
        url = url.set(drivername="postgresql+asyncpg")
    query = dict(url.query)
    query.pop("sslmode", None)
    query.pop("ssl", None)
    return url.set(query=query)


engine = create_async_engine(
    async_database_url(settings.database_url),
    pool_pre_ping=True,
    connect_args={"ssl": "require", "statement_cache_size": 0},
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


@event.listens_for(engine.sync_engine, "before_cursor_execute")
def start_study_space_query_timer(connection, cursor, statement, parameters, context, executemany):
    if study_space_db_metrics.get() is not None:
        context._study_space_query_started_at = perf_counter()


@event.listens_for(engine.sync_engine, "after_cursor_execute")
def finish_study_space_query_timer(connection, cursor, statement, parameters, context, executemany):
    metrics = study_space_db_metrics.get()
    started_at = getattr(context, "_study_space_query_started_at", None)
    if metrics is not None and started_at is not None:
        metrics["db_ms"] = metrics.get("db_ms", 0) + (perf_counter() - started_at) * 1000
        metrics["db_statements"] = metrics.get("db_statements", 0) + 1


@event.listens_for(Session, "before_commit")
def start_study_space_commit_timer(session):
    metrics = study_space_db_metrics.get()
    if metrics is not None:
        metrics["_commit_started_at"] = perf_counter()


@event.listens_for(Session, "after_commit")
def finish_study_space_commit_timer(session):
    metrics = study_space_db_metrics.get()
    if metrics is not None:
        started_at = metrics.pop("_commit_started_at", None)
        if started_at is not None:
            metrics["db_ms"] = metrics.get("db_ms", 0) + (perf_counter() - started_at) * 1000


async def get_db():
    try:
        async with SessionLocal() as session:
            yield session
    except SQLAlchemyError as exc:
        logger.error("Database request failed (error_type=%s)", type(exc).__name__)
        raise HTTPException(status_code=503, detail="Database connection failed") from None
