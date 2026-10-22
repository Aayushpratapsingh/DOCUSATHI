import asyncio
import hashlib
import json
import logging
from pathlib import Path, PurePosixPath
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from uuid import uuid4
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy import delete as sql_delete, exists, func, literal, select, update as sql_update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.auth import current_user, hash_password, make_token, verify_password
from app.core.config import settings
from app.db.session import SessionLocal, get_db
from app.models.entities import Bookmark, ChatMessage, Chunk, Conversation, Document, StudyNote, StudySet, User
from app.schemas.api import AskIn, AskOut, BookmarkCreateIn, BookmarkOut, ChatMessageOut, ConversationPreferencesIn, DocumentOut, DocumentRenameIn, LoginIn, NoteCreateIn, NoteOut, NoteUpdateIn, ProfileUpdateIn, RecentChatOut, RegisterIn, SignedDocumentUrlOut, SourceOut, StudyChapterOut, StudyGenerateIn, StudyOptionsOut, StudyProgressIn, StudySetOut, TokenOut, TranslateIn, TranslateOut, UserOut
from app.services.ingestion import index_document
from app.services.answering import answer, retrieve, translate_to_nepali
from app.services.storage import StorageError, create_signed_url, delete_object, download_object, upload_object
from app.services.study_tools import find_chapters, generate_study_items, normalize_study_answer, select_chapter_bounds

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)


async def load_study_chunks(db: AsyncSession, document_id: int) -> list[SimpleNamespace]:
    rows = (
        await db.execute(
            select(Chunk.id, Chunk.chunk_index, Chunk.page_number, Chunk.chunk_text)
            .where(Chunk.document_id == document_id)
            .order_by(Chunk.chunk_index)
            .limit(3000)
        )
    ).all()
    return [
        SimpleNamespace(id=row.id, chunk_index=row.chunk_index, page_number=row.page_number, chunk_text=row.chunk_text)
        for row in rows
    ]

@router.post("/auth/register", response_model=TokenOut)
async def register(body: RegisterIn, db: AsyncSession = Depends(get_db)):
    if len(body.password) < 10: raise HTTPException(400, "Use a password with at least 10 characters")
    existing = await db.scalar(select(User).where(User.email == body.email.lower()))
    if existing: raise HTTPException(409, "An account with this email already exists")
    user = User(name=body.name.strip(), email=body.email.lower(), password_hash=hash_password(body.password))
    db.add(user); await db.commit(); await db.refresh(user)
    return TokenOut(access_token=make_token(user.id))

# @router.post("/auth/login", response_model=TokenOut)
# async def login(body: LoginIn, db: AsyncSession = Depends(get_db)):
#     user = await db.scalar(select(User).where(User.email == body.email.lower()))
#     if not user or not verify_password(body.password, user.password_hash): raise HTTPException(401, "Email or password is incorrect")
#     return TokenOut(access_token=make_token(user.id))
import logging

logger = logging.getLogger(__name__)

@router.post("/auth/login", response_model=TokenOut)
async def login(body: LoginIn, db: AsyncSession = Depends(get_db)):
    try:
        email = body.email.strip().lower()

        user = await db.scalar(
            select(User).where(User.email == email)
        )

        if not user:
            raise HTTPException(
                status_code=401,
                detail="Email or password is incorrect",
            )

        if not verify_password(body.password, user.password_hash):
            raise HTTPException(
                status_code=401,
                detail="Email or password is incorrect",
            )

        return TokenOut(access_token=make_token(user.id))

    except HTTPException:
        raise
    except Exception:
        logger.exception("Unexpected error in /auth/login")
        raise HTTPException(
            status_code=500,
            detail="Internal server error during login",
        )

@router.get("/auth/me", response_model=UserOut)
async def me(user: User = Depends(current_user)): return user

