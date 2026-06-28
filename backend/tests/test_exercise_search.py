import json

import pytest
from fastapi.testclient import TestClient

from tests.conftest import register


def _create(client: TestClient, headers: dict, **kwargs: object) -> dict:
    payload = {"name": "Exercise", **kwargs}
    resp = client.post("/api/exercises", headers=headers, json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest.fixture
def auth(client: TestClient) -> dict:
    return register(client)


# ── /search ────────────────────────────────────────────────────────────────

def test_search_returns_paginated_response(client: TestClient, auth: dict) -> None:
    _create(client, auth, name="Alpha")
    _create(client, auth, name="Beta")
    resp = client.get("/api/exercises/search", headers=auth)
    assert resp.status_code == 200
    data = resp.json()
    assert set(data.keys()) >= {"items", "total", "limit", "offset"}
    assert data["total"] == 2
    assert len(data["items"]) == 2
    assert data["limit"] == 50
    assert data["offset"] == 0


def test_search_results_sorted_by_name(client: TestClient, auth: dict) -> None:
    _create(client, auth, name="Zottman Curl")
    _create(client, auth, name="Arnold Press")
    _create(client, auth, name="Bench Press")
    resp = client.get("/api/exercises/search", headers=auth)
    names = [item["name"] for item in resp.json()["items"]]
    assert names == sorted(names)


def test_search_q_filters_by_name_case_insensitive(client: TestClient, auth: dict) -> None:
    _create(client, auth, name="Squat")
    _create(client, auth, name="Deadlift")
    resp = client.get("/api/exercises/search?q=squat", headers=auth)
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["name"] == "Squat"


def test_search_q_partial_match(client: TestClient, auth: dict) -> None:
    _create(client, auth, name="Romanian Deadlift")
    _create(client, auth, name="Conventional Deadlift")
    _create(client, auth, name="Squat")
    resp = client.get("/api/exercises/search?q=deadlift", headers=auth)
    assert resp.json()["total"] == 2


@pytest.mark.parametrize(
    "query",
    ["pull-up", "pull up", "pull   up", "pull_up", "pull'up", "pull’up", "Pull Up"],
)
def test_search_q_normalizes_separators_and_case(
    client: TestClient, auth: dict, query: str
) -> None:
    _create(client, auth, name="pull-up")

    data = client.get("/api/exercises/search", params={"q": query}, headers=auth).json()

    assert data["total"] == 1
    assert data["items"][0]["name"] == "pull-up"


def test_search_q_matches_translated_name(client: TestClient, auth: dict) -> None:
    _create(
        client,
        auth,
        name="pull-up",
        translations=json.dumps({"fr": {"name": "traction"}}),
    )

    data = client.get("/api/exercises/search?q=traction", headers=auth).json()

    assert data["total"] == 1
    assert data["items"][0]["name"] == "pull-up"


def test_search_q_ranks_translated_name_before_instruction_match(
    client: TestClient, auth: dict
) -> None:
    _create(client, auth, name="Aardvark movement", instructions="Finish with a traction")
    _create(
        client,
        auth,
        name="Pull-up",
        translations=json.dumps({"fr": {"name": "traction"}}),
    )

    data = client.get("/api/exercises/search?q=traction&limit=1", headers=auth).json()

    assert data["total"] == 2
    assert data["items"][0]["name"] == "Pull-up"


def test_search_q_ignores_accents(client: TestClient, auth: dict) -> None:
    _create(client, auth, name="Développé couché")

    data = client.get("/api/exercises/search?q=developpe", headers=auth).json()

    assert data["total"] == 1
    assert data["items"][0]["name"] == "Développé couché"


def test_search_q_paginates_after_normalized_translation_filtering(
    client: TestClient, auth: dict
) -> None:
    for index in range(4):
        _create(
            client,
            auth,
            name=f"Pull variation {index}",
            translations=json.dumps({"fr": {"name": f"Traction variante {index}"}}),
        )
    _create(client, auth, name="Squat")

    first_page = client.get(
        "/api/exercises/search?q=traction&limit=2&offset=0", headers=auth
    ).json()
    second_page = client.get(
        "/api/exercises/search?q=traction&limit=2&offset=2", headers=auth
    ).json()

    assert first_page["total"] == second_page["total"] == 4
    assert len(first_page["items"]) == len(second_page["items"]) == 2
    assert {item["id"] for item in first_page["items"]}.isdisjoint(
        {item["id"] for item in second_page["items"]}
    )


def test_search_q_keeps_muscle_and_equipment_filters(
    client: TestClient, auth: dict
) -> None:
    translation = json.dumps({"fr": {"name": "traction"}})
    _create(
        client,
        auth,
        name="pull-up",
        translations=translation,
        muscle_group="back",
        equipment="bar",
    )
    _create(
        client,
        auth,
        name="assisted pull-up",
        translations=translation,
        muscle_group="back",
        equipment="machine",
    )
    _create(
        client,
        auth,
        name="band pull-up",
        translations=translation,
        muscle_group="arms",
        equipment="bar",
    )

    data = client.get(
        "/api/exercises/search?q=traction&muscle_group=back&equipment=bar",
        headers=auth,
    ).json()

    assert data["total"] == 1
    assert data["items"][0]["name"] == "pull-up"


def test_search_muscle_group_filter(client: TestClient, auth: dict) -> None:
    _create(client, auth, name="Bench Press", muscle_group="chest")
    _create(client, auth, name="Squat", muscle_group="quads")
    _create(client, auth, name="Incline DB", muscle_group="chest")
    resp = client.get("/api/exercises/search?muscle_group=chest", headers=auth)
    data = resp.json()
    assert data["total"] == 2
    assert all(item["muscle_group"] == "chest" for item in data["items"])


def test_search_muscle_group_uses_coalesce(client: TestClient, auth: dict) -> None:
    _create(client, auth, name="Pulldown", body_part="back")
    _create(client, auth, name="Row", target="back")
    _create(client, auth, name="Curl", muscle_group="biceps")
    resp = client.get("/api/exercises/search?muscle_group=back", headers=auth)
    assert resp.json()["total"] == 2


def test_search_equipment_filter(client: TestClient, auth: dict) -> None:
    _create(client, auth, name="Barbell Squat", equipment="barbell")
    _create(client, auth, name="DB Press", equipment="dumbbell")
    _create(client, auth, name="Barbell Row", equipment="barbell")
    resp = client.get("/api/exercises/search?equipment=barbell", headers=auth)
    data = resp.json()
    assert data["total"] == 2
    assert all(item["equipment"] == "barbell" for item in data["items"])


def test_search_combined_filters(client: TestClient, auth: dict) -> None:
    _create(client, auth, name="Barbell Bench", equipment="barbell", muscle_group="chest")
    _create(client, auth, name="DB Bench", equipment="dumbbell", muscle_group="chest")
    _create(client, auth, name="Barbell Row", equipment="barbell", muscle_group="back")
    resp = client.get("/api/exercises/search?equipment=barbell&muscle_group=chest", headers=auth)
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["name"] == "Barbell Bench"


def test_search_pagination_limit(client: TestClient, auth: dict) -> None:
    for i in range(5):
        _create(client, auth, name=f"Exercise {i:02d}")
    resp = client.get("/api/exercises/search?limit=3", headers=auth)
    data = resp.json()
    assert data["total"] == 5
    assert len(data["items"]) == 3
    assert data["limit"] == 3


def test_search_pagination_offset(client: TestClient, auth: dict) -> None:
    for i in range(5):
        _create(client, auth, name=f"Exercise {i:02d}")
    page1 = client.get("/api/exercises/search?limit=2&offset=0", headers=auth).json()
    page2 = client.get("/api/exercises/search?limit=2&offset=2", headers=auth).json()
    ids_p1 = {item["id"] for item in page1["items"]}
    ids_p2 = {item["id"] for item in page2["items"]}
    assert ids_p1.isdisjoint(ids_p2)
    assert page1["total"] == page2["total"] == 5


def test_search_limit_max_100(client: TestClient, auth: dict) -> None:
    resp = client.get("/api/exercises/search?limit=101", headers=auth)
    assert resp.status_code == 422


def test_search_limit_min_1(client: TestClient, auth: dict) -> None:
    resp = client.get("/api/exercises/search?limit=0", headers=auth)
    assert resp.status_code == 422


def test_search_empty_result(client: TestClient, auth: dict) -> None:
    resp = client.get("/api/exercises/search?q=nonexistent_xyz", headers=auth)
    data = resp.json()
    assert data["total"] == 0
    assert data["items"] == []


# ── /filters ───────────────────────────────────────────────────────────────

def test_filters_returns_distinct_muscle_groups(client: TestClient, auth: dict) -> None:
    _create(client, auth, name="A", muscle_group="chest")
    _create(client, auth, name="B", muscle_group="chest")
    _create(client, auth, name="C", muscle_group="back")
    resp = client.get("/api/exercises/filters", headers=auth)
    assert resp.status_code == 200
    data = resp.json()
    assert "muscle_groups" in data
    assert "equipment" in data
    assert data["muscle_groups"] == sorted({"chest", "back"})


def test_filters_muscle_groups_coalesce(client: TestClient, auth: dict) -> None:
    _create(client, auth, name="A", muscle_group="chest")
    _create(client, auth, name="B", target="back")
    _create(client, auth, name="C", body_part="legs")
    resp = client.get("/api/exercises/filters", headers=auth)
    groups = set(resp.json()["muscle_groups"])
    assert groups == {"back", "chest", "legs"}


def test_filters_returns_distinct_equipment(client: TestClient, auth: dict) -> None:
    _create(client, auth, name="A", equipment="barbell")
    _create(client, auth, name="B", equipment="dumbbell")
    _create(client, auth, name="C", equipment="barbell")
    resp = client.get("/api/exercises/filters", headers=auth)
    equip = resp.json()["equipment"]
    assert equip == sorted({"barbell", "dumbbell"})


def test_filters_excludes_nulls(client: TestClient, auth: dict) -> None:
    _create(client, auth, name="No group")
    resp = client.get("/api/exercises/filters", headers=auth)
    data = resp.json()
    assert None not in data["muscle_groups"]
    assert None not in data["equipment"]


# ── backward compat ────────────────────────────────────────────────────────

def test_get_exercises_still_returns_list(client: TestClient, auth: dict) -> None:
    _create(client, auth, name="Existing")
    resp = client.get("/api/exercises", headers=auth)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    assert resp.json()[0]["name"] == "Existing"
