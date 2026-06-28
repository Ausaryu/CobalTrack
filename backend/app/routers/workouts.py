from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.workout import WorkoutCreate, WorkoutListResponse, WorkoutRead, WorkoutUpdate
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


# Must be declared before /{workout_id} to avoid int-coercion 422
@router.get("/search", response_model=WorkoutListResponse)
def search_workouts(
    db: DbSession,
    current_user: CurrentUser,
    q: Annotated[str | None, Query()] = None,
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> WorkoutListResponse:
    items, total = workout_service.search_workouts(
        db, current_user.id, q, date_from, date_to, limit, offset
    )
    return WorkoutListResponse(items=items, total=total, limit=limit, offset=offset)  # type: ignore[return-value]


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
