from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CobalTrack API"
    api_prefix: str = "/api"
    api_version: str = "0.1.0"
    database_url: str = "sqlite:///./cobaltrack.db"
    backend_cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173"
    )
    secret_key: str = "change-this-secret-in-production"
    access_token_expire_minutes: int = 60 * 24
    jwt_algorithm: str = "HS256"

    @field_validator("backend_cors_origins")
    @classmethod
    def reject_cors_wildcard(cls, value: str) -> str:
        origins = {origin.strip() for origin in value.split(",")}
        if "*" in origins:
            raise ValueError("BACKEND_CORS_ORIGINS must not contain a wildcard")
        return value

    @property
    def cors_origins(self) -> list[str]:
        return list(
            dict.fromkeys(
                origin.strip().rstrip("/")
                for origin in self.backend_cors_origins.split(",")
                if origin.strip()
            )
        )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
