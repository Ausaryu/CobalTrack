from fastapi.testclient import TestClient

from tests.conftest import register


def _exercise(
    client: TestClient,
    headers: dict[str, str],
    name: str,
    tracking_type: str,
) -> int:
    response = client.post(
        "/api/exercises",
        headers=headers,
        json={"name": name, "tracking_type": tracking_type},
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_workout_accepts_tracking_specific_set_fields(client: TestClient) -> None:
    headers = register(client, "tracking-workout")
    weight_id = _exercise(client, headers, "Bench", "WEIGHT_REPS")
    assisted_id = _exercise(client, headers, "Assisted pull-up", "ASSISTED_BODYWEIGHT_REPS")
    added_id = _exercise(client, headers, "Weighted pull-up", "ADDED_BODYWEIGHT_REPS")
    cardio_id = _exercise(client, headers, "Bike", "CARDIO")
    time_id = _exercise(client, headers, "Plank", "TIME")

    response = client.post(
        "/api/workouts",
        headers=headers,
        json={
            "name": "Mixed tracking",
            "performed_at": "2026-06-29",
            "exercises": [
                {"exercise_id": weight_id, "sets": [{"weight": 100, "reps": 5}]},
                {
                    "exercise_id": assisted_id,
                    "sets": [{"assistance_weight": 20, "bodyweight": 80, "reps": 5}],
                },
                {
                    "exercise_id": added_id,
                    "sets": [{"added_weight": 15, "bodyweight": 80, "reps": 6}],
                },
                {
                    "exercise_id": cardio_id,
                    "sets": [
                        {
                            "duration_seconds": 1200,
                            "distance_meters": 5000,
                            "calories": 240,
                            "resistance_level": 7.5,
                            "rpe": 6,
                        }
                    ],
                },
                {
                    "exercise_id": time_id,
                    "sets": [{"duration_seconds": 90, "rpe": 8, "rest_seconds": 60}],
                },
            ],
        },
    )

    assert response.status_code == 201, response.text
    sets = [entry["sets"][0] for entry in response.json()["exercises"]]
    assert sets[0]["weight"] == 100
    assert sets[1]["assistance_weight"] == 20
    assert sets[1]["bodyweight"] == 80
    assert sets[2]["added_weight"] == 15
    assert sets[3]["duration_seconds"] == 1200
    assert sets[3]["distance_meters"] == 5000
    assert sets[3]["calories"] == 240
    assert sets[3]["resistance_level"] == 7.5
    assert sets[4]["duration_seconds"] == 90
    assert sets[4]["weight"] is None


def test_program_accepts_tracking_specific_targets(client: TestClient) -> None:
    headers = register(client, "tracking-program")
    assisted_id = _exercise(client, headers, "Assisted dip", "ASSISTED_BODYWEIGHT_REPS")
    added_id = _exercise(client, headers, "Weighted dip", "ADDED_BODYWEIGHT_REPS")
    cardio_id = _exercise(client, headers, "Ski erg", "CARDIO")

    response = client.post(
        "/api/programs",
        headers=headers,
        json={
            "name": "Tracking program",
            "days_per_week": 1,
            "days": [
                {
                    "name": "Day 1",
                    "exercises": [
                        {
                            "exercise_id": assisted_id,
                            "sets_count": 3,
                            "min_reps": 5,
                            "max_reps": 8,
                            "target_assistance_weight": 15,
                            "target_bodyweight": 80,
                        },
                        {
                            "exercise_id": added_id,
                            "sets_count": 3,
                            "min_reps": 5,
                            "max_reps": 8,
                            "target_added_weight": 20,
                            "target_bodyweight": 80,
                        },
                        {
                            "exercise_id": cardio_id,
                            "sets_count": 1,
                            "target_duration_seconds": 1800,
                            "target_distance_meters": 6000,
                            "target_calories": 300,
                            "target_resistance_level": 8,
                        },
                    ],
                }
            ],
        },
    )

    assert response.status_code == 201, response.text
    exercises = response.json()["days"][0]["exercises"]
    assert exercises[0]["target_assistance_weight"] == 15
    assert exercises[0]["target_bodyweight"] == 80
    assert exercises[1]["target_added_weight"] == 20
    assert exercises[2]["target_duration_seconds"] == 1800
    assert exercises[2]["target_distance_meters"] == 6000
    assert exercises[2]["target_calories"] == 300
    assert exercises[2]["target_resistance_level"] == 8
