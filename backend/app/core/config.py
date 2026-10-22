from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    direct_database_url: str
    supabase_url: str
    supabase_service_role_key: str
    jwt_secret: str = "development-only-change-me"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.8-flash"
    max_upload_mb: int = 20
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[3] / ".env",
        extra="ignore",
    )


settings = Settings()
