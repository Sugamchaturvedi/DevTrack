from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "DevTrack — University Enterprise PMS"
    app_version: str = "2.0.0"
    database_url: str = "postgresql://devtrack:devtrack@127.0.0.1:5433/devtrack"
    secret_key: str = "devtrack-super-secret-key-change-this"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    refresh_token_expire_days: int = 7
    environment: str = "development"
    upload_dir: str = "uploads"
    max_upload_size_mb: int = 25

    # GitHub & External Integration Configuration (Phase 1)
    github_api_base: str = "https://api.github.com"
    github_webhook_secret: str = ""
    encryption_key: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
