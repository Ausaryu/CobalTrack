from datetime import date

from fastapi.testclient import TestClient

from app.services.stats_service import calculate_e1rm, calculate_volume
from tests.conftest import register


def create_exercise(
    client: TestClient,
    headers: dict[str, str],
    name: str,
    tracking_type: str = "WEIGHT_REPS",
) -> int:
    response = client.post(
        "/api/exercises",
        headers=headers,
        json={"name": name, "tracking_type": tracking_type},
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def create_workout(
    client: TestClient,
    headers: dict[str, str],
    name: str,
    exercises: list[dict[str, object]],
) -> None:
    response = client.post(
        "/api/workouts",
        headers=headers,
        json={
            "name": name,
            "performed_at": date.today().isoformat(),
            "duration_minutes": 60,
            "exercises": exercises,
        },
    )
    assert response.status_code == 201, response.text


def test_stat_formulas_handle_zero_and_missing_values() -> None:
    assert calculate_volume(100, 5) == 500
    assert calculate_volume(None, 5) == 0
    assert calculate_e1rm(100, 5) == 116.67
    assert calculate_e1rm(0, 5) == 0
    assert calculate_e1rm(100, 0) == 0
    assert calculate_e1rm(None, None) == 0


def test_stats_routes_are_exposed_in_openapi(client: TestClient) -> None:
    paths = client.get("/openapi.json").json()["paths"]
    assert "/api/stats/dashboard" in paths
    assert "/api/stats/exercises/{exercise_id}" in paths


def test_empty_dashboard_and_exercise_without_user_data(client: TestClient) -> None:
    headers = register(client)
    exercise_id = create_exercise(client, headers, "Bench press")

    dashboard = client.get("/api/stats/dashboard", headers=headers)
    assert dashboard.status_code == 200
    assert dashboard.json() == {
        "last_workout": None,
        "workouts_this_week": 0,
        "weekly_volume": 0.0,
        "recent_records": [],
        "top_exercises_by_volume": [],
    }

    progress = client.get(f"/api/stats/exercises/{exercise_id}", headers=headers)
    assert progress.status_code == 200
    assert progress.json() == {
        "exercise_id": exercise_id,
        "exercise_name": "Bench press",
        "total_sessions": 0,
        "max_weight": 0.0,
        "max_reps": 0,
        "max_volume": 0.0,
        "best_e1rm": 0.0,
        "history": [],
    }
    assert client.get("/api/stats/exercises/999", headers=headers).status_code == 404


def test_dashboard_progress_and_user_isolation(client: TestClient) -> None:
    owner = register(client, "stats-owner@example.com")
    other_user = register(client, "stats-other@example.com")
    bench_id = create_exercise(client, owner, "Bench press")
    squat_id = create_exercise(client, owner, "Squat")

    create_workout(
        client,
        owner,
        "Strength day",
        [
            {
                "exercise_id": bench_id,
                "order_index": 0,
                "sets": [
                    {"weight": 100, "reps": 5, "order_index": 0},
                    {"weight": 80, "reps": 10, "order_index": 1},
                ],
            },
            {
                "exercise_id": squat_id,
                "order_index": 1,
                "sets": [{"weight": 120, "reps": 5}],
            },
        ],
    )
    create_workout(
        client,
        other_user,
        "Other user's workout",
        [{"exercise_id": bench_id, "sets": [{"weight": 200, "reps": 1}]}],
    )

    dashboard = client.get("/api/stats/dashboard", headers=owner)
    assert dashboard.status_code == 200
    payload = dashboard.json()
    assert payload["last_workout"]["name"] == "Strength day"
    assert payload["workouts_this_week"] == 1
    assert payload["weekly_volume"] == 1900.0
    assert payload["top_exercises_by_volume"][0] == {
        "exercise_id": bench_id,
        "exercise_name": "Bench press",
        "total_volume": 1300.0,
    }
    assert len(payload["recent_records"]) == 2

    progress = client.get(f"/api/stats/exercises/{bench_id}", headers=owner)
    assert progress.status_code == 200
    progress_payload = progress.json()
    assert progress_payload["total_sessions"] == 1
    assert progress_payload["max_weight"] == 100.0
    assert progress_payload["max_reps"] == 10
    assert progress_payload["max_volume"] == 1300.0
    assert progress_payload["best_e1rm"] == 116.67
    assert progress_payload["history"] == [
        {
            "performed_at": date.today().isoformat(),
            "max_weight": 100.0,
            "total_volume": 1300.0,
            "best_e1rm": 116.67,
        }
    ]

    other_progress = client.get(
        f"/api/stats/exercises/{bench_id}", headers=other_user
    )
    assert other_progress.status_code == 200
    assert other_progress.json()["max_weight"] == 200.0
    assert other_progress.json()["max_volume"] == 200.0
    assert other_progress.json()["total_sessions"] == 1

    other_squat = client.get(f"/api/stats/exercises/{squat_id}", headers=other_user)
    assert other_squat.status_code == 200
    assert other_squat.json()["total_sessions"] == 0


def test_stats_use_tracking_specific_volume_and_ignore_cardio_time(
    client: TestClient,
) -> None:
    headers = register(client, "tracking-stats")
    weight_id = create_exercise(client, headers, "Bench", "WEIGHT_REPS")
    assisted_id = create_exercise(
        client, headers, "Assisted pull-up", "ASSISTED_BODYWEIGHT_REPS"
    )
    added_id = create_exercise(
        client, headers, "Weighted pull-up", "ADDED_BODYWEIGHT_REPS"
    )
    reps_id = create_exercise(client, headers, "Air squat", "REPS_ONLY")
    bodyweight_id = create_exercise(
        client, headers, "Push-up", "BODYWEIGHT_REPS"
    )
    cardio_id = create_exercise(client, headers, "Bike", "CARDIO")
    time_id = create_exercise(client, headers, "Plank", "TIME")

    create_workout(
        client,
        headers,
        "Mixed metrics",
        [
            {"exercise_id": weight_id, "sets": [{"weight": 100, "reps": 5}]},
            {
                "exercise_id": assisted_id,
                "sets": [{"bodyweight": 80, "assistance_weight": 20, "reps": 5}],
            },
            {
                "exercise_id": added_id,
                "sets": [{"bodyweight": 80, "added_weight": 20, "reps": 5}],
            },
            {"exercise_id": reps_id, "sets": [{"reps": 10}]},
            {"exercise_id": bodyweight_id, "sets": [{"bodyweight": 75, "reps": 7}]},
            {
                "exercise_id": cardio_id,
                "sets": [{"duration_seconds": 1200, "distance_meters": 5000}],
            },
            {"exercise_id": time_id, "sets": [{"duration_seconds": 90}]},
        ],
    )

    dashboard = client.get("/api/stats/dashboard", headers=headers)
    assert dashboard.status_code == 200
    payload = dashboard.json()
    assert payload["weekly_volume"] == 1317.0
    totals = {
        item["exercise_id"]: item["total_volume"]
        for item in payload["top_exercises_by_volume"]
    }
    assert totals[weight_id] == 500.0
    assert totals[assisted_id] == 300.0
    assert totals[added_id] == 500.0
    assert totals[reps_id] == 10.0
    assert totals[bodyweight_id] == 7.0
    assert cardio_id not in totals
    assert time_id not in totals
    record_ids = {item["exercise_id"] for item in payload["recent_records"]}
    assert cardio_id not in record_ids
    assert time_id not in record_ids

    assisted_progress = client.get(
        f"/api/stats/exercises/{assisted_id}", headers=headers
    ).json()
    assert assisted_progress["max_weight"] == 60.0
    assert assisted_progress["max_volume"] == 300.0
    assert assisted_progress["best_e1rm"] == 70.0

    cardio_progress = client.get(
        f"/api/stats/exercises/{cardio_id}", headers=headers
    ).json()
    assert cardio_progress["total_sessions"] == 1
    assert cardio_progress["max_volume"] == 0.0
    assert cardio_progress["best_e1rm"] == 0.0
