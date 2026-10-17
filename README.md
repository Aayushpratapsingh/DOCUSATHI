# DocuSathi AI

Nepali-English document intelligence MVP. The initial slice includes a bilingual React interface, FastAPI API, PostgreSQL/pgvector schema, PDF/DOCX extraction, chunking, embedding, hybrid retrieval, and evidence-grounded Gemini answers.

## Start locally

1. Copy `.env.example` to `.env` and set a `JWT_SECRET`. Set `GEMINI_API_KEY` to enable generated answers; without it, `/api/documents/{id}/ask` returns retrieved evidence and a setup message.
2. Run `docker compose up --build`.
3. Open http://localhost:5173.

The API docs are at http://localhost:8000/docs. The first version uses a demo local user so the document flow can be explored. Before multi-user deployment, replace demo auth with registration/login and enforce ownership on every document operation.

