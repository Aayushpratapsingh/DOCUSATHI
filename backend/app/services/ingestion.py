from pathlib import Path
import asyncio
from functools import lru_cache
import fitz
from docx import Document as DocxDocument
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.entities import Chunk, Document

# Keep page provenance through splitting so citations can jump to the source page.
def extract_pages(path: Path, suffix: str) -> list[tuple[int | None, str]]:
    if suffix == ".pdf":
        with fitz.open(path) as pdf:
            pages = []
            for index, page in enumerate(pdf):
                text = page.get_text("text").strip()
                # Scanned PDFs have no text layer. OCR only those pages so text PDFs
                # keep the fast native extraction path.
                if not text and page.get_images():
                    text = page.get_textpage_ocr(language="eng+nep", dpi=150).extractText().strip()
                pages.append((index + 1, text))
            return pages
    doc = DocxDocument(path)
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    return [(None, "\n".join(paragraphs))]

def split_text(text: str, size: int = 1100, overlap: int = 160) -> list[str]:
    text = " ".join(text.split())
    out, start = [], 0
    while start < len(text):
        end = min(start + size, len(text))
        if end < len(text):
            boundary = text.rfind(" ", start + size // 2, end)
            if boundary > start:
                end = boundary
        part = text[start:end].strip()
        if part: out.append(part)
        if end >= len(text): break
        start = max(end - overlap, start + 1)
    return out

@lru_cache(maxsize=1)
def embedding_model():
    from sentence_transformers import SentenceTransformer
    return SentenceTransformer("BAAI/bge-m3")

def embed_texts(texts: list[str]) -> list[list[float]]:
    return embedding_model().encode(texts, normalize_embeddings=True).tolist()

async def index_document(db: AsyncSession, document: Document, path: Path, suffix: str):
    try:
        if not path.is_file():
            raise FileNotFoundError("The stored upload is missing")
        pages = await asyncio.to_thread(extract_pages, path, suffix)
        all_text = [chunk for _, text in pages for chunk in split_text(text)]
        if not all_text:
            raise ValueError("No text could be extracted. The PDF may be blank or unreadable.")
        vectors = await asyncio.to_thread(embed_texts, all_text) if all_text else []
        rows, i = [], 0
        for page_number, text in pages:
            for part in split_text(text):
                rows.append(Chunk(document_id=document.id, chunk_text=part, page_number=page_number, chunk_index=i, embedding=vectors[i]))
                i += 1
        db.add_all(rows)
        document.page_count = sum(1 for _, text in pages if text)
        document.processing_status = "ready" if rows else "failed"
        await db.commit()
    except Exception:
        await db.rollback()
        document.processing_status = "failed"
        await db.commit()
        raise
