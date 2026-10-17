from pathlib import Path
import logging
from uuid import uuid4
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.auth import current_user, hash_password, make_token, verify_password
from app.core.config import settings
from app.db.session import SessionLocal, get_db
from app.models.entities import ChatMessage, Conversation, Document, User
from app.schemas.api import AskIn, AskOut, ChatMessageOut, DocumentOut, DocumentRenameIn, LoginIn, ProfileUpdateIn, RecentChatOut, RegisterIn, SourceOut, TokenOut, TranslateIn, TranslateOut, UserOut
from app.services.ingestion import index_document
from app.services.answering import answer, retrieve, translate_to_nepali

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)

@router.post("/auth/register", response_model=TokenOut)
async def register(body: RegisterIn, db: AsyncSession = Depends(get_db)):
    if len(body.password) < 10: raise HTTPException(400, "Use a password with at least 10 characters")
    existing = await db.scalar(select(User).where(User.email == body.email.lower()))
    if existing: raise HTTPException(409, "An account with this email already exists")
    user = User(name=body.name.strip(), email=body.email.lower(), password_hash=hash_password(body.password))
    db.add(user); await db.commit(); await db.refresh(user)
    return TokenOut(access_token=make_token(user.id))

@router.post("/auth/login", response_model=TokenOut)
async def login(body: LoginIn, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.email == body.email.lower()))
    if not user or not verify_password(body.password, user.password_hash): raise HTTPException(401, "Email or password is incorrect")
    return TokenOut(access_token=make_token(user.id))

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

async def process_in_background(document_id: int, path: Path, suffix: str):
    async with SessionLocal() as db:
        document = await db.get(Document, document_id)
        if document:
            try:
                await index_document(db, document, path, suffix)
            except Exception:
                logger.exception("Document indexing failed for document_id=%s", document_id)

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
        select(Document.id, Document.filename, latest_message, func.max(ChatMessage.created_at))
        .join(Conversation, Conversation.document_id == Document.id)
        .join(ChatMessage, ChatMessage.conversation_id == Conversation.id)
        .where(Conversation.user_id == user.id)
        .group_by(Conversation.id, Document.id, Document.filename)
        .order_by(func.max(ChatMessage.created_at).desc())
        .limit(5)
    )).all()
    return [RecentChatOut(document_id=row[0], filename=row[1], last_message=row[2], updated_at=row[3]) for row in rows]

@router.post("/documents", response_model=DocumentOut, status_code=202)
async def upload_document(background: BackgroundTasks, file: UploadFile = File(...), db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".pdf", ".docx"}: raise HTTPException(415, "Upload a PDF or DOCX document")
    content = await file.read(settings.max_upload_mb * 1024 * 1024 + 1)
    if not content: raise HTTPException(400, "This file is empty")
    if len(content) > settings.max_upload_mb * 1024 * 1024: raise HTTPException(413, f"File must be smaller than {settings.max_upload_mb} MB")
    if suffix == ".pdf" and not content.startswith(b"%PDF-"): raise HTTPException(400, "This file does not appear to be a valid PDF")
    if suffix == ".docx" and not content.startswith(b"PK"): raise HTTPException(400, "This file does not appear to be a valid DOCX")
    folder = Path(settings.upload_dir) / str(user.id); folder.mkdir(parents=True, exist_ok=True)
    safe_name = f"{uuid4().hex}{suffix}"; path = folder / safe_name; path.write_bytes(content)
    doc = Document(user_id=user.id, filename=Path(file.filename or safe_name).name, file_type=suffix[1:], storage_path=str(path), processing_status="processing")
    db.add(doc); await db.commit(); await db.refresh(doc)
    background.add_task(process_in_background, doc.id, path, suffix)
    return doc

@router.post("/documents/{document_id}/retry", response_model=DocumentOut, status_code=202)
async def retry_document(document_id: int, background: BackgroundTasks, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    doc = await db.scalar(select(Document).where(Document.id == document_id, Document.user_id == user.id))
    if not doc:
        raise HTTPException(404, "Document not found")
    if doc.processing_status == "processing":
        raise HTTPException(409, "Document is already processing")
    path = Path(doc.storage_path)
    if not path.is_file():
        raise HTTPException(404, "The original upload is missing. Please upload the document again.")
    doc.processing_status = "processing"
    doc.page_count = 0
    await db.commit()
    await db.refresh(doc)
    background.add_task(process_in_background, doc.id, path, f".{doc.file_type.lower()}")
    return doc

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
    Path(doc.storage_path).unlink(missing_ok=True)
    await db.delete(doc); await db.commit()

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
