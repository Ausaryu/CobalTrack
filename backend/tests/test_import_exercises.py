import json
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.exercise_tracking import ExerciseTrackingType, infer_tracking_type
from app.models.exercise import Exercise, ExerciseSecondaryMuscle
from app.models.user import User
from app.scripts.import_exercises import import_exercises, repair_existing_translations


def test_import_is_idempotent_and_updates_secondary_muscles(
    db: Session, tmp_path: Path
) -> None:
    dataset = tmp_path / "exercises.json"
    dataset.write_text(
        json.dumps(
            [
                {
                    "id": "0001",
                    "name": "Push-up",
                    "bodyPart": "chest",
                    "instructions": ["Keep a straight line", "Push"],
                    "secondaryMuscles": ["triceps", "triceps"],
                },
                {"id": "missing-name"},
            ]
        ),
        encoding="utf-8",
    )

    first = import_exercises(db, dataset, "test-dataset")
    assert (first.created, first.updated, first.skipped) == (1, 0, 1)

    payload = json.loads(dataset.read_text(encoding="utf-8"))
    payload[0]["name"] = "Push up"
    payload[0]["secondaryMuscles"] = ["shoulders"]
    dataset.write_text(json.dumps(payload), encoding="utf-8")

    second = import_exercises(db, dataset, "test-dataset")
    assert (second.created, second.updated, second.skipped) == (0, 1, 1)
    assert db.scalar(select(func.count(Exercise.id))) == 1
    assert db.scalar(select(Exercise.name)) == "Push up"
    assert db.scalars(select(ExerciseSecondaryMuscle.muscle_name)).all() == ["shoulders"]

    third = import_exercises(db, dataset, "test-dataset")
    assert (third.created, third.updated, third.skipped) == (0, 1, 1)
    assert db.scalar(select(func.count(ExerciseSecondaryMuscle.id))) == 1
    assert db.scalar(select(func.count(User.id))) == 0


def test_import_multilingual_fields_keep_english_as_native(
    db: Session, tmp_path: Path
) -> None:
    dataset = tmp_path / "multilingual.json"
    dataset.write_text(
        json.dumps(
            [
                {
                    "id": "multi-1",
                    "name": {"fr": "Crunch bicyclette", "en": "Bicycle crunch"},
                    "equipment": {"fr": "poids du corps", "en": "body weight"},
                    "instructions": {
                        "fr": ["Allongez-vous.", "Pédalez."],
                        "en": ["Lie flat.", "Pedal."],
                    },
                    "secondaryMuscles": {
                        "fr": ["obliques"],
                        "en": ["obliques", "hip flexors"],
                    },
                }
            ]
        ),
        encoding="utf-8",
    )

    import_exercises(db, dataset, "test-dataset")
    exercise = db.scalar(select(Exercise).where(Exercise.external_id == "multi-1"))
    assert exercise is not None
    assert exercise.name == "Bicycle crunch"
    assert exercise.equipment == "body weight"
    assert exercise.tracking_type == ExerciseTrackingType.BODYWEIGHT_REPS
    assert exercise.instructions == "Lie flat.\nPedal."
    assert sorted(muscle.muscle_name for muscle in exercise.secondary_muscles) == [
        "hip flexors",
        "obliques",
    ]

    translations = json.loads(exercise.translations or "{}")
    assert translations["en"]["name"] == "Bicycle crunch"
    assert translations["fr"]["name"] == "Crunch bicyclette"
    assert translations["fr"]["equipment"] == "poids du corps"
    assert translations["en"]["instructions"] == "Lie flat.\nPedal."
    assert translations["fr"]["secondary_muscles"] == ["obliques"]


def test_import_multilingual_fallback_uses_first_non_empty_language(
    db: Session, tmp_path: Path
) -> None:
    dataset = tmp_path / "fallbacks.json"
    dataset.write_text(
        json.dumps(
            [
                {"id": "fr-only", "name": {"fr": "Pompe"}},
                {"id": "other-only", "name": {"it": "Squat", "tr": "Çömelme"}},
            ]
        ),
        encoding="utf-8",
    )

    import_exercises(db, dataset, "test-dataset")
    exercises = {
        exercise.external_id: exercise
        for exercise in db.scalars(select(Exercise)).all()
    }

    assert exercises["fr-only"].name == "Pompe"
    assert json.loads(exercises["fr-only"].translations or "{}")["fr"]["name"] == "Pompe"
    assert exercises["other-only"].name == "Squat"
    assert json.loads(exercises["other-only"].translations or "{}")["tr"]["name"] == "Çömelme"


def test_import_instruction_list_stays_plain_without_translations(
    db: Session, tmp_path: Path
) -> None:
    dataset = tmp_path / "plain.json"
    dataset.write_text(
        json.dumps([{"id": "plain", "name": "Push-up", "instructions": ["Brace", "Push"]}]),
        encoding="utf-8",
    )

    import_exercises(db, dataset, "test-dataset")
    exercise = db.scalar(select(Exercise).where(Exercise.external_id == "plain"))
    assert exercise is not None
    assert exercise.instructions == "Brace\nPush"
    assert exercise.translations is None


def test_repair_existing_json_instructions_preserves_translations(db: Session) -> None:
    exercise = Exercise(
        name="Bicycle crunch",
        instructions=json.dumps(
            {"en": "Lie flat...", "fr": "Allongez-vous..."},
            ensure_ascii=False,
        ),
        source="legacy",
    )
    clean_exercise = Exercise(
        name="Push-up",
        instructions="Keep your body straight.",
        source="legacy",
    )
    db.add_all([exercise, clean_exercise])
    db.commit()

    repaired = repair_existing_translations(db)

    assert (repaired.exercises, repaired.fields) == (1, 1)
    assert exercise.instructions == "Lie flat..."
    translations = json.loads(exercise.translations or "{}")
    assert translations["en"]["instructions"] == "Lie flat..."
    assert translations["fr"]["instructions"] == "Allongez-vous..."
    assert clean_exercise.instructions == "Keep your body straight."
    assert clean_exercise.translations is None


def test_import_infers_and_validates_tracking_type(
    db: Session, tmp_path: Path
) -> None:
    dataset = tmp_path / "tracking.json"
    dataset.write_text(
        json.dumps(
            [
                {
                    "id": "cardio",
                    "name": "Bike",
                    "equipment": "  Stationary   Bike ",
                },
                {
                    "id": "unknown",
                    "name": "Unknown movement",
                    "equipment": "custom device",
                },
                {
                    "id": "explicit",
                    "name": "Plank",
                    "equipment": "body weight",
                    "tracking_type": "TIME",
                },
                {
                    "id": "invalid-explicit",
                    "name": "Assisted pull-up",
                    "equipment": "assisted",
                    "tracking_type": "not-a-tracking-type",
                },
            ]
        ),
        encoding="utf-8",
    )

    import_exercises(db, dataset, "test-dataset")
    exercises = {
        exercise.external_id: exercise
        for exercise in db.scalars(select(Exercise)).all()
    }

    assert exercises["cardio"].equipment == "Stationary   Bike"
    assert exercises["cardio"].tracking_type == ExerciseTrackingType.CARDIO
    assert exercises["unknown"].tracking_type == ExerciseTrackingType.WEIGHT_REPS
    assert exercises["explicit"].tracking_type == ExerciseTrackingType.TIME
    assert (
        exercises["invalid-explicit"].tracking_type
        == ExerciseTrackingType.ASSISTED_BODYWEIGHT_REPS
    )
    assert infer_tracking_type(" unknown equipment ") == ExerciseTrackingType.WEIGHT_REPS
