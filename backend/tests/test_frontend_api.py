import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import Settings
from tests.conftest import register


def test_public_config_is_stable_and_does_not_require_auth(client: TestClient) -> None:
    response = client.get("/api/config")
    assert response.status_code == 200
    assert response.json() == {"appName": "CobalTrack", "apiVersion": "0.1.0"}


def test_cors_allows_local_vite_origins(client: TestClient) -> None:
    response = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert response.headers["access-control-allow-credentials"] == "true"


def test_cors_does_not_allow_unknown_origins(client: TestClient) -> None:
    response = client.options(
        "/api/health",
        headers={
            "Origin": "https://untrusted.example",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


def test_cors_configuration_rejects_wildcard() -> None:
    with pytest.raises(ValidationError):
        Settings(backend_cors_origins="*")


def test_nested_response_shapes_are_frontend_ready(client: TestClient) -> None:
    headers = register(client, "frontend@example.com")
    exercise_response = client.post(
        "/api/exercises",
        headers=headers,
        json={"name": "Bench press", "secondary_muscles": ["triceps"]},
    )
    assert exercise_response.status_code == 201
    exercise = exercise_response.json()
    exercise_id = exercise["id"]
    assert exercise["secondary_muscles"][0]["muscle_name"] == "triceps"
    assert client.get("/api/exercises", headers=headers).json() == [exercise]
    assert client.get(f"/api/exercises/{exercise_id}", headers=headers).json() == exercise

    workout_response = client.post(
        "/api/workouts",
        headers=headers,
        json={
            "name": "Push day",
            "performed_at": "2026-06-28",
            "exercises": [
                {
                    "exercise_id": exercise_id,
                    "order_index": 0,
                    "sets": [{"weight": 80, "reps": 8, "order_index": 0}],
                }
            ],
        },
    )
    assert workout_response.status_code == 201, workout_response.text
    workout = workout_response.json()
    assert workout["exercises"][0]["sets"][0]["reps"] == 8
    assert client.get("/api/workouts", headers=headers).json() == [workout]
    assert client.get(f"/api/workouts/{workout['id']}", headers=headers).json() == workout

    program_response = client.post(
        "/api/programs",
        headers=headers,
        json={
            "name": "Push program",
            "days_per_week": 1,
            "days": [
                {
                    "name": "Push",
                    "order_index": 0,
                    "exercises": [
                        {
                            "exercise_id": exercise_id,
                            "order_index": 0,
                            "sets_count": 3,
                            "min_reps": 6,
                            "max_reps": 10,
                        }
                    ],
                }
            ],
        },
    )
    assert program_response.status_code == 201, program_response.text
    program = program_response.json()
    assert program["days"][0]["exercises"][0]["sets_count"] == 3
    assert client.get("/api/programs", headers=headers).json() == [program]
    assert client.get(f"/api/programs/{program['id']}", headers=headers).json() == program


def test_common_api_errors_are_clear(client: TestClient) -> None:
    headers = register(client, "errors@example.com")
    duplicate_email = client.post(
        "/api/auth/register",
        json={
            "email": "errors@example.com",
            "username": "duplicate",
            "password": "password123",
        },
    )
    assert duplicate_email.status_code == 409
    assert duplicate_email.json()["detail"] == "An account with this email already exists"

    missing = client.get("/api/exercises/999", headers=headers)
    assert missing.status_code == 404
    assert missing.json()["detail"] == "Exercise not found"

    invalid = client.post("/api/exercises", headers=headers, json={"name": ""})
    assert invalid.status_code == 422
    assert isinstance(invalid.json()["detail"], list)
