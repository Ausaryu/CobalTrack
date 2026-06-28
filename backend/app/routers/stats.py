from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.stats import DashboardSummary, ExerciseProgress
from app.services import stats_service
from app.services.auth_service import CurrentUser


router = APIRouter(prefix="/stats", tags=["stats"])
DbSession = Annotated[Session, Depends(get_db)]


@router.get("/dashboard", response_model=DashboardSummary)
def dashboard(db: DbSession, current_user: CurrentUser) -> DashboardSummary:
    return stats_service.get_dashboard(db, current_user.id)


@router.get("/exercises/{exercise_id}", response_model=ExerciseProgress)
def exercise_progress(
    exercise_id: int, db: DbSession, current_user: CurrentUser
) -> ExerciseProgress:
    return stats_service.get_exercise_progress(db, current_user.id, exercise_id)
