import argparse
import json
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.database import engine
from app.models.exercise import Exercise, ExerciseSecondaryMuscle


@dataclass
class ImportResult:
    created: int = 0
    updated: int = 0
    skipped: int = 0


@dataclass
class RepairResult:
    exercises: int = 0
    fields: int = 0


TranslationValue = str | list[str]
ExerciseTranslations = dict[str, dict[str, TranslationValue]]

_TRANSLATABLE_FIELD_SPECS: dict[str, tuple[tuple[str, ...], bool]] = {
    "name": (("name", "exercise_name", "exerciseName"), False),
    "category": (("category",), False),
    "body_part": (("body_part", "bodyPart"), False),
    "target": (("target",), False),
    "muscle_group": (("muscle_group", "muscleGroup"), False),
    "equipment": (("equipment",), False),
    "instructions": (("instructions",), True),
}


def _first(item: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        value = item.get(key)
        if value is not None and value != "":
            return value
    return None


def _normalize_text(value: Any, *, multiline: bool = False) -> str | None:
    if value is None:
        return None
    if isinstance(value, dict):
        return None
    if isinstance(value, list):
        parts = [
            normalized
            for item in value
            if (normalized := _normalize_text(item, multiline=False)) is not None
        ]
        separator = "\n" if multiline else " "
        return separator.join(parts) or None
    text = str(value).strip()
    return text or None


def _localized_values(value: Any, *, multiline: bool = False) -> dict[str, str]:
    if not isinstance(value, dict):
        return {}

    localized: dict[str, str] = {}
    for raw_language, raw_text in value.items():
        language = str(raw_language).strip().lower()
        text = _normalize_text(raw_text, multiline=multiline)
        if language and text:
            localized[language] = text
    return localized


def _pick_native_value(
    translations: dict[str, str], fallback: str | None = None
) -> str | None:
    return translations.get("en") or next(iter(translations.values()), None) or fallback


def _native_field_value(
    item: dict[str, Any], keys: tuple[str, ...], *, multiline: bool = False
) -> str | None:
    raw_value = _first(item, *keys)
    localized = _localized_values(raw_value, multiline=multiline)
    fallback = _normalize_text(raw_value, multiline=multiline)
    return _pick_native_value(localized, fallback)


def _build_exercise_translations(item: dict[str, Any]) -> ExerciseTranslations:
    translations: ExerciseTranslations = {}
    for field, (keys, multiline) in _TRANSLATABLE_FIELD_SPECS.items():
        localized = _localized_values(_first(item, *keys), multiline=multiline)
        for language, text in localized.items():
            translations.setdefault(language, {})[field] = text

    secondary = _localized_muscle_values(
        _first(item, "secondary_muscles", "secondaryMuscles")
    )
    for language, names in secondary.items():
        translations.setdefault(language, {})["secondary_muscles"] = names

    return translations


def _serialize_translations(translations: ExerciseTranslations) -> str | None:
    if not translations:
        return None
    return json.dumps(translations, ensure_ascii=False, sort_keys=True)


def _as_instructions(value: Any) -> str | None:
    localized = _localized_values(value, multiline=True)
    return _pick_native_value(localized, _normalize_text(value, multiline=True))


def _as_muscle_names(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, dict):
        localized = _localized_muscle_values(value)
        return localized.get("en") or next(iter(localized.values()), [])
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


def _localized_muscle_values(value: Any) -> dict[str, list[str]]:
    if not isinstance(value, dict):
        return {}
    localized: dict[str, list[str]] = {}
    for raw_language, raw_names in value.items():
        language = str(raw_language).strip().lower()
        names = _as_muscle_names(raw_names) if not isinstance(raw_names, dict) else []
        if language and names:
            localized[language] = names
    return localized


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
        name = _native_field_value(
            item, ("name", "exercise_name", "exerciseName")
        )
        if name is None:
            result.skipped += 1
            continue

        external_id = _normalize_text(_first(item, "external_id", "externalId", "id"))
        source = source_override or _normalize_text(item.get("source")) or dataset_path.stem
        translations = _build_exercise_translations(item)

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
            "category": _native_field_value(item, ("category",)),
            "body_part": _native_field_value(item, ("body_part", "bodyPart")),
            "target": _native_field_value(item, ("target",)),
            "muscle_group": _native_field_value(
                item, ("muscle_group", "muscleGroup")
            ),
            "equipment": _native_field_value(item, ("equipment",)),
            "instructions": _as_instructions(item.get("instructions")),
            "translations": _serialize_translations(translations),
            "image_path": _normalize_text(
                _first(item, "image_path", "imagePath", "image", "imageUrl")
            ),
            "gif_path": _normalize_text(
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


def _load_exercise_translations(value: str | None) -> ExerciseTranslations:
    if not value:
        return {}
    try:
        parsed = json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return {}
    if not isinstance(parsed, dict):
        return {}

    translations: ExerciseTranslations = {}
    for raw_language, raw_fields in parsed.items():
        if not isinstance(raw_fields, dict):
            continue
        language = str(raw_language).strip().lower()
        fields: dict[str, TranslationValue] = {}
        for raw_field, raw_value in raw_fields.items():
            field = str(raw_field).strip()
            if isinstance(raw_value, str) and raw_value.strip():
                fields[field] = raw_value.strip()
            elif isinstance(raw_value, list):
                values = _as_muscle_names(raw_value)
                if values:
                    fields[field] = values
        if language and fields:
            translations[language] = fields
    return translations


def repair_existing_translations(db: Session) -> RepairResult:
    """Repair JSON-stringified visible fields and preserve their localized values."""
    result = RepairResult()
    exercises = db.scalars(select(Exercise)).all()

    for exercise in exercises:
        translations = _load_exercise_translations(exercise.translations)
        exercise_repaired = False

        for field, (_, multiline) in _TRANSLATABLE_FIELD_SPECS.items():
            raw = getattr(exercise, field)
            if not raw:
                continue
            stripped = raw.strip()
            if not stripped.startswith(("{", "[")):
                continue
            try:
                parsed = json.loads(stripped)
            except json.JSONDecodeError:
                continue

            localized = _localized_values(parsed, multiline=multiline)
            normalized = _pick_native_value(
                localized, _normalize_text(parsed, multiline=multiline)
            )
            if not normalized or normalized == raw:
                continue

            setattr(exercise, field, normalized)
            for language, text in localized.items():
                translations.setdefault(language, {})[field] = text
            result.fields += 1
            exercise_repaired = True

        if exercise_repaired:
            exercise.translations = _serialize_translations(translations)
            result.exercises += 1

    if result.fields:
        db.commit()

    return result


def repair_existing_instructions(db: Session) -> int:
    """Backward-compatible alias returning the number of repaired fields."""
    return repair_existing_translations(db).fields


def _find_dataset_root(dataset_path: Path) -> Path | None:
    """Walk up from the JSON file to find the directory that contains an images/ subfolder."""
    candidate = dataset_path.resolve().parent
    for _ in range(3):
        if (candidate / "images").is_dir():
            return candidate
        candidate = candidate.parent
    return None


def _move_images(dataset_root: Path, media_dir: Path) -> int:
    src = dataset_root / "images"
    if not src.is_dir():
        return 0
    dest = media_dir / "exercises"
    dest.mkdir(parents=True, exist_ok=True)
    moved = 0
    for img in src.iterdir():
        if img.is_file():
            shutil.move(str(img), dest / img.name)
            moved += 1
    return moved


def _update_image_paths(db: Session, old_prefix: str, new_prefix: str) -> int:
    """Rewrite image_path values that start with old_prefix to use new_prefix instead."""
    rows = db.execute(
        update(Exercise)
        .where(Exercise.image_path.like(f"{old_prefix}%"))
        .values(image_path=func.replace(Exercise.image_path, old_prefix, new_prefix))
        .returning(Exercise.id)
    )
    db.commit()
    return len(rows.fetchall())


def main() -> None:
    parser = argparse.ArgumentParser(description="Import a local exercise JSON dataset")
    parser.add_argument(
        "dataset",
        type=Path,
        nargs="?",
        help="Path to the JSON dataset",
    )
    parser.add_argument(
        "--source",
        help="Source label applied to every imported exercise (defaults to the file name)",
    )
    parser.add_argument(
        "--repair-translations",
        "--repair-instructions",
        dest="repair_translations",
        action="store_true",
        help="Repair existing JSON-stringified multilingual exercise fields in the DB",
    )
    args = parser.parse_args()

    media_dir = Path(__file__).resolve().parent.parent.parent / "media"

    if args.repair_translations and args.dataset is None:
        with Session(engine) as db:
            repaired = repair_existing_translations(db)
        print(
            f"Repaired {repaired.fields} field(s) across "
            f"{repaired.exercises} exercise(s)"
        )
        return

    if args.dataset is None:
        parser.error("Dataset path is required unless --repair-translations is used")

    dataset_path = args.dataset.resolve()
    if not dataset_path.is_file():
        parser.error(f"Dataset does not exist: {dataset_path}")

    with Session(engine) as db:
        result = import_exercises(db, dataset_path, args.source)
        updated_paths = _update_image_paths(db, "images/", "exercises/")

        # Also repair any bad instructions that may have existed before this import.
        repaired = repair_existing_translations(db)

    print(
        f"Import complete: {result.created} created, "
        f"{result.updated} updated, {result.skipped} skipped"
    )

    if updated_paths:
        print(f"Updated {updated_paths} image path(s) in database → exercises/")

    if repaired.fields:
        print(
            f"Repaired {repaired.fields} field(s) across "
            f"{repaired.exercises} exercise(s)"
        )

    dataset_root = _find_dataset_root(dataset_path)
    if dataset_root is not None:
        images_moved = _move_images(dataset_root, media_dir)
        if images_moved:
            print(f"Moved {images_moved} image(s) to {media_dir / 'exercises'}")
        shutil.rmtree(dataset_root)
        print(f"Deleted dataset directory: {dataset_root}")
    else:
        print("Warning: no images/ directory found near the dataset, skipping cleanup")


if __name__ == "__main__":
    main()
