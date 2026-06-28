from pathlib import Path

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.routers import auth, exercises, programs, stats, workouts
from app.schemas.config import PublicConfig

_MEDIA_DIR = Path(__file__).parent.parent / "media"


def create_app() -> FastAPI:
    application = FastAPI(title=settings.app_name, version=settings.api_version)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )
    _MEDIA_DIR.mkdir(exist_ok=True)
    application.mount("/media", StaticFiles(directory=str(_MEDIA_DIR)), name="media")
    api_router = APIRouter(prefix=settings.api_prefix)

    @api_router.get("/health", tags=["health"])
    def healthcheck() -> dict[str, str]:
        return {"status": "ok"}

    @api_router.get("/config", response_model=PublicConfig, tags=["config"])
    def public_config() -> PublicConfig:
        return PublicConfig(app_name="CobalTrack", api_version=settings.api_version)

    api_router.include_router(auth.router)
    api_router.include_router(exercises.router)
    api_router.include_router(workouts.router)
    api_router.include_router(programs.router)
    api_router.include_router(stats.router)
    application.include_router(api_router)
    return application


app = create_app()
