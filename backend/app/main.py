from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.api.routes import router
from app.db.session import engine
from app.models.entities import Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as connection:
        await connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await connection.run_sync(Base.metadata.create_all)
        await connection.execute(text("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS translated_content TEXT"))
        await connection.execute(text("CREATE INDEX IF NOT EXISTS ix_chunks_embedding_hnsw ON document_chunks USING hnsw (embedding vector_cosine_ops)"))
        await connection.execute(text("CREATE INDEX IF NOT EXISTS ix_chunks_fts ON document_chunks USING gin (to_tsvector('simple', chunk_text))"))
    yield
    await engine.dispose()

app = FastAPI(title="DocIntel API", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(router)
@app.get("/health")
async def health(): return {"status": "ok"}
