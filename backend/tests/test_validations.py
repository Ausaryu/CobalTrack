from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

from tests.conftest import register


def create_exercise(client: TestClient, headers: dict[str, str]) -> int:
    response = client.post("/api/exercises", headers=headers, json={"name": "Squat"})
    assert response.status_code == 201, response.text
    return response.json()["id"]


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("weight", -0.1),
        ("assistance_weight", -0.1),
        ("added_weight", -0.1),
        ("bodyweight", -0.1),
        ("reps", -1),
        ("duration_seconds", -1),
        ("distance_meters", -0.1),
        ("calories", -1),
        ("resistance_level", -0.1),
        ("rpe", -0.1),
        ("rpe", 10.1),
        ("rest_seconds", -1),
        ("order_index", -1),
    ],
)
def test_invalid_workout_set_values_return_422(
    client: TestClient, field: str, value: float
) -> None:
    headers = register(client)
    exercise_id = create_exercise(client, headers)
    workout_set = {"weight": 80, "reps": 8, "rpe": 7, "rest_seconds": 90}
    workout_set[field] = value

    response = client.post(
        "/api/workouts",
        headers=headers,
        json={
            "name": "Invalid workout",
            "performed_at": "2026-06-28",
            "exercises": [{"exercise_id": exercise_id, "sets": [workout_set]}],
        },
    )
    assert response.status_code == 422


@pytest.mark.parametrize(
    "changes",
    [
        {"duration_minutes": -1},
        {"perceived_difficulty": 0},
        {"perceived_difficulty": 11},
    ],
)
def test_invalid_workout_session_values_return_422(
    client: TestClient, changes: dict[str, int]
) -> None:
    headers = register(client)
    payload = {"name": "Invalid workout", "performed_at": "2026-06-28", **changes}
    assert client.post("/api/workouts", headers=headers, json=payload).status_code == 422


def test_workout_requires_performed_at(client: TestClient) -> None:
    headers = register(client)
    response = client.post(
        "/api/workouts", headers=headers, json={"name": "Missing date"}
    )
    assert response.status_code == 422


@pytest.mark.parametrize("days_per_week", [0, 8])
def test_invalid_program_days_per_week_returns_422(
    client: TestClient, days_per_week: int
) -> None:
    headers = register(client)
    response = client.post(
        "/api/programs",
        headers=headers,
        json={"name": "Invalid program", "days_per_week": days_per_week},
    )
    assert response.status_code == 422


@pytest.mark.parametrize(
    ("field", "value", "extra"),
    [
        ("sets_count", 0, {}),
        ("min_reps", -1, {}),
        ("max_reps", -1, {}),
        ("max_reps", 5, {"min_reps": 8}),
        ("target_weight", -0.1, {}),
        ("target_assistance_weight", -0.1, {}),
        ("target_added_weight", -0.1, {}),
        ("target_bodyweight", -0.1, {}),
        ("target_duration_seconds", -1, {}),
        ("target_distance_meters", -0.1, {}),
        ("target_calories", -1, {}),
        ("target_resistance_level", -0.1, {}),
        ("target_rpe", -0.1, {}),
        ("target_rpe", 10.1, {}),
        ("rest_seconds", -1, {}),
        ("order_index", -1, {}),
    ],
)
def test_invalid_program_exercise_values_return_422(
    client: TestClient,
    field: str,
    value: float,
    extra: dict[str, int],
) -> None:
    headers = register(client)
    exercise_id = create_exercise(client, headers)
    program_exercise = {
        "exercise_id": exercise_id,
        "sets_count": 3,
        "min_reps": 6,
        "max_reps": 10,
        **deepcopy(extra),
    }
    program_exercise[field] = value
    response = client.post(
        "/api/programs",
        headers=headers,
        json={
            "name": "Invalid program",
            "days_per_week": 1,
            "days": [{"name": "Day 1", "exercises": [program_exercise]}],
        },
    )
    assert response.status_code == 422


def test_exercise_name_and_external_id_are_validated(client: TestClient) -> None:
    headers = register(client)
    assert client.post(
        "/api/exercises", headers=headers, json={"name": "   "}
    ).status_code == 422

    first = client.post(
        "/api/exercises",
        headers=headers,
        json={"name": "Bench press", "external_id": "bench-1"},
    )
    assert first.status_code == 201
    duplicate = client.post(
        "/api/exercises",
        headers=headers,
        json={"name": "Another bench", "external_id": "bench-1"},
    )
    assert duplicate.status_code == 409
