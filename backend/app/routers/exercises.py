from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.exercise import (
    ExerciseCreate,
    ExerciseFiltersResponse,
    ExerciseListResponse,
    ExerciseRead,
    ExerciseUpdate,
    UserExerciseRead,
    UserExerciseUpdate,
)
from app.services import exercise_service
from app.services.auth_service import AdminUser, CurrentUser


router = APIRouter(prefix="/exercises", tags=["exercises"])
DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[ExerciseRead])
def list_exercises(db: DbSession, _current_user: CurrentUser) -> list[ExerciseRead]:
    return exercise_service.list_exercises(db)  # type: ignore[return-value]


@router.post("", response_model=ExerciseRead, status_code=status.HTTP_201_CREATED)
def create_exercise(
    payload: ExerciseCreate, db: DbSession, _admin_user: AdminUser
) -> ExerciseRead:
    return exercise_service.create_exercise(db, payload)  # type: ignore[return-value]


# Static sub-paths must come before /{exercise_id} to avoid int-coercion 422s
@router.get("/search", response_model=ExerciseListResponse)
def search_exercises(
    db: DbSession,
    current_user: CurrentUser,
    q: Annotated[str | None, Query()] = None,
    muscle_group: Annotated[str | None, Query()] = None,
    equipment: Annotated[str | None, Query()] = None,
    favorite_only: Annotated[bool, Query()] = False,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ExerciseListResponse:
    items, total = exercise_service.search_exercises(
        db,
        current_user.id,
        q=q,
        muscle_group=muscle_group,
        equipment=equipment,
        favorite_only=favorite_only,
        limit=limit,
        offset=offset,
    )
    return ExerciseListResponse(items=items, total=total, limit=limit, offset=offset)  # type: ignore[return-value]


@router.get("/filters", response_model=ExerciseFiltersResponse)
def get_filters(db: DbSession, _current_user: CurrentUser) -> ExerciseFiltersResponse:
    filters = exercise_service.get_exercise_filters(db)
    return ExerciseFiltersResponse(**filters)


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
    _admin_user: AdminUser,
) -> ExerciseRead:
    return exercise_service.update_exercise(db, exercise_id, payload)  # type: ignore[return-value]


@router.delete("/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exercise(
    exercise_id: int, db: DbSession, _admin_user: AdminUser
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
