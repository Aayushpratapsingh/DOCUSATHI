# DocuSathi AI

Nepali-English document intelligence MVP. The app includes a bilingual React interface, FastAPI API, PostgreSQL/pgvector schema, PDF/DOCX extraction, chunking, embedding, hybrid retrieval, evidence-grounded Gemini answers, and a persistent study space for notes, bookmarks, pinned chats, and starred chats.

The public landing page is available at `/`; sign-in and account creation are available at `/login` and `/signup`. Signed-in users are redirected to their workspace. The Study space can generate, save, resume, and regenerate document-grounded quizzes and flashcards in English or Nepali. Quiz settings include chapter, page range, difficulty, question type, and item count; generated prompts and answers retain page references from their source passages.

## Supabase setup

1. Create a Supabase project. In Storage, create a **private** bucket named `documents`.
2. Copy `.env.example` to `.env`. Set `DATABASE_URL` to the Supabase Session pooler connection string and `DIRECT_DATABASE_URL` to the same Session pooler connection (Alembic uses this setting). The URLs may include `sslmode=require`; the asyncpg engine enforces TLS using its `ssl=require` driver option. URL-encode reserved characters in the database password. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are backend-only values; never add them to frontend variables.
3. Set a strong `JWT_SECRET`. Set `GEMINI_API_KEY` to enable generated answers, quizzes, and flashcards; without it, `/api/documents/{id}/ask` returns retrieved evidence and a setup message, and study generation reports that AI is not configured.
4. Start the backend from the repository root:

   ```sh
   python3 -m venv backend/.venv
   source backend/.venv/bin/activate
   python -m pip install --upgrade pip
   pip install torch --index-url https://download.pytorch.org/whl/cpu
   pip install -r backend/requirements.txt
   uvicorn app.main:app --app-dir backend --reload
   ```

   The API applies Alembic migrations at startup using `DIRECT_DATABASE_URL`; the FastAPI connection pool uses `DATABASE_URL`. On first document ingestion, the `BAAI/bge-m3` embedding model downloads about 2 GB. It is cached locally for subsequent runs.
5. In a separate terminal, start the frontend:

   ```sh
   cd frontend
   npm install
   npm run dev

   ```

   Open http://localhost:5173. The API docs are at http://localhost:8000/docs.

The first Alembic revision creates `vector` before creating the existing model tables, including the 1024-dimensional embedding column and HNSW index. If the target database already has this schema but has no `alembic_version` table, first verify that it matches the current models and run `alembic -c backend/alembic.ini stamp head` from the repository root; otherwise startup will refuse to create a second baseline. This setup does not copy data from a previous local PostgreSQL database.

Uploads are stored privately at `{user_id}/{document_id}/{filename}`. Document ingestion downloads the object to a temporary directory and removes that temporary file after indexing. An authenticated `GET /api/documents/{document_id}/signed-url` endpoint returns a URL valid for five minutes; the current frontend does not request or display PDF files.

## Verify database and storage

Check the database connection:

```sh
curl -i http://localhost:8000/health
```

The endpoint returns HTTP 200 with `{"status":"ok","database":"connected"}` when the database is reachable and HTTP 503 with a clear error otherwise.

After signing in, set `TOKEN` in your shell to the returned access token and upload a PDF or DOCX:

```sh
UPLOAD=$(curl -fsS -X POST http://localhost:8000/api/documents \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/sample.pdf")
DOC_ID=$(printf '%s' "$UPLOAD" | jq -r '.id')
```

Confirm the returned document reaches `processing_status: "ready"` using `GET /api/documents`, then delete it:

```sh
curl -i -X DELETE "http://localhost:8000/api/documents/$DOC_ID" \
  -H "Authorization: Bearer $TOKEN"
```

The delete endpoint returns HTTP 204 after removing the private Storage object and the document row; the existing database cascades remove its chunks and related records. Storage failures return an explicit HTTP error and do not silently report success.

The Notes & Bookmarks area is available from workspace navigation; saved items and chat preferences are scoped to the signed-in account and stored in PostgreSQL.
