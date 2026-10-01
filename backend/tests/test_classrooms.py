import pytest

BASE = "/api/classrooms"

VALID = {
    "name": "Room 101",
    "building": "Block A",
    "capacity": 40,
    "room_type": "classroom",
    "has_projector": True,
    "has_computers": False,
}


def _create(client, overrides=None):
    return client.post(BASE, json={**VALID, **(overrides or {})})


# --- CRUD ---

def test_create_classroom(db_client):
    r = _create(db_client)
    assert r.status_code == 201
    d = r.get_json()["data"]
    assert d["name"] == "Room 101"
    assert d["id"] is not None


def test_get_classroom(db_client):
    cid = _create(db_client, {"name": "Room 102", "building": "Block B"}).get_json()["data"]["id"]
    r = db_client.get(f"{BASE}/{cid}")
    assert r.status_code == 200
    assert r.get_json()["data"]["id"] == cid


def test_list_classrooms(db_client):
    _create(db_client, {"name": "Room 103", "building": "Block C"})
    r = db_client.get(BASE)
    assert r.status_code == 200
    body = r.get_json()
    assert isinstance(body["data"], list)
    assert "pagination" in body


def test_update_classroom(db_client):
    cid = _create(db_client, {"name": "Room 104", "building": "Block D"}).get_json()["data"]["id"]
    r = db_client.put(f"{BASE}/{cid}", json={**VALID, "name": "Room 104", "building": "Block D", "capacity": 60})
    assert r.status_code == 200
    assert r.get_json()["data"]["capacity"] == 60


def test_patch_classroom(db_client):
    cid = _create(db_client, {"name": "Room 105", "building": "Block E"}).get_json()["data"]["id"]
    r = db_client.patch(f"{BASE}/{cid}", json={"has_computers": True})
    assert r.status_code == 200
    assert r.get_json()["data"]["has_computers"] is True


def test_delete_classroom(db_client):
    cid = _create(db_client, {"name": "Del Room", "building": "Del Block"}).get_json()["data"]["id"]
    assert db_client.delete(f"{BASE}/{cid}").status_code == 204
    assert db_client.get(f"{BASE}/{cid}").status_code == 404


def test_get_nonexistent_classroom(db_client):
    assert db_client.get(f"{BASE}/99999").status_code == 404


# --- Validation ---

def test_missing_name(db_client):
    r = db_client.post(BASE, json={"capacity": 30, "room_type": "classroom"})
    assert r.status_code == 400
    assert "name" in r.get_json()["details"]


def test_zero_capacity(db_client):
    r = _create(db_client, {"name": "ZC Room", "building": "ZC", "capacity": 0})
    assert r.status_code == 400
    assert "capacity" in r.get_json()["details"]


def test_negative_capacity(db_client):
    r = _create(db_client, {"name": "NC Room", "building": "NC", "capacity": -5})
    assert r.status_code == 400


def test_invalid_room_type(db_client):
    r = _create(db_client, {"name": "IR Room", "building": "IR", "room_type": "office"})
    assert r.status_code == 400
    assert "room_type" in r.get_json()["details"]


def test_duplicate_name_same_building(db_client):
    _create(db_client, {"name": "Dup Room", "building": "Dup Block"})
    r = _create(db_client, {"name": "Dup Room", "building": "Dup Block"})
    assert r.status_code == 400


def test_same_name_different_building_allowed(db_client):
    _create(db_client, {"name": "Shared Room", "building": "Block X"})
    r = _create(db_client, {"name": "Shared Room", "building": "Block Y"})
    assert r.status_code == 201


def test_malformed_json(db_client):
    r = db_client.post(BASE, data="bad", content_type="application/json")
    assert r.status_code == 400


# --- Filtering ---

def test_filter_by_building(db_client):
    _create(db_client, {"name": "Filt Room", "building": "Science Block"})
    r = db_client.get(f"{BASE}?building=Science Block")
    for item in r.get_json()["data"]:
        assert item["building"] == "Science Block"


def test_filter_by_room_type(db_client):
    _create(db_client, {"name": "Lab 1", "building": "Lab Block", "room_type": "laboratory"})
    r = db_client.get(f"{BASE}?room_type=laboratory")
    for item in r.get_json()["data"]:
        assert item["room_type"] == "laboratory"


def test_filter_by_min_capacity(db_client):
    _create(db_client, {"name": "Big Room", "building": "Big Block", "capacity": 100})
    r = db_client.get(f"{BASE}?min_capacity=80")
    for item in r.get_json()["data"]:
        assert item["capacity"] >= 80


def test_filter_by_projector(db_client):
    _create(db_client, {"name": "Proj Room", "building": "Proj Block", "has_projector": True})
    r = db_client.get(f"{BASE}?has_projector=true")
    for item in r.get_json()["data"]:
        assert item["has_projector"] is True
