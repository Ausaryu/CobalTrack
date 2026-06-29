import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User
from tests.conftest import register


def test_healthcheck(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_openapi_documentation_is_available(client: TestClient) -> None:
    response = client.get("/docs")
    assert response.status_code == 200
    assert "Swagger UI" in response.text


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("GET", "/api/auth/me"),
        ("PUT", "/api/auth/me"),
        ("POST", "/api/auth/logout"),
        ("GET", "/api/exercises"),
        ("GET", "/api/exercises/search"),
        ("GET", "/api/exercises/filters"),
        ("POST", "/api/exercises"),
        ("GET", "/api/exercises/1"),
        ("PUT", "/api/exercises/1"),
        ("DELETE", "/api/exercises/1"),
        ("GET", "/api/exercises/1/personalization"),
        ("PUT", "/api/exercises/1/personalization"),
        ("DELETE", "/api/exercises/1/personalization"),
        ("GET", "/api/workouts"),
        ("GET", "/api/workouts/search"),
        ("POST", "/api/workouts"),
        ("GET", "/api/workouts/1"),
        ("PUT", "/api/workouts/1"),
        ("DELETE", "/api/workouts/1"),
        ("GET", "/api/programs"),
        ("GET", "/api/programs/search"),
        ("POST", "/api/programs"),
        ("GET", "/api/programs/1"),
        ("PUT", "/api/programs/1"),
        ("DELETE", "/api/programs/1"),
        ("GET", "/api/stats/dashboard"),
        ("GET", "/api/stats/exercises/1"),
    ],
)
def test_private_routes_require_a_bearer_token(
    client: TestClient, method: str, path: str
) -> None:
    response = client.request(method, path)
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_authentication_hashes_password(client: TestClient, db: Session) -> None:
    headers = register(client)
    user = db.scalar(select(User))
    assert user is not None
    assert user.hashed_password != "password123"

    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["username"] == "user"
    assert response.json()["is_admin"] is True
    assert "email" not in response.json()
    assert "hashed_password" not in response.json()

    login = client.post(
        "/api/auth/login",
        json={"username": "USER", "password": "password123"},
    )
    assert login.status_code == 200
    assert client.post("/api/auth/logout", headers=headers).status_code == 200


