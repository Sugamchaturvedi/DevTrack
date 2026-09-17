from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "DevTrack API"
    database_url: str = "postgresql://devtrack:devtrack@localhost:5432/devtrack"
    secret_key: str = "devtrack-super-secret-key-change-this"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    class Config:
        env_file = ".env"


settings = Settings()