import json
import unicodedata
from collections.abc import Iterator
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import distinct, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.exercise import Exercise, ExerciseSecondaryMuscle, UserExercise
from app.schemas.exercise import ExerciseCreate, ExerciseUpdate, UserExerciseUpdate


_SEARCHABLE_TRANSLATION_FIELDS = {
    "name",
    "category",
    "body_part",
    "target",
    "muscle_group",
    "equipment",
    "instructions",
}


def normalize_search_text(value: str) -> str:
    """Normalize text so punctuation, spacing, case and accents do not affect matching."""
    decomposed = unicodedata.normalize("NFKD", value.casefold())
    return "".join(
        character
        for character in decomposed
        if character.isalnum() and not unicodedata.combining(character)
    )


def _iter_text_values(value: Any) -> Iterator[str]:
    if isinstance(value, str):
        if value.strip():
            yield value
        return
    if isinstance(value, list):
        for item in value:
            yield from _iter_text_values(item)


def _localized_translation_fields(
    raw_translations: str | None,
) -> Iterator[dict[str, Any]]:
    if not raw_translations:
        return
    try:
        translations = json.loads(raw_translations)
    except (json.JSONDecodeError, TypeError):
        return
    if not isinstance(translations, dict):
        return

    for localized_fields in translations.values():
        if isinstance(localized_fields, dict):
            yield localized_fields


def _translation_search_values(raw_translations: str | None) -> Iterator[str]:
    for localized_fields in _localized_translation_fields(raw_translations):
        for field in _SEARCHABLE_TRANSLATION_FIELDS:
            yield from _iter_text_values(localized_fields.get(field))


def _translated_name_values(raw_translations: str | None) -> Iterator[str]:
    for localized_fields in _localized_translation_fields(raw_translations):
        yield from _iter_text_values(localized_fields.get("name"))


def _exercise_search_values(exercise: Exercise) -> Iterator[str]:
    for value in (
        exercise.name,
        exercise.category,
        exercise.body_part,
        exercise.target,
        exercise.muscle_group,
        exercise.equipment,
        exercise.instructions,
    ):
        if value:
            yield value
    yield from _translation_search_values(exercise.translations)


def _exercise_search_rank(exercise: Exercise, normalized_query: str) -> int | None:
    normalized_names = [
        normalize_search_text(value)
        for value in (exercise.name, *_translated_name_values(exercise.translations))
    ]
    if normalized_query in normalized_names:
        return 0
    if any(normalized_query in name for name in normalized_names):
        return 1
    if any(
        normalized_query in normalize_search_text(value)
        for value in _exercise_search_values(exercise)
    ):
        return 2
    return None


def list_exercises(db: Session) -> list[Exercise]:
    return list(db.scalars(select(Exercise).order_by(Exercise.name, Exercise.id)).all())


def search_exercises(
    db: Session,
    q: str | None = None,
    muscle_group: str | None = None,
    equipment: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Exercise], int]:
    stmt = select(Exercise)
    if muscle_group:
        coalesce_group = func.coalesce(Exercise.muscle_group, Exercise.target, Exercise.body_part)
        stmt = stmt.where(coalesce_group == muscle_group)
    if equipment:
        stmt = stmt.where(Exercise.equipment == equipment)
    stmt = stmt.order_by(Exercise.name, Exercise.id)

    normalized_query = normalize_search_text(q or "")
    if normalized_query:
        candidates = list(db.scalars(stmt).all())
        ranked_matches = [
            (rank, exercise)
            for exercise in candidates
            if (rank := _exercise_search_rank(exercise, normalized_query)) is not None
        ]
        ranked_matches.sort(key=lambda match: match[0])
        matching_items = [exercise for _, exercise in ranked_matches]
        return matching_items[offset : offset + limit], len(matching_items)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    items = list(db.scalars(stmt.offset(offset).limit(limit)).all())
    return items, total


def get_exercise_filters(db: Session) -> dict[str, list[str]]:
    coalesce_group = func.coalesce(Exercise.muscle_group, Exercise.target, Exercise.body_part)
    muscle_groups = list(
        db.scalars(
            select(distinct(coalesce_group))
            .where(coalesce_group.isnot(None))
            .order_by(coalesce_group)
        ).all()
    )
    equipment_values = list(
        db.scalars(
            select(distinct(Exercise.equipment))
            .where(Exercise.equipment.isnot(None))
            .order_by(Exercise.equipment)
        ).all()
    )
    return {"muscle_groups": muscle_groups, "equipment": equipment_values}


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
