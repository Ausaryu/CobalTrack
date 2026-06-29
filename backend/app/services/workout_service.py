from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.exercise_tracking import BODYWEIGHT_TRACKING_TYPES, ExerciseTrackingType
from app.models.exercise import Exercise
from app.models.workout import WorkoutExercise, WorkoutSession, WorkoutSet
from app.schemas.workout import WorkoutCreate, WorkoutExerciseInput, WorkoutUpdate


def _exercise_tracking_types(
    db: Session,
    exercise_ids: set[int],
) -> dict[int, ExerciseTrackingType]:
    if not exercise_ids:
        return {}
    tracking_types = dict(
        db.execute(
            select(Exercise.id, Exercise.tracking_type).where(Exercise.id.in_(exercise_ids))
        ).all()
    )
    missing = sorted(exercise_ids - tracking_types.keys())
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "Unknown exercise ids", "exercise_ids": missing},
        )
    return tracking_types


def _build_exercises(
    items: list[WorkoutExerciseInput],
    tracking_types: dict[int, ExerciseTrackingType],
    current_bodyweight_kg: float | None,
) -> list[WorkoutExercise]:
    return [
        WorkoutExercise(
            exercise_id=item.exercise_id,
            order_index=item.order_index,
            notes=item.notes,
            sets=[
                WorkoutSet(
                    **(
                        set_item.model_dump()
                        | (
                            {"bodyweight": current_bodyweight_kg}
                            if tracking_types[item.exercise_id] in BODYWEIGHT_TRACKING_TYPES
                            and "bodyweight" not in set_item.model_fields_set
                            else {}
                        )
                    )
                )
                for set_item in item.sets
            ],
        )
        for item in items
    ]


def search_workouts(
    db: Session,
    user_id: int,
    q: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[WorkoutSession], int]:
    stmt = select(WorkoutSession).where(WorkoutSession.user_id == user_id)
    if q:
        stmt = stmt.where(WorkoutSession.name.ilike(f"%{q}%"))
    if date_from:
        stmt = stmt.where(WorkoutSession.performed_at >= date_from)
    if date_to:
        stmt = stmt.where(WorkoutSession.performed_at <= date_to)
    stmt = stmt.order_by(WorkoutSession.performed_at.desc(), WorkoutSession.id.desc())
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    items = list(db.scalars(stmt.offset(offset).limit(limit)).all())
    return items, total


def list_workouts(db: Session, user_id: int) -> list[WorkoutSession]:
    statement = (
        select(WorkoutSession)
        .where(WorkoutSession.user_id == user_id)
        .order_by(WorkoutSession.performed_at.desc(), WorkoutSession.id.desc())
    )
    return list(db.scalars(statement).all())


def get_workout(db: Session, user_id: int, workout_id: int) -> WorkoutSession:
    workout = db.scalar(
        select(WorkoutSession).where(
            WorkoutSession.id == workout_id,
            WorkoutSession.user_id == user_id,
        )
    )
    if workout is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found")
    return workout


def create_workout(
    db: Session,
    user_id: int,
    payload: WorkoutCreate,
    current_bodyweight_kg: float | None = None,
) -> WorkoutSession:
    tracking_types = _exercise_tracking_types(
        db, {item.exercise_id for item in payload.exercises}
    )
    workout = WorkoutSession(
        user_id=user_id,
        **payload.model_dump(exclude={"exercises"}),
        exercises=_build_exercises(
            payload.exercises, tracking_types, current_bodyweight_kg
        ),
    )
    db.add(workout)
    db.commit()
    db.refresh(workout)
    return workout


def update_workout(
    db: Session,
    user_id: int,
    workout_id: int,
    payload: WorkoutUpdate,
    current_bodyweight_kg: float | None = None,
) -> WorkoutSession:
    workout = get_workout(db, user_id, workout_id)
    values = payload.model_dump(exclude_unset=True, exclude={"exercises"})
    for field, value in values.items():
        if field in {"name", "performed_at"} and value is None:
            continue
        setattr(workout, field, value)

    if "exercises" in payload.model_fields_set:
        items = payload.exercises or []
        tracking_types = _exercise_tracking_types(
            db, {item.exercise_id for item in items}
        )
        workout.exercises.clear()
        db.flush()
        workout.exercises.extend(
            _build_exercises(items, tracking_types, current_bodyweight_kg)
        )

    db.commit()
    db.refresh(workout)
    return workout


def delete_workout(db: Session, user_id: int, workout_id: int) -> None:
    workout = get_workout(db, user_id, workout_id)
    db.delete(workout)
    db.commit()
