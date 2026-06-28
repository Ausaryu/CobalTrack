import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import engine
from app.models.exercise import Exercise, ExerciseSecondaryMuscle


@dataclass
class ImportResult:
    created: int = 0
    updated: int = 0
    skipped: int = 0


def _first(item: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        value = item.get(key)
        if value is not None and value != "":
            return value
    return None


def _as_optional_string(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)
    text = str(value).strip()
    return text or None


def _as_instructions(value: Any) -> str | None:
    if isinstance(value, list):
        lines = [str(line).strip() for line in value if str(line).strip()]
        return "\n".join(lines) or None
    return _as_optional_string(value)


def _as_muscle_names(value: Any) -> list[str]:
    if value is None:
        return []
    values = value if isinstance(value, list) else [value]
    result: list[str] = []
    seen: set[str] = set()
    for raw_name in values:
        name = str(raw_name).strip()
        normalized = name.casefold()
        if name and normalized not in seen:
            result.append(name)
            seen.add(normalized)
    return result


def _sync_secondary_muscles(exercise: Exercise, muscle_names: list[str]) -> None:
    desired = {name.casefold(): name for name in muscle_names}
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


def _extract_records(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if isinstance(payload, dict):
        for key in ("exercises", "data", "results"):
            if isinstance(payload.get(key), list):
                return [item for item in payload[key] if isinstance(item, dict)]
        if "name" in payload:
            return [payload]
    raise ValueError("Expected a JSON array or an object containing an exercises/data/results array")


def import_exercises(
    db: Session, dataset_path: Path, source_override: str | None = None
) -> ImportResult:
    with dataset_path.open(encoding="utf-8") as dataset_file:
        records = _extract_records(json.load(dataset_file))

    result = ImportResult()
    for item in records:
        name = _as_optional_string(_first(item, "name", "exercise_name", "exerciseName"))
        if name is None:
            result.skipped += 1
            continue

        external_id = _as_optional_string(_first(item, "external_id", "externalId", "id"))
        source = source_override or _as_optional_string(item.get("source")) or dataset_path.stem

        exercise = None
        if external_id is not None:
            exercise = db.scalar(select(Exercise).where(Exercise.external_id == external_id))
        if exercise is None and external_id is None:
            exercise = db.scalar(
                select(Exercise).where(Exercise.name == name, Exercise.source == source)
            )

        values = {
            "external_id": external_id,
            "name": name,
            "category": _as_optional_string(item.get("category")),
            "body_part": _as_optional_string(_first(item, "body_part", "bodyPart")),
            "target": _as_optional_string(item.get("target")),
            "muscle_group": _as_optional_string(
                _first(item, "muscle_group", "muscleGroup")
            ),
            "equipment": _as_optional_string(item.get("equipment")),
            "instructions": _as_instructions(item.get("instructions")),
            "image_path": _as_optional_string(
                _first(item, "image_path", "imagePath", "image", "imageUrl")
            ),
            "gif_path": _as_optional_string(
                _first(item, "gif_path", "gifPath", "gifUrl")
            ),
            "source": source,
        }

        if exercise is None:
            exercise = Exercise(**values)
            db.add(exercise)
            result.created += 1
        else:
            for field, value in values.items():
                setattr(exercise, field, value)
            result.updated += 1

        muscle_names = _as_muscle_names(
            _first(item, "secondary_muscles", "secondaryMuscles")
        )
        _sync_secondary_muscles(exercise, muscle_names)

    db.commit()
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Import a local exercise JSON dataset")
    parser.add_argument("dataset", type=Path, help="Path to the JSON dataset")
    parser.add_argument(
        "--source",
        help="Source label applied to every imported exercise (defaults to the file name)",
    )
    args = parser.parse_args()

    if not args.dataset.is_file():
        parser.error(f"Dataset does not exist: {args.dataset}")

    with Session(engine) as db:
        result = import_exercises(db, args.dataset, args.source)

    print(
        f"Import complete: {result.created} created, "
        f"{result.updated} updated, {result.skipped} skipped"
    )


if __name__ == "__main__":
    main()
