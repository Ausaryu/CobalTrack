from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.exercise import Exercise
from app.models.workout import WorkoutExercise, WorkoutSession, WorkoutSet
from app.schemas.workout import WorkoutCreate, WorkoutExerciseInput, WorkoutUpdate


def _validate_exercises(db: Session, exercise_ids: set[int]) -> None:
    if not exercise_ids:
        return
    existing_ids = set(
        db.scalars(select(Exercise.id).where(Exercise.id.in_(exercise_ids))).all()
    )
    missing = sorted(exercise_ids - existing_ids)
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "Unknown exercise ids", "exercise_ids": missing},
        )


def _build_exercises(items: list[WorkoutExerciseInput]) -> list[WorkoutExercise]:
    return [
        WorkoutExercise(
            exercise_id=item.exercise_id,
            order_index=item.order_index,
            notes=item.notes,
            sets=[WorkoutSet(**set_item.model_dump()) for set_item in item.sets],
        )
        for item in items
    ]


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


def create_workout(db: Session, user_id: int, payload: WorkoutCreate) -> WorkoutSession:
    _validate_exercises(db, {item.exercise_id for item in payload.exercises})
    workout = WorkoutSession(
        user_id=user_id,
        **payload.model_dump(exclude={"exercises"}),
        exercises=_build_exercises(payload.exercises),
    )
    db.add(workout)
    db.commit()
    db.refresh(workout)
    return workout


def update_workout(
    db: Session, user_id: int, workout_id: int, payload: WorkoutUpdate
) -> WorkoutSession:
    workout = get_workout(db, user_id, workout_id)
    values = payload.model_dump(exclude_unset=True, exclude={"exercises"})
    for field, value in values.items():
        if field in {"name", "performed_at"} and value is None:
            continue
        setattr(workout, field, value)

    if "exercises" in payload.model_fields_set:
        items = payload.exercises or []
        _validate_exercises(db, {item.exercise_id for item in items})
        workout.exercises.clear()
        db.flush()
        workout.exercises.extend(_build_exercises(items))

    db.commit()
    db.refresh(workout)
    return workout


def delete_workout(db: Session, user_id: int, workout_id: int) -> None:
    workout = get_workout(db, user_id, workout_id)
    db.delete(workout)
    db.commit()

