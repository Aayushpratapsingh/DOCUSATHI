import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from time import perf_counter

from alembic import command
from alembic.config import Config
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api.routes import router
from app.db.session import engine, study_space_db_metrics

logger = logging.getLogger(__name__)


def upgrade_database() -> None:
    alembic_config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    command.upgrade(alembic_config, "head")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await asyncio.to_thread(upgrade_database)
    except Exception as exc:
        logger.error("Database migration startup failed (error_type=%s)", type(exc).__name__)
        raise RuntimeError("Database migrations failed. Check database connectivity and migration state.") from None
    yield
    await engine.dispose()


app = FastAPI(title="DocIntel API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)


@app.middleware("http")
async def log_study_space_timings(request: Request, call_next):
    if request.url.path not in {"/api/notes", "/api/bookmarks"} and not request.url.path.startswith(("/api/notes/", "/api/bookmarks/")):
        return await call_next(request)
    metrics: dict[str, float | int] = {"db_ms": 0, "db_statements": 0}
    token = study_space_db_metrics.set(metrics)
    started_at = perf_counter()
    status_code = 500
    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    finally:
        route = request.scope.get("route")
        route_path = getattr(route, "path", request.url.path)
        logger.info(
            "study_space_timing method=%s route=%s status=%s total_ms=%.1f db_ms=%.1f db_statements=%d",
            request.method,
            route_path,
            status_code,
            (perf_counter() - started_at) * 1000,
            metrics["db_ms"],
            metrics["db_statements"],
        )
        study_space_db_metrics.reset(token)


@app.get("/health")
async def health():
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        logger.error("Database health check failed (error_type=%s)", type(exc).__name__)
        raise HTTPException(status_code=503, detail="Database connection failed") from None
    return {"status": "ok", "database": "connected"}