def test_exercises_and_user_personalization_are_separate(client: TestClient) -> None:
    first_user = register(client, "first@example.com")
    second_user = register(client, "second@example.com")

    created = client.post(
        "/api/exercises",
        headers=first_user,
        json={
            "external_id": "bench-press",
            "name": "Bench press",
            "secondary_muscles": ["triceps", "front delts"],
        },
    )
    assert created.status_code == 201, created.text
    exercise_id = created.json()["id"]
    assert len(created.json()["secondary_muscles"]) == 2

    personalized = client.put(
        f"/api/exercises/{exercise_id}/personalization",
        headers=first_user,
        json={"custom_name": "Bench", "is_favorite": True},
    )
    assert personalized.status_code == 200
    assert personalized.json()["user_id"] != 0

    other_preference = client.get(
        f"/api/exercises/{exercise_id}/personalization", headers=second_user
    )
    assert other_preference.status_code == 200
    assert other_preference.json() is None

    global_exercise = client.get(f"/api/exercises/{exercise_id}", headers=second_user)
    assert global_exercise.status_code == 200
    assert global_exercise.json()["name"] == "Bench press"

    forbidden_update = client.put(
        f"/api/exercises/{exercise_id}",
        headers=second_user,
        json={"name": "Unauthorized name"},
    )
    assert forbidden_update.status_code == 403
    assert forbidden_update.json()["detail"] == "Administrator privileges required"

    updated = client.put(
        f"/api/exercises/{exercise_id}",
        headers=first_user,
        json={"name": "Barbell bench press", "secondary_muscles": ["triceps"]},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["name"] == "Barbell bench press"
    assert len(updated.json()["secondary_muscles"]) == 1
    assert len(client.get("/api/exercises", headers=first_user).json()) == 1

    assert client.delete(
        f"/api/exercises/{exercise_id}/personalization", headers=first_user
    ).status_code == 204
    assert client.delete(f"/api/exercises/{exercise_id}", headers=first_user).status_code == 204


def test_non_admin_cannot_mutate_global_exercises(client: TestClient) -> None:
    admin = register(client, "admin")
    member = register(client, "member")
    created = client.post(
        "/api/exercises",
        headers=admin,
        json={"name": "Admin exercise"},
    )
    assert created.status_code == 201
    exercise_id = created.json()["id"]

    member_profile = client.get("/api/auth/me", headers=member)
    assert member_profile.json()["is_admin"] is False
    assert client.post(
        "/api/exercises",
        headers=member,
        json={"name": "Forbidden exercise"},
    ).status_code == 403
    assert client.put(
        f"/api/exercises/{exercise_id}",
        headers=member,
        json={"name": "Forbidden update"},
    ).status_code == 403
    assert client.delete(
        f"/api/exercises/{exercise_id}",
        headers=member,
    ).status_code == 403


def test_exercise_tracking_type_is_returned_and_can_be_selected(
    client: TestClient,
) -> None:
    admin = register(client, "tracking-admin")
    default_exercise = client.post(
        "/api/exercises",
        headers=admin,
        json={"name": "Default tracking"},
    )
    assert default_exercise.status_code == 201
    assert default_exercise.json()["tracking_type"] == "WEIGHT_REPS"

    timed_exercise = client.post(
        "/api/exercises",
        headers=admin,
        json={"name": "Plank", "tracking_type": "TIME"},
    )
    assert timed_exercise.status_code == 201
    assert timed_exercise.json()["tracking_type"] == "TIME"

    invalid_exercise = client.post(
        "/api/exercises",
        headers=admin,
        json={"name": "Invalid", "tracking_type": "DISTANCE_ONLY"},
    )
    assert invalid_exercise.status_code == 422


def test_workouts_and_programs_are_scoped_to_the_owner(client: TestClient) -> None:
    owner = register(client, "owner@example.com")
    stranger = register(client, "stranger@example.com")
    exercise = client.post(
        "/api/exercises", headers=owner, json={"name": "Squat"}
    ).json()

    workout_payload = {
        "name": "Leg day",
        "performed_at": "2026-06-28",
        "duration_minutes": 50,
        "exercises": [
            {
                "exercise_id": exercise["id"],
                "sets": [{"weight": 80, "reps": 8, "order_index": 0}],
            }
        ],
    }
    workout = client.post("/api/workouts", headers=owner, json=workout_payload)
    assert workout.status_code == 201, workout.text
    workout_id = workout.json()["id"]
    assert workout.json()["exercises"][0]["sets"][0]["reps"] == 8
    assert client.get(f"/api/workouts/{workout_id}", headers=stranger).status_code == 404
    assert client.put(
        f"/api/workouts/{workout_id}", headers=stranger, json={"name": "Stolen"}
    ).status_code == 404
    assert client.delete(f"/api/workouts/{workout_id}", headers=stranger).status_code == 404

    updated_workout = client.put(
        f"/api/workouts/{workout_id}",
        headers=owner,
        json={"notes": "Good session", "exercises": []},
    )
    assert updated_workout.status_code == 200, updated_workout.text
    assert updated_workout.json()["notes"] == "Good session"
    assert updated_workout.json()["exercises"] == []

    program_payload = {
        "name": "Strength",
        "days_per_week": 1,
        "days": [
            {
                "name": "Day 1",
                "exercises": [
                    {
                        "exercise_id": exercise["id"],
                        "sets_count": 3,
                        "min_reps": 5,
                        "max_reps": 8,
                    }
                ],
            }
        ],
    }
    program = client.post("/api/programs", headers=owner, json=program_payload)
    assert program.status_code == 201, program.text
    program_id = program.json()["id"]
    assert program.json()["days"][0]["exercises"][0]["sets_count"] == 3
    assert client.get(f"/api/programs/{program_id}", headers=stranger).status_code == 404
    assert client.get("/api/workouts", headers=stranger).json() == []
    assert client.get("/api/programs", headers=stranger).json() == []

    updated_program = client.put(
        f"/api/programs/{program_id}",
        headers=owner,
        json={"goal": "Updated goal", "days": []},
    )
    assert updated_program.status_code == 200, updated_program.text
    assert updated_program.json()["goal"] == "Updated goal"
    assert updated_program.json()["days"] == []

    assert client.delete(f"/api/workouts/{workout_id}", headers=owner).status_code == 204
    assert client.delete(f"/api/programs/{program_id}", headers=owner).status_code == 204
    assert client.get(f"/api/workouts/{workout_id}", headers=owner).status_code == 404
    assert client.get(f"/api/programs/{program_id}", headers=owner).status_code == 404
