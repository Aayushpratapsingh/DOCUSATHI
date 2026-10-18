from functools import lru_cache

from supabase import Client, create_client

from app.core.config import settings

BUCKET_NAME = "documents"


class StorageError(RuntimeError):
    pass


@lru_cache(maxsize=1)
def _client() -> Client:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise StorageError("Supabase Storage is not configured")
    try:
        return create_client(settings.supabase_url, settings.supabase_service_role_key)
    except Exception:
        raise StorageError("Supabase Storage client initialization failed") from None


def upload_object(path: str, content: bytes, content_type: str) -> None:
    try:
        _client().storage.from_(BUCKET_NAME).upload(
            path,
            content,
            file_options={"content-type": content_type, "upsert": "true"},
        )
    except Exception:
        raise StorageError("Supabase Storage upload failed") from None


def download_object(path: str) -> bytes:
    try:
        return _client().storage.from_(BUCKET_NAME).download(path)
    except Exception:
        raise StorageError("Supabase Storage download failed") from None


def delete_object(path: str) -> None:
    try:
        _client().storage.from_(BUCKET_NAME).remove([path])
    except Exception:
        raise StorageError("Supabase Storage delete failed") from None


def create_signed_url(path: str, expires_in: int) -> str:
    try:
        response = _client().storage.from_(BUCKET_NAME).create_signed_url(path, expires_in)
    except Exception:
        raise StorageError("Could not create a signed document URL") from None
    if isinstance(response, dict):
        signed_url = response.get("signedURL") or response.get("signedUrl")
    else:
        signed_url = getattr(response, "signed_url", None)
    if not isinstance(signed_url, str) or not signed_url:
        raise StorageError("Supabase Storage returned an invalid signed URL")
    return signed_url
