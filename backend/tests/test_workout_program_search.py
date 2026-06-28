import pytest
from fastapi.testclient import TestClient

from tests.conftest import register


EXERCISE_PAYLOAD = {"name": "Squat"}
WORKOUT_BASE = {"name": "Push day", "performed_at": "2026-06-01"}
PROGRAM_BASE = {"name": "Strength", "days_per_week": 3, "is_active": True}


@pytest.fixture
def auth(client: TestClient) -> dict:
    return register(client)


@pytest.fixture
def exercise_id(client: TestClient, auth: dict) -> int:
    resp = client.post("/api/exercises", headers=auth, json=EXERCISE_PAYLOAD)
    assert resp.status_code == 201
    return resp.json()["id"]


def _make_workout(client: TestClient, auth: dict, **kwargs: object) -> dict:
    payload = {**WORKOUT_BASE, **kwargs}
    resp = client.post("/api/workouts", headers=auth, json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


def _make_program(client: TestClient, auth: dict, **kwargs: object) -> dict:
    payload = {**PROGRAM_BASE, **kwargs}
    resp = client.post("/api/programs", headers=auth, json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── /workouts/search ───────────────────────────────────────────────────────

def test_workout_search_returns_paginated_shape(client: TestClient, auth: dict) -> None:
    _make_workout(client, auth)
    resp = client.get("/api/workouts/search", headers=auth)
    assert resp.status_code == 200
    data = resp.json()
    assert set(data.keys()) >= {"items", "total", "limit", "offset"}
    assert data["total"] == 1
    assert data["limit"] == 20
    assert data["offset"] == 0


def test_workout_search_q_filters_by_name(client: TestClient, auth: dict) -> None:
    _make_workout(client, auth, name="Push day")
    _make_workout(client, auth, name="Leg day")
    resp = client.get("/api/workouts/search?q=push", headers=auth)
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["name"] == "Push day"


def test_workout_search_date_from(client: TestClient, auth: dict) -> None:
    _make_workout(client, auth, performed_at="2026-01-01")
    _make_workout(client, auth, performed_at="2026-06-01")
    resp = client.get("/api/workouts/search?date_from=2026-03-01", headers=auth)
    assert resp.json()["total"] == 1
    assert resp.json()["items"][0]["performed_at"] == "2026-06-01"


def test_workout_search_date_to(client: TestClient, auth: dict) -> None:
    _make_workout(client, auth, performed_at="2026-01-01")
    _make_workout(client, auth, performed_at="2026-06-01")
    resp = client.get("/api/workouts/search?date_to=2026-03-01", headers=auth)
    assert resp.json()["total"] == 1
    assert resp.json()["items"][0]["performed_at"] == "2026-01-01"


def test_workout_search_date_range(client: TestClient, auth: dict) -> None:
    _make_workout(client, auth, performed_at="2026-01-01")
    _make_workout(client, auth, performed_at="2026-04-01")
    _make_workout(client, auth, performed_at="2026-06-01")
    resp = client.get("/api/workouts/search?date_from=2026-03-01&date_to=2026-05-01", headers=auth)
    assert resp.json()["total"] == 1


def test_workout_search_sorted_by_date_desc(client: TestClient, auth: dict) -> None:
    _make_workout(client, auth, performed_at="2026-01-01", name="Old")
    _make_workout(client, auth, performed_at="2026-06-01", name="New")
    items = client.get("/api/workouts/search", headers=auth).json()["items"]
    assert items[0]["name"] == "New"
    assert items[1]["name"] == "Old"


def test_workout_search_pagination(client: TestClient, auth: dict) -> None:
    for i in range(5):
        _make_workout(client, auth, name=f"W{i:02d}", performed_at=f"2026-0{i+1}-01")
    page1 = client.get("/api/workouts/search?limit=2&offset=0", headers=auth).json()
    page2 = client.get("/api/workouts/search?limit=2&offset=2", headers=auth).json()
    assert page1["total"] == 5
    ids1 = {w["id"] for w in page1["items"]}
    ids2 = {w["id"] for w in page2["items"]}
    assert ids1.isdisjoint(ids2)


def test_workout_search_limit_max(client: TestClient, auth: dict) -> None:
    assert client.get("/api/workouts/search?limit=101", headers=auth).status_code == 422


def test_workout_search_user_isolation(client: TestClient) -> None:
    owner = register(client, "owner@example.com")
    other = register(client, "other@example.com")
    _make_workout(client, owner)
    resp = client.get("/api/workouts/search", headers=other)
    assert resp.json()["total"] == 0


def test_workouts_legacy_list_unchanged(client: TestClient, auth: dict) -> None:
    _make_workout(client, auth)
    resp = client.get("/api/workouts", headers=auth)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ── /programs/search ───────────────────────────────────────────────────────

def test_program_search_returns_paginated_shape(client: TestClient, auth: dict) -> None:
    _make_program(client, auth)
    resp = client.get("/api/programs/search", headers=auth)
    assert resp.status_code == 200
    data = resp.json()
    assert set(data.keys()) >= {"items", "total", "limit", "offset"}
    assert data["total"] == 1


def test_program_search_q_filters_by_name(client: TestClient, auth: dict) -> None:
    _make_program(client, auth, name="Strength")
    _make_program(client, auth, name="Hypertrophy")
    resp = client.get("/api/programs/search?q=strength", headers=auth)
    assert resp.json()["total"] == 1
    assert resp.json()["items"][0]["name"] == "Strength"


def test_program_search_q_filters_by_goal(client: TestClient, auth: dict) -> None:
    _make_program(client, auth, name="Plan A", goal="Build muscle")
    _make_program(client, auth, name="Plan B", goal="Lose weight")
    resp = client.get("/api/programs/search?q=muscle", headers=auth)
    assert resp.json()["total"] == 1


def test_program_search_is_active_true(client: TestClient, auth: dict) -> None:
    _make_program(client, auth, name="Active", is_active=True)
    _make_program(client, auth, name="Inactive", is_active=False)
    resp = client.get("/api/programs/search?is_active=true", headers=auth)
    assert resp.json()["total"] == 1
    assert resp.json()["items"][0]["name"] == "Active"


def test_program_search_is_active_false(client: TestClient, auth: dict) -> None:
    _make_program(client, auth, name="Active", is_active=True)
    _make_program(client, auth, name="Inactive", is_active=False)
    resp = client.get("/api/programs/search?is_active=false", headers=auth)
    assert resp.json()["total"] == 1
    assert resp.json()["items"][0]["name"] == "Inactive"


def test_program_search_sorted_active_first(client: TestClient, auth: dict) -> None:
    _make_program(client, auth, name="Inactive", is_active=False)
    _make_program(client, auth, name="Active", is_active=True)
    items = client.get("/api/programs/search", headers=auth).json()["items"]
    assert items[0]["name"] == "Active"


def test_program_search_pagination(client: TestClient, auth: dict) -> None:
    for i in range(5):
        _make_program(client, auth, name=f"P{i}")
    page1 = client.get("/api/programs/search?limit=2&offset=0", headers=auth).json()
    page2 = client.get("/api/programs/search?limit=2&offset=2", headers=auth).json()
    assert page1["total"] == 5
    ids1 = {p["id"] for p in page1["items"]}
    ids2 = {p["id"] for p in page2["items"]}
    assert ids1.isdisjoint(ids2)


def test_program_search_limit_max(client: TestClient, auth: dict) -> None:
    assert client.get("/api/programs/search?limit=101", headers=auth).status_code == 422


def test_program_search_user_isolation(client: TestClient) -> None:
    owner = register(client, "owner2@example.com")
    other = register(client, "other2@example.com")
    _make_program(client, owner)
    resp = client.get("/api/programs/search", headers=other)
    assert resp.json()["total"] == 0


def test_programs_legacy_list_unchanged(client: TestClient, auth: dict) -> None:
    _make_program(client, auth)
    resp = client.get("/api/programs", headers=auth)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
