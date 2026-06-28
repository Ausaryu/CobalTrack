from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.workout import WorkoutCreate, WorkoutRead, WorkoutUpdate
from app.services import workout_service
from app.services.auth_service import CurrentUser


router = APIRouter(prefix="/workouts", tags=["workouts"])
DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[WorkoutRead])
def list_workouts(db: DbSession, current_user: CurrentUser) -> list[WorkoutRead]:
    return workout_service.list_workouts(db, current_user.id)  # type: ignore[return-value]


@router.post("", response_model=WorkoutRead, status_code=status.HTTP_201_CREATED)
def create_workout(
    payload: WorkoutCreate, db: DbSession, current_user: CurrentUser
) -> WorkoutRead:
    return workout_service.create_workout(db, current_user.id, payload)  # type: ignore[return-value]


@router.get("/{workout_id}", response_model=WorkoutRead)
def get_workout(
    workout_id: int, db: DbSession, current_user: CurrentUser
) -> WorkoutRead:
    return workout_service.get_workout(db, current_user.id, workout_id)  # type: ignore[return-value]


@router.put("/{workout_id}", response_model=WorkoutRead)
def update_workout(
    workout_id: int,
    payload: WorkoutUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> WorkoutRead:
    return workout_service.update_workout(  # type: ignore[return-value]
        db, current_user.id, workout_id, payload
    )


@router.delete("/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout(
    workout_id: int, db: DbSession, current_user: CurrentUser
) -> Response:
    workout_service.delete_workout(db, current_user.id, workout_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

