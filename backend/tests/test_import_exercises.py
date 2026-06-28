import json
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.exercise import Exercise, ExerciseSecondaryMuscle
from app.models.user import User
from app.scripts.import_exercises import import_exercises


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
