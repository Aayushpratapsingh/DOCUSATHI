from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import Literal

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
class DocumentRenameIn(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
class RecentChatOut(BaseModel):
    document_id: int
    filename: str
    last_message: str
    updated_at: datetime
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
