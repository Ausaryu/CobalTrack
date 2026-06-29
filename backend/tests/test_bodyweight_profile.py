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


def test_profile_accepts_nullable_realistic_bodyweight(client: TestClient) -> None:
    headers = register(client, "bodyweight-profile")
    assert client.get("/api/auth/me", headers=headers).json()["current_bodyweight_kg"] is None

    updated = client.put(
        "/api/auth/me",
        headers=headers,
        json={"current_bodyweight_kg": 74.5},
    )
    assert updated.status_code == 200
    assert updated.json()["current_bodyweight_kg"] == 74.5

    cleared = client.put(
        "/api/auth/me",
        headers=headers,
        json={"current_bodyweight_kg": None},
    )
    assert cleared.status_code == 200
    assert cleared.json()["current_bodyweight_kg"] is None

    for invalid_value in (-0.1, 400.1):
        response = client.put(
            "/api/auth/me",
            headers=headers,
            json={"current_bodyweight_kg": invalid_value},
        )
        assert response.status_code == 422


def test_workout_snapshots_profile_bodyweight_without_merging_source_values(
    client: TestClient,
) -> None:
    owner = register(client, "bodyweight-owner")
    bodyweight_id = _exercise(client, owner, "Push-up", "BODYWEIGHT_REPS")
    assisted_id = _exercise(
        client, owner, "Assisted pull-up", "ASSISTED_BODYWEIGHT_REPS"
    )
    added_id = _exercise(client, owner, "Weighted dip", "ADDED_BODYWEIGHT_REPS")
    client.put(
        "/api/auth/me",
        headers=owner,
        json={"current_bodyweight_kg": 75},
    )

    created = client.post(
        "/api/workouts",
        headers=owner,
        json={
            "name": "Bodyweight snapshot",
            "performed_at": "2026-06-29",
            "exercises": [
                {"exercise_id": bodyweight_id, "sets": [{"reps": 12}]},
                {
                    "exercise_id": assisted_id,
                    "sets": [{"assistance_weight": 25, "reps": 10}],
                },
                {
                    "exercise_id": added_id,
                    "sets": [{"added_weight": 10, "reps": 6}],
                },
            ],
        },
    )
    assert created.status_code == 201, created.text
    workout_id = created.json()["id"]
    sets = [entry["sets"][0] for entry in created.json()["exercises"]]
    assert [workout_set["bodyweight"] for workout_set in sets] == [75, 75, 75]
    assert sets[1]["assistance_weight"] == 25
    assert sets[1]["added_weight"] is None
    assert sets[2]["added_weight"] == 10
    assert sets[2]["assistance_weight"] is None

    client.put(
        "/api/auth/me",
        headers=owner,
        json={"current_bodyweight_kg": 80},
    )
    historical = client.get(f"/api/workouts/{workout_id}", headers=owner).json()
    assert [
        entry["sets"][0]["bodyweight"] for entry in historical["exercises"]
    ] == [75, 75, 75]

    updated = client.put(
        f"/api/workouts/{workout_id}",
        headers=owner,
        json={
            "exercises": [
                {"exercise_id": bodyweight_id, "sets": [{"reps": 15}]},
                {
                    "exercise_id": assisted_id,
                    "sets": [{"assistance_weight": 20, "reps": 8}],
                },
                {
                    "exercise_id": added_id,
                    "sets": [{"added_weight": 12.5, "reps": 5}],
                },
            ]
        },
    )
    assert updated.status_code == 200, updated.text
    assert [
        entry["sets"][0]["bodyweight"] for entry in updated.json()["exercises"]
    ] == [80, 80, 80]

    without_profile = register(client, "bodyweight-missing")
    no_snapshot = client.post(
        "/api/workouts",
        headers=without_profile,
        json={
            "name": "Missing profile weight",
            "performed_at": "2026-06-29",
            "exercises": [{"exercise_id": bodyweight_id, "sets": [{"reps": 5}]}],
        },
    )
    assert no_snapshot.status_code == 201
    assert no_snapshot.json()["exercises"][0]["sets"][0]["bodyweight"] is None


def test_explicit_set_bodyweight_overrides_profile_default(client: TestClient) -> None:
    headers = register(client, "bodyweight-override")
    exercise_id = _exercise(
        client, headers, "Assisted dip", "ASSISTED_BODYWEIGHT_REPS"
    )
    client.put(
        "/api/auth/me",
        headers=headers,
        json={"current_bodyweight_kg": 75},
    )

    response = client.post(
        "/api/workouts",
        headers=headers,
        json={
            "name": "Explicit snapshot",
            "performed_at": "2026-06-29",
            "exercises": [
                {
                    "exercise_id": exercise_id,
                    "sets": [
                        {"bodyweight": 73.5, "assistance_weight": 20, "reps": 8}
                    ],
                }
            ],
        },
    )
    assert response.status_code == 201
    assert response.json()["exercises"][0]["sets"][0]["bodyweight"] == 73.5
