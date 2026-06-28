from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.exercise import (
    ExerciseCreate,
    ExerciseRead,
    ExerciseUpdate,
    UserExerciseRead,
    UserExerciseUpdate,
)
from app.services import exercise_service
from app.services.auth_service import CurrentUser


router = APIRouter(prefix="/exercises", tags=["exercises"])
DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[ExerciseRead])
def list_exercises(db: DbSession, _current_user: CurrentUser) -> list[ExerciseRead]:
    return exercise_service.list_exercises(db)  # type: ignore[return-value]


@router.post("", response_model=ExerciseRead, status_code=status.HTTP_201_CREATED)
def create_exercise(
    payload: ExerciseCreate, db: DbSession, _current_user: CurrentUser
) -> ExerciseRead:
    return exercise_service.create_exercise(db, payload)  # type: ignore[return-value]


@router.get("/{exercise_id}", response_model=ExerciseRead)
def get_exercise(
    exercise_id: int, db: DbSession, _current_user: CurrentUser
) -> ExerciseRead:
    return exercise_service.get_exercise(db, exercise_id)  # type: ignore[return-value]


@router.put("/{exercise_id}", response_model=ExerciseRead)
def update_exercise(
    exercise_id: int,
    payload: ExerciseUpdate,
    db: DbSession,
    _current_user: CurrentUser,
) -> ExerciseRead:
    return exercise_service.update_exercise(db, exercise_id, payload)  # type: ignore[return-value]


@router.delete("/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exercise(
    exercise_id: int, db: DbSession, _current_user: CurrentUser
) -> Response:
    exercise_service.delete_exercise(db, exercise_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/{exercise_id}/personalization",
    response_model=UserExerciseRead | None,
)
def get_personalization(
    exercise_id: int, db: DbSession, current_user: CurrentUser
) -> UserExerciseRead | None:
    return exercise_service.get_user_exercise(db, current_user.id, exercise_id)  # type: ignore[return-value]


@router.put("/{exercise_id}/personalization", response_model=UserExerciseRead)
def set_personalization(
    exercise_id: int,
    payload: UserExerciseUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> UserExerciseRead:
    return exercise_service.upsert_user_exercise(  # type: ignore[return-value]
        db, current_user.id, exercise_id, payload
    )


@router.delete(
    "/{exercise_id}/personalization",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_personalization(
    exercise_id: int, db: DbSession, current_user: CurrentUser
) -> Response:
    exercise_service.delete_user_exercise(db, current_user.id, exercise_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