@router.patch("/auth/me", response_model=UserOut)
async def update_me(body: ProfileUpdateIn, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    name = body.name.strip()
    if not name:
        raise HTTPException(422, "Name cannot be empty")
    email = str(body.email).lower()
    existing = await db.scalar(select(User).where(User.email == email, User.id != user.id))
    if existing:
        raise HTTPException(409, "An account with this email already exists")
    user.name = name
    user.email = email
    await db.commit()
    await db.refresh(user)
    return user

async def process_in_background(document_id: int, storage_path: str, suffix: str, content: bytes | None = None):
    async with SessionLocal() as db:
        document = await db.get(Document, document_id)
        if document is None:
            return
        try:
            if content is None:
                content = await asyncio.to_thread(download_object, storage_path)
            with TemporaryDirectory() as directory:
                path = Path(directory) / f"source{suffix}"
                path.write_bytes(content)
                await index_document(db, document, path, suffix)
        except Exception as exc:
            await db.rollback()
            document = await db.get(Document, document_id)
            if document is not None:
                document.processing_status = "failed"
                await db.commit()
            logger.error(
                "Document indexing failed (document_id=%s, error_type=%s)",
                document_id,
                type(exc).__name__,
            )

@router.get("/documents", response_model=list[DocumentOut])
async def list_documents(db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    return list((await db.scalars(select(Document).where(Document.user_id == user.id).order_by(Document.uploaded_at.desc()))).all())

@router.get("/conversations/recent", response_model=list[RecentChatOut])
async def recent_conversations(db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    latest_message = select(ChatMessage.content).where(
        ChatMessage.conversation_id == Conversation.id,
        ChatMessage.role == "user",
    ).order_by(ChatMessage.id.desc()).limit(1).correlate(Conversation).scalar_subquery()
    rows = (await db.execute(
        select(Document.id, Document.filename, latest_message, func.max(ChatMessage.created_at), Conversation.is_pinned, Conversation.is_starred)
        .join(Conversation, Conversation.document_id == Document.id)
        .join(ChatMessage, ChatMessage.conversation_id == Conversation.id)
        .where(Conversation.user_id == user.id)
        .group_by(Conversation.id, Document.id, Document.filename, Conversation.is_pinned, Conversation.is_starred)
        .order_by(Conversation.is_pinned.desc(), Conversation.is_starred.desc(), func.max(ChatMessage.created_at).desc())
    )).all()
    return [RecentChatOut(document_id=row[0], filename=row[1], last_message=row[2], updated_at=row[3], is_pinned=row[4], is_starred=row[5]) for row in rows]

@router.patch("/conversations/{document_id}/preferences", response_model=RecentChatOut)
async def update_conversation_preferences(document_id: int, body: ConversationPreferencesIn, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    conversation = await db.scalar(select(Conversation).where(Conversation.user_id == user.id, Conversation.document_id == document_id))
    if conversation is None:
        raise HTTPException(404, "Conversation not found")
    changes = {key: value for key, value in body.model_dump(exclude_unset=True).items() if value is not None}
    if not changes:
        raise HTTPException(422, "Choose a conversation preference to update")
    for key, value in changes.items():
        setattr(conversation, key, value)
    await db.commit()
    latest_message = await db.scalar(select(ChatMessage.content).where(ChatMessage.conversation_id == conversation.id, ChatMessage.role == "user").order_by(ChatMessage.id.desc()).limit(1))
    latest_at = await db.scalar(select(func.max(ChatMessage.created_at)).where(ChatMessage.conversation_id == conversation.id))
    document = await db.get(Document, document_id)
    return RecentChatOut(document_id=document_id, filename=document.filename, last_message=latest_message or "", updated_at=latest_at or conversation.created_at, is_pinned=conversation.is_pinned, is_starred=conversation.is_starred)

@router.post("/documents", response_model=DocumentOut, status_code=202)
async def upload_document(background: BackgroundTasks, file: UploadFile = File(...), db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".pdf", ".docx"}: raise HTTPException(415, "Upload a PDF or DOCX document")
    content = await file.read(settings.max_upload_mb * 1024 * 1024 + 1)
    if not content: raise HTTPException(400, "This file is empty")
    if len(content) > settings.max_upload_mb * 1024 * 1024: raise HTTPException(413, f"File must be smaller than {settings.max_upload_mb} MB")
    if suffix == ".pdf" and not content.startswith(b"%PDF-"): raise HTTPException(400, "This file does not appear to be a valid PDF")
    if suffix == ".docx" and not content.startswith(b"PK"): raise HTTPException(400, "This file does not appear to be a valid DOCX")
    filename = PurePosixPath((file.filename or "").replace("\\", "/")).name
    if not filename:
        filename = f"{uuid4().hex}{suffix}"
    doc = Document(user_id=user.id, filename=filename, file_type=suffix[1:], storage_path="", processing_status="processing")
    db.add(doc)
    await db.flush()
    storage_path = f"{user.id}/{doc.id}/{filename}"
    content_type = "application/pdf" if suffix == ".pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    try:
        await asyncio.to_thread(upload_object, storage_path, content, content_type)
    except StorageError as exc:
        await db.rollback()
        logger.error("Document upload failed (error_type=%s)", type(exc).__name__)
        raise HTTPException(502, "Upload failed while saving the document to private storage. Please retry.") from None
    doc.storage_path = storage_path
    try:
        await db.commit()
    except SQLAlchemyError:
        await db.rollback()
        try:
            await asyncio.to_thread(delete_object, storage_path)
        except StorageError as exc:
            logger.error("Failed upload cleanup (error_type=%s)", type(exc).__name__)
        raise HTTPException(500, "Upload could not be saved to the database. Please retry.") from None
    await db.refresh(doc)
    background.add_task(process_in_background, doc.id, storage_path, suffix)
    return doc

@router.post("/documents/{document_id}/retry", response_model=DocumentOut, status_code=202)
async def retry_document(document_id: int, background: BackgroundTasks, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    doc = await db.scalar(select(Document).where(Document.id == document_id, Document.user_id == user.id))
    if not doc:
        raise HTTPException(404, "Document not found")
    if doc.processing_status == "processing":
        raise HTTPException(409, "Document is already processing")
    try:
        content = await asyncio.to_thread(download_object, doc.storage_path)
    except StorageError as exc:
        logger.error("Document retry failed (error_type=%s)", type(exc).__name__)
        raise HTTPException(502, "The stored document could not be retrieved. Please try again later.") from None
    doc.processing_status = "processing"
    doc.page_count = 0
    await db.commit()
    await db.refresh(doc)
    background.add_task(process_in_background, doc.id, doc.storage_path, f".{doc.file_type.lower()}", content)
    return doc

@router.get("/documents/{document_id}/signed-url", response_model=SignedDocumentUrlOut)
async def get_document_signed_url(document_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    doc = await db.scalar(select(Document).where(Document.id == document_id, Document.user_id == user.id))
    if doc is None:
        raise HTTPException(404, "Document not found")
    expires_in = 300
    try:
        signed_url = await asyncio.to_thread(create_signed_url, doc.storage_path, expires_in)
    except StorageError as exc:
        logger.error("Signed document URL failed (error_type=%s)", type(exc).__name__)
        raise HTTPException(502, "A temporary document URL could not be created. Please try again.") from None
    return SignedDocumentUrlOut(signed_url=signed_url, expires_in=expires_in)

@router.patch("/documents/{document_id}", response_model=DocumentOut)
async def rename_document(document_id: int, body: DocumentRenameIn, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    doc = await db.scalar(select(Document).where(Document.id == document_id, Document.user_id == user.id))
    if not doc: raise HTTPException(404, "Document not found")
    filename = Path(body.filename.strip()).name
    if not filename: raise HTTPException(422, "Name cannot be empty")
    suffix = Path(filename).suffix.lower()
    if suffix != f".{doc.file_type.lower()}":
        raise HTTPException(422, f"Keep the .{doc.file_type} file extension")
    doc.filename = filename
    await db.commit()
    await db.refresh(doc)
    return doc

@router.delete("/documents/{document_id}", status_code=204)
async def delete_document(document_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    doc = await db.scalar(select(Document).where(Document.id == document_id, Document.user_id == user.id))
    if not doc: raise HTTPException(404, "Document not found")
    try:
        content = await asyncio.to_thread(download_object, doc.storage_path)
        await asyncio.to_thread(delete_object, doc.storage_path)
    except StorageError as exc:
        logger.error("Document storage deletion failed (error_type=%s)", type(exc).__name__)
        raise HTTPException(502, "The document file could not be deleted from private storage.") from None
    storage_path = doc.storage_path
    content_type = "application/pdf" if doc.file_type.lower() == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    try:
        await db.delete(doc)
        await db.commit()
    except SQLAlchemyError:
        await db.rollback()
        try:
            await asyncio.to_thread(upload_object, storage_path, content, content_type)
        except StorageError as exc:
            logger.error("Failed to restore document after database deletion error (error_type=%s)", type(exc).__name__)
            raise HTTPException(500, "Document deletion failed and its stored file could not be restored. Contact support.") from None
        raise HTTPException(500, "Document could not be deleted; its file was restored. Please retry.") from None

@router.post("/documents/{document_id}/ask", response_model=AskOut)
async def ask_document(document_id: int, body: AskIn, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    doc = await db.scalar(select(Document).where(Document.id == document_id, Document.user_id == user.id))
    if not doc: raise HTTPException(404, "Document not found")
    if doc.processing_status != "ready": raise HTTPException(409, f"Document is {doc.processing_status}; try again when processing finishes")
    results = await retrieve(db, doc.id, body.question)
    response, sources = await answer(body.question, results)
    source_items = [SourceOut(chunk_id=c.id, page_number=c.page_number, text=c.chunk_text, score=float(score)) for c, score in sources]
    conversation = await db.scalar(select(Conversation).where(Conversation.user_id == user.id, Conversation.document_id == doc.id))
    if conversation is None:
        conversation = Conversation(user_id=user.id, document_id=doc.id)
        db.add(conversation)
        await db.flush()
    db.add_all([
        ChatMessage(conversation_id=conversation.id, role="user", content=body.question, sources=[]),
        ChatMessage(conversation_id=conversation.id, role="assistant", content=response, sources=[item.model_dump() for item in source_items]),
    ])
    await db.commit()
    return AskOut(answer=response, sources=source_items)

@router.get("/documents/{document_id}/messages", response_model=list[ChatMessageOut])
async def list_messages(document_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    doc = await db.scalar(select(Document).where(Document.id == document_id, Document.user_id == user.id))
    if not doc:
        raise HTTPException(404, "Document not found")
    conversation = await db.scalar(select(Conversation).where(Conversation.user_id == user.id, Conversation.document_id == doc.id))
    if conversation is None:
        return []
    return list((await db.scalars(select(ChatMessage).where(ChatMessage.conversation_id == conversation.id).order_by(ChatMessage.id))).all())

@router.get("/documents/{document_id}/study-options", response_model=StudyOptionsOut)
async def study_options(document_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    document = await db.scalar(select(Document).where(Document.id == document_id, Document.user_id == user.id))
    if document is None:
        raise HTTPException(404, "Document not found")
    if document.processing_status != "ready":
        raise HTTPException(409, "Study tools are available when document processing is complete.")
    chunks = await load_study_chunks(db, document_id)
    headings = find_chapters(chunks)
    chapters = []
    for index, heading in enumerate(headings):
        end_index = headings[index + 1]["chunk_index"] if index + 1 < len(headings) else None
        chapter_chunks = [
            chunk for chunk in chunks
            if chunk.chunk_index >= heading["chunk_index"]
            and (end_index is None or chunk.chunk_index < end_index)
        ]
        pages = [chunk.page_number for chunk in chapter_chunks if chunk.page_number]
        chapters.append(
            StudyChapterOut(
                title=heading["title"],
                page_start=min(pages) if pages else None,
                page_end=max(pages) if pages else None,
            )
        )
    return StudyOptionsOut(
        pages=sorted({chunk.page_number for chunk in chunks if chunk.page_number}),
        chapters=chapters,
    )

@router.post("/documents/{document_id}/study-sets", response_model=StudySetOut, status_code=201)
async def generate_study_set(document_id: int, body: StudyGenerateIn, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    document = await db.scalar(select(Document).where(Document.id == document_id, Document.user_id == user.id))
    if document is None:
        raise HTTPException(404, "Document not found")
    if document.processing_status != "ready":
        raise HTTPException(409, "Study tools are available when document processing is complete.")
    if not settings.gemini_api_key:
        raise HTTPException(503, "AI study generation needs GEMINI_API_KEY. Configure it on the backend and retry.")
    if body.page_start is not None and body.page_end is not None and body.page_start > body.page_end:
        raise HTTPException(422, "The start page must not be after the end page.")
    all_chunks = await load_study_chunks(db, document_id)
    chapters = find_chapters(all_chunks)
    try:
        start_index, end_index = select_chapter_bounds(chapters, body.chapter)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from None
    selected_chunks = [
        chunk for chunk in all_chunks
        if chunk.page_number is not None
        and (body.page_start is None or chunk.page_number >= body.page_start)
        and (body.page_end is None or chunk.page_number <= body.page_end)
        and (start_index is None or chunk.chunk_index >= start_index)
        and (end_index is None or chunk.chunk_index <= end_index)
    ]
    if not selected_chunks:
        raise HTTPException(422, "No page-referenced text was found in that chapter or page range.")
    selected_chunks = selected_chunks if len(selected_chunks) <= 100 else selected_chunks[:: max(1, len(selected_chunks) // 100)][:100]
    config = body.model_dump()
    prior_sets = await db.scalars(
        select(StudySet.items)
        .where(
            StudySet.user_id == user.id,
            StudySet.document_id == document.id,
            StudySet.kind == body.kind,
        )
        .order_by(StudySet.updated_at.desc())
        .limit(20)
    )
    excluded = [
        item.get("question", item.get("front", ""))
        for saved_items in prior_sets
        for item in saved_items
    ]
    try:
        items = await generate_study_items(
            kind=body.kind,
            chunks=selected_chunks,
            config=config,
            count=body.count,
            excluded=excluded,
        )
    except ValueError as exc:
        raise HTTPException(502, str(exc)) from None
    except Exception as exc:
        logger.error("Study set generation failed (error_type=%s)", type(exc).__name__)
        raise HTTPException(502, "AI study generation failed. Please try again.") from None
    label = body.chapter or (
        f"Pages {body.page_start or 1}-{body.page_end or document.page_count}"
        if body.page_start is not None or body.page_end is not None
        else document.filename
    )
    title = f"{'Quiz' if body.kind == 'quiz' else 'Flashcards'} · {label}"[:255]
    study_set = StudySet(
        user_id=user.id,
        document_id=document.id,
        kind=body.kind,
        title=title,
        config=config,
        items=items,
        progress={"current_index": 0, "answers": {}, "statuses": {}, "completed": False, "score": 0},
    )
    db.add(study_set)
    await db.commit()
    await db.refresh(study_set)
    return study_set

@router.get("/study-sets", response_model=list[StudySetOut])
async def list_study_sets(db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    return list(
        (
            await db.scalars(
                select(StudySet)
                .where(StudySet.user_id == user.id)
                .order_by(StudySet.updated_at.desc(), StudySet.id.desc())
                .limit(100)
            )
        ).all()
    )

@router.patch("/study-sets/{study_set_id}/progress", response_model=StudySetOut)
async def update_study_progress(study_set_id: int, body: StudyProgressIn, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    study_set = await db.scalar(select(StudySet).where(StudySet.id == study_set_id, StudySet.user_id == user.id))
    if study_set is None:
        raise HTTPException(404, "Study set not found")
    if body.current_index > len(study_set.items) or (
        body.current_index == len(study_set.items) and not body.completed
    ):
        raise HTTPException(422, "The saved position is outside this study set.")
    valid_indices = {str(index) for index in range(len(study_set.items))}
    if not set(body.answers).issubset(valid_indices) or not set(body.statuses).issubset(valid_indices):
        raise HTTPException(422, "Progress contains an invalid item reference.")
    if body.completed and body.current_index != len(study_set.items):
        raise HTTPException(422, "A study set can only be completed after its final item.")
    progress = body.model_dump()
    if study_set.kind == "quiz":
        correct_count = sum(
            1
            for index, item in enumerate(study_set.items)
            if (answer := body.answers.get(str(index)))
            and normalize_study_answer(answer) == normalize_study_answer(item["correct_answer"])
        )
        progress["score"] = (
            int(correct_count / len(study_set.items) * 100 + 0.5)
            if body.completed and study_set.items
            else 0
        )
    else:
        progress["score"] = 0
    study_set.progress = progress
    await db.commit()
    await db.refresh(study_set)
    return study_set

@router.post("/study-sets/{study_set_id}/regenerate/{item_index}", response_model=StudySetOut)
async def regenerate_study_item(study_set_id: int, item_index: int, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    study_set = await db.scalar(select(StudySet).where(StudySet.id == study_set_id, StudySet.user_id == user.id))
    if study_set is None:
        raise HTTPException(404, "Study set not found")
    if item_index < 0 or item_index >= len(study_set.items):
        raise HTTPException(404, "Study item not found")
    if not settings.gemini_api_key:
        raise HTTPException(503, "AI study generation needs GEMINI_API_KEY. Configure it on the backend and retry.")
    document = await db.scalar(select(Document).where(Document.id == study_set.document_id, Document.user_id == user.id))
    if document is None:
        raise HTTPException(404, "Document not found")
    if document.processing_status != "ready":
        raise HTTPException(409, "Study tools are available when document processing is complete.")
    all_chunks = await load_study_chunks(db, document.id)
    config = study_set.config
    chapters = find_chapters(all_chunks)
    try:
        start_index, end_index = select_chapter_bounds(chapters, config.get("chapter"))
    except ValueError:
        raise HTTPException(409, "The saved chapter is no longer available in this document.") from None
    selected_chunks = [
        chunk for chunk in all_chunks
        if chunk.page_number is not None
        and (config.get("page_start") is None or chunk.page_number >= config["page_start"])
        and (config.get("page_end") is None or chunk.page_number <= config["page_end"])
        and (start_index is None or chunk.chunk_index >= start_index)
        and (end_index is None or chunk.chunk_index <= end_index)
    ]
    selected_chunks = selected_chunks if len(selected_chunks) <= 100 else selected_chunks[:: max(1, len(selected_chunks) // 100)][:100]
    if not selected_chunks:
        raise HTTPException(422, "No page-referenced text remains in this study set's source range.")
    excluded = [
        item.get("question", item.get("front", ""))
        for item in study_set.items
    ]
    try:
        generated = await generate_study_items(
            kind=study_set.kind,
            chunks=selected_chunks,
            config=config,
            count=1,
            excluded=excluded,
        )
    except ValueError as exc:
        raise HTTPException(502, str(exc)) from None
    except Exception as exc:
        logger.error("Study item regeneration failed (error_type=%s)", type(exc).__name__)
        raise HTTPException(502, "AI study generation failed. Please try again.") from None
    study_set.items = [
        generated[0] if index == item_index else item
        for index, item in enumerate(study_set.items)
    ]
    progress = dict(study_set.progress)
    answers = dict(progress.get("answers", {}))
    statuses = dict(progress.get("statuses", {}))
    answers.pop(str(item_index), None)
    statuses.pop(str(item_index), None)
    study_set.progress = {
        **progress,
        "answers": answers,
        "statuses": statuses,
        "completed": False,
        "score": 0,
    }
    await db.commit()
    await db.refresh(study_set)
    return study_set

@router.delete("/study-sets/{study_set_id}", status_code=204)
async def delete_study_set(study_set_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    study_set = await db.scalar(select(StudySet).where(StudySet.id == study_set_id, StudySet.user_id == user.id))
    if study_set is None:
        raise HTTPException(404, "Study set not found")
    await db.delete(study_set)
    await db.commit()

@router.get("/notes", response_model=list[NoteOut])
async def list_notes(db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    return list((await db.scalars(select(StudyNote).where(StudyNote.user_id == user.id).order_by(StudyNote.updated_at.desc(), StudyNote.id.desc()))).all())

@router.post("/notes", response_model=NoteOut, status_code=201)
async def create_note(body: NoteCreateIn, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    if any(page < 1 for page in body.page_numbers):
        raise HTTPException(422, "Page references must be positive")
    title = body.title.strip()
    content = body.content.strip()
    if not title or not content:
        raise HTTPException(422, "A title and note content are required")
    document_owned = exists(select(1).where(Document.id == body.document_id, Document.user_id == user.id))
    source_valid = literal(True)
    if body.source_message_id is not None:
        source_valid = exists(
            select(1)
            .select_from(ChatMessage)
            .join(Conversation, ChatMessage.conversation_id == Conversation.id)
            .where(
                ChatMessage.id == body.source_message_id,
                ChatMessage.role == "assistant",
                Conversation.user_id == user.id,
                Conversation.document_id == body.document_id,
            )
        )
    insert_note = pg_insert(StudyNote).from_select(
        [
            "user_id",
            "document_id",
            "source_message_id",
            "title",
            "content",
            "tags",
            "page_numbers",
            "language",
        ],
        select(
            literal(user.id, type_=StudyNote.__table__.c.user_id.type),
            literal(body.document_id, type_=StudyNote.__table__.c.document_id.type),
            literal(body.source_message_id, type_=StudyNote.__table__.c.source_message_id.type),
            literal(title, type_=StudyNote.__table__.c.title.type),
            literal(content, type_=StudyNote.__table__.c.content.type),
            literal(body.tags.strip(), type_=StudyNote.__table__.c.tags.type),
            literal(sorted(set(body.page_numbers)), type_=StudyNote.__table__.c.page_numbers.type),
            literal(body.language, type_=StudyNote.__table__.c.language.type),
        ).where(document_owned, source_valid),
    )
    statement = insert_note.on_conflict_do_update(
        index_elements=[StudyNote.user_id, StudyNote.source_message_id],
        set_={"source_message_id": insert_note.excluded.source_message_id},
    ).returning(StudyNote)
    note = (await db.scalars(statement)).one_or_none()
    if note is None:
        raise HTTPException(404, "Document or assistant message not found")
    await db.commit()
    return note

@router.patch("/notes/{note_id}", response_model=NoteOut)
async def update_note(note_id: int, body: NoteUpdateIn, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    changes = body.model_dump(exclude_unset=True)
    for key, value in changes.items():
        if key in {"title", "content", "tags"} and value is not None:
            value = value.strip()
            if key in {"title", "content"} and not value:
                raise HTTPException(422, f"{key.title()} cannot be empty")
        if value is not None:
            changes[key] = value
        else:
            changes.pop(key)
    if not changes:
        changes["updated_at"] = StudyNote.updated_at
    note = (
        await db.scalars(
            sql_update(StudyNote)
            .where(StudyNote.id == note_id, StudyNote.user_id == user.id)
            .values(**changes)
            .returning(StudyNote)
        )
    ).one_or_none()
    if note is None:
        raise HTTPException(404, "Note not found")
    await db.commit()
    return note

@router.delete("/notes/{note_id}", status_code=204)
async def delete_note(note_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    deleted_id = await db.scalar(
        sql_delete(StudyNote)
        .where(StudyNote.id == note_id, StudyNote.user_id == user.id)
        .returning(StudyNote.id)
    )
    if deleted_id is None:
        raise HTTPException(404, "Note not found")
    await db.commit()

@router.get("/bookmarks", response_model=list[BookmarkOut])
async def list_bookmarks(db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    return list((await db.scalars(select(Bookmark).where(Bookmark.user_id == user.id).order_by(Bookmark.created_at.desc(), Bookmark.id.desc()))).all())

@router.post("/bookmarks", response_model=BookmarkOut)
async def create_bookmark(body: BookmarkCreateIn, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    if body.kind == "page" and body.page_number is None:
        raise HTTPException(422, "A page number is required for a page bookmark")
    if any(page < 1 for page in body.page_numbers):
        raise HTTPException(422, "Page references must be positive")
    if body.kind != "page" and not body.text.strip():
        raise HTTPException(422, "A text passage or answer is required")
    pages = sorted(set(body.page_numbers + ([body.page_number] if body.page_number else [])))
    normalized_text = " ".join(body.text.split())
    fingerprint_payload = json.dumps(
        [body.document_id, body.kind, body.page_number, pages, normalized_text.casefold(), body.source_message_id],
        ensure_ascii=False,
        separators=(",", ":"),
    )
    fingerprint = hashlib.sha256(fingerprint_payload.encode("utf-8")).hexdigest()
    document_owned = exists(select(1).where(Document.id == body.document_id, Document.user_id == user.id))
    source_valid = literal(True)
    if body.source_message_id is not None:
        source_valid = exists(
            select(1)
            .select_from(ChatMessage)
            .join(Conversation, ChatMessage.conversation_id == Conversation.id)
            .where(
                ChatMessage.id == body.source_message_id,
                ChatMessage.role == "assistant",
                Conversation.user_id == user.id,
                Conversation.document_id == body.document_id,
            )
        )
    insert_bookmark = pg_insert(Bookmark).from_select(
        [
            "user_id",
            "document_id",
            "source_message_id",
            "kind",
            "page_number",
            "page_numbers",
            "text",
            "fingerprint",
        ],
        select(
            literal(user.id, type_=Bookmark.__table__.c.user_id.type),
            literal(body.document_id, type_=Bookmark.__table__.c.document_id.type),
            literal(body.source_message_id, type_=Bookmark.__table__.c.source_message_id.type),
            literal(body.kind, type_=Bookmark.__table__.c.kind.type),
            literal(body.page_number, type_=Bookmark.__table__.c.page_number.type),
            literal(pages, type_=Bookmark.__table__.c.page_numbers.type),
            literal(body.text.strip(), type_=Bookmark.__table__.c.text.type),
            literal(fingerprint, type_=Bookmark.__table__.c.fingerprint.type),
        ).where(document_owned, source_valid),
    )
    statement = insert_bookmark.on_conflict_do_update(
        index_elements=[Bookmark.user_id, Bookmark.fingerprint],
        set_={"fingerprint": insert_bookmark.excluded.fingerprint},
    ).returning(Bookmark)
    bookmark = (await db.scalars(statement)).one_or_none()
    if bookmark is None:
        raise HTTPException(404, "Document or assistant message not found")
    await db.commit()
    return bookmark

@router.delete("/bookmarks/{bookmark_id}", status_code=204)
async def delete_bookmark(bookmark_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    deleted_id = await db.scalar(
        sql_delete(Bookmark)
        .where(Bookmark.id == bookmark_id, Bookmark.user_id == user.id)
        .returning(Bookmark.id)
    )
    if deleted_id is None:
        raise HTTPException(404, "Bookmark not found")
    await db.commit()

@router.post("/translate", response_model=TranslateOut)
async def translate_answer(body: TranslateIn, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    if not settings.gemini_api_key:
        raise HTTPException(503, "Translation needs GEMINI_API_KEY. Add it to .env and restart the API.")
    message = None
    if body.message_id is not None:
        message = await db.scalar(select(ChatMessage).join(Conversation).where(ChatMessage.id == body.message_id, ChatMessage.role == "assistant", Conversation.user_id == user.id))
        if message is None:
            raise HTTPException(404, "Assistant message not found")
        if message.translated_content:
            return TranslateOut(translated_text=message.translated_content)
    try:
        translated = await translate_to_nepali(body.text)
        if message is not None:
            message.translated_content = translated
            await db.commit()
    except ValueError as exc:
        raise HTTPException(502, "Translation could not preserve the source references. Please retry.") from exc
    except Exception as exc:
        raise HTTPException(502, "Translation failed. Please retry.") from exc
    return TranslateOut(translated_text=translated)
