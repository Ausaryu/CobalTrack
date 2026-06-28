from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.exercise import Exercise, ExerciseSecondaryMuscle, UserExercise
from app.schemas.exercise import ExerciseCreate, ExerciseUpdate, UserExerciseUpdate


def list_exercises(db: Session) -> list[Exercise]:
    return list(db.scalars(select(Exercise).order_by(Exercise.name, Exercise.id)).all())


def get_exercise(db: Session, exercise_id: int) -> Exercise:
    exercise = db.get(Exercise, exercise_id)
    if exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")
    return exercise


def _replace_secondary_muscles(exercise: Exercise, muscle_names: list[str]) -> None:
    desired: dict[str, str] = {}
    for raw_name in muscle_names:
        name = raw_name.strip()
        normalized = name.casefold()
        if name and normalized not in desired:
            desired[normalized] = name

    retained: set[str] = set()
    for muscle in list(exercise.secondary_muscles):
        normalized = muscle.muscle_name.casefold()
        if normalized not in desired or normalized in retained:
            exercise.secondary_muscles.remove(muscle)
            continue
        muscle.muscle_name = desired[normalized]
        retained.add(normalized)

    exercise.secondary_muscles.extend(
        ExerciseSecondaryMuscle(muscle_name=name)
        for normalized, name in desired.items()
        if normalized not in retained
    )


def create_exercise(db: Session, payload: ExerciseCreate) -> Exercise:
    values = payload.model_dump(exclude={"secondary_muscles"})
    exercise = Exercise(**values)
    _replace_secondary_muscles(exercise, payload.secondary_muscles)
    db.add(exercise)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An exercise with this external_id already exists",
        ) from exc
    db.refresh(exercise)
    return exercise


def update_exercise(db: Session, exercise_id: int, payload: ExerciseUpdate) -> Exercise:
    exercise = get_exercise(db, exercise_id)
    values = payload.model_dump(exclude_unset=True, exclude={"secondary_muscles"})
    for field, value in values.items():
        if field == "name" and value is None:
            continue
        setattr(exercise, field, value)
    if "secondary_muscles" in payload.model_fields_set:
        _replace_secondary_muscles(exercise, payload.secondary_muscles or [])

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The exercise could not be updated because it conflicts with existing data",
        ) from exc
    db.refresh(exercise)
    return exercise


def delete_exercise(db: Session, exercise_id: int) -> None:
    exercise = get_exercise(db, exercise_id)
    db.delete(exercise)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Exercise is used by a workout or program and cannot be deleted",
        ) from exc


def get_user_exercise(
    db: Session, user_id: int, exercise_id: int
) -> UserExercise | None:
    get_exercise(db, exercise_id)
    return db.scalar(
        select(UserExercise).where(
            UserExercise.user_id == user_id,
            UserExercise.exercise_id == exercise_id,
        )
    )


def upsert_user_exercise(
    db: Session, user_id: int, exercise_id: int, payload: UserExerciseUpdate
) -> UserExercise:
    preference = get_user_exercise(db, user_id, exercise_id)
    if preference is None:
        preference = UserExercise(user_id=user_id, exercise_id=exercise_id)
        db.add(preference)
    for field, value in payload.model_dump().items():
        setattr(preference, field, value)
    db.commit()
    db.refresh(preference)
    return preference


def delete_user_exercise(db: Session, user_id: int, exercise_id: int) -> None:
    preference = get_user_exercise(db, user_id, exercise_id)
    if preference is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise personalization not found",
        )
    db.delete(preference)
    db.commit()
