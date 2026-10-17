from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://docintel:docintel@localhost:5432/docintel"
    jwt_secret: str = "development-only-change-me"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.8-flash"
    max_upload_mb: int = 20
    upload_dir: str = "./uploads"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
