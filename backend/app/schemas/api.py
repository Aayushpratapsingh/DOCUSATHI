from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import Any, Literal

class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str
class LoginIn(BaseModel):
    email: EmailStr
    password: str
class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
class UserOut(BaseModel):
    id: int
    name: str
    email: str
    model_config = ConfigDict(from_attributes=True)
class ProfileUpdateIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    email: EmailStr
class DocumentOut(BaseModel):
    id: int
    filename: str
    file_type: str
    processing_status: str
    page_count: int
    uploaded_at: datetime
    model_config = ConfigDict(from_attributes=True)
class SignedDocumentUrlOut(BaseModel):
    signed_url: str
    expires_in: int
class DocumentRenameIn(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
class RecentChatOut(BaseModel):
    document_id: int
    filename: str
    last_message: str
    updated_at: datetime
    is_pinned: bool
    is_starred: bool
class ConversationPreferencesIn(BaseModel):
    is_pinned: bool | None = None
    is_starred: bool | None = None
class AskIn(BaseModel):
    question: str
    language: str = "auto"
class SourceOut(BaseModel):
    chunk_id: int
    page_number: int | None
    text: str
    score: float
class AskOut(BaseModel):
    answer: str
    sources: list[SourceOut]

class TranslateIn(BaseModel):
    text: str = Field(min_length=1, max_length=12000)
    message_id: int | None = None
class TranslateOut(BaseModel):
    translated_text: str

class ChatMessageOut(BaseModel):
    id: int
    role: Literal["user", "assistant"]
    content: str
    sources: list[SourceOut] = []
    translated_content: str | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class NoteCreateIn(BaseModel):
    document_id: int
    title: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1, max_length=30000)
    tags: str = Field(default="", max_length=500)
    page_numbers: list[int] = Field(default_factory=list)
    language: Literal["en", "ne"] = "en"
    source_message_id: int | None = None
class NoteUpdateIn(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    content: str | None = Field(default=None, min_length=1, max_length=30000)
    tags: str | None = Field(default=None, max_length=500)
    language: Literal["en", "ne"] | None = None
class NoteOut(BaseModel):
    id: int
    document_id: int
    source_message_id: int | None
    title: str
    content: str
    tags: str
    page_numbers: list[int]
    language: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
class BookmarkCreateIn(BaseModel):
    document_id: int
    kind: Literal["page", "passage", "answer"]
    page_number: int | None = Field(default=None, ge=1)
    page_numbers: list[int] = Field(default_factory=list)
    text: str = Field(default="", max_length=30000)
    source_message_id: int | None = None
class BookmarkOut(BaseModel):
    id: int
    document_id: int
    source_message_id: int | None
    kind: str
    page_number: int | None
    page_numbers: list[int]
    text: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class StudyGenerateIn(BaseModel):
    kind: Literal["quiz", "flashcards"]
    chapter: str | None = Field(default=None, max_length=160)
    page_start: int | None = Field(default=None, ge=1)
    page_end: int | None = Field(default=None, ge=1)
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    count: int = Field(default=10, ge=1, le=20)
    question_type: Literal["multiple_choice", "short_answer", "true_false", "mixed"] = "mixed"
    language: Literal["en", "ne"] = "en"

class StudyProgressIn(BaseModel):
    current_index: int = Field(default=0, ge=0, le=100)
    answers: dict[str, str] = Field(default_factory=dict)
    statuses: dict[str, Literal["know", "review"]] = Field(default_factory=dict)
    completed: bool = False
    score: int = Field(default=0, ge=0, le=100)

class StudySetOut(BaseModel):
    id: int
    document_id: int
    kind: Literal["quiz", "flashcards"]
    title: str
    config: dict[str, Any]
    items: list[dict[str, Any]]
    progress: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class StudyChapterOut(BaseModel):
    title: str
    page_start: int | None
    page_end: int | None

class StudyOptionsOut(BaseModel):
    pages: list[int]
    chapters: list[StudyChapterOut]
