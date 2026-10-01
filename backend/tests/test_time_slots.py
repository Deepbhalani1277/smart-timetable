import pytest

BASE = "/api/time-slots"

VALID = {
    "day_of_week": "Monday",
    "start_time": "09:00",
    "end_time": "10:00",
    "is_break": False,
}


def _create(client, overrides=None):
    return client.post(BASE, json={**VALID, **(overrides or {})})


# --- CRUD ---

def test_create_time_slot(db_client):
    r = _create(db_client)
    assert r.status_code == 201
    d = r.get_json()["data"]
    assert d["day_of_week"] == "Monday"
    assert d["start_time"] == "09:00"
    assert d["end_time"] == "10:00"


def test_get_time_slot(db_client):
    tid = _create(db_client, {"day_of_week": "Friday", "start_time": "09:00", "end_time": "10:00"}).get_json()["data"]["id"]
    r = db_client.get(f"{BASE}/{tid}")
    assert r.status_code == 200
    assert r.get_json()["data"]["id"] == tid


def test_list_time_slots(db_client):
    _create(db_client, {"day_of_week": "Tuesday", "start_time": "09:00", "end_time": "10:00"})
    r = db_client.get(BASE)
    assert r.status_code == 200
    body = r.get_json()
    assert isinstance(body["data"], list)
    assert "pagination" in body


def test_update_time_slot(db_client):
    tid = _create(db_client, {"day_of_week": "Wednesday", "start_time": "09:00", "end_time": "10:00"}).get_json()["data"]["id"]
    r = db_client.put(f"{BASE}/{tid}", json={**VALID, "day_of_week": "Wednesday", "label": "Morning"})
    assert r.status_code == 200
    assert r.get_json()["data"]["label"] == "Morning"


def test_patch_time_slot(db_client):
    tid = _create(db_client, {"day_of_week": "Thursday", "start_time": "09:00", "end_time": "10:00"}).get_json()["data"]["id"]
    r = db_client.patch(f"{BASE}/{tid}", json={"label": "Patched"})
    assert r.status_code == 200
    assert r.get_json()["data"]["label"] == "Patched"


def test_delete_time_slot(db_client):
    tid = _create(db_client, {"day_of_week": "Friday", "start_time": "14:00", "end_time": "15:00"}).get_json()["data"]["id"]
    assert db_client.delete(f"{BASE}/{tid}").status_code == 204
    assert db_client.get(f"{BASE}/{tid}").status_code == 404


def test_get_nonexistent_slot(db_client):
    assert db_client.get(f"{BASE}/99999").status_code == 404


# --- Validation ---

def test_missing_day(db_client):
    r = db_client.post(BASE, json={"start_time": "09:00", "end_time": "10:00"})
    assert r.status_code == 400
    assert "day_of_week" in r.get_json()["details"]


def test_invalid_day(db_client):
    r = _create(db_client, {"day_of_week": "Funday"})
    assert r.status_code == 400
    assert "day_of_week" in r.get_json()["details"]


def test_end_before_start(db_client):
    r = _create(db_client, {"start_time": "10:00", "end_time": "09:00"})
    assert r.status_code == 400
    assert "end_time" in r.get_json()["details"]


def test_end_equal_start(db_client):
    r = _create(db_client, {"start_time": "10:00", "end_time": "10:00"})
    assert r.status_code == 400


def test_invalid_time_format(db_client):
    r = _create(db_client, {"start_time": "9am"})
    assert r.status_code == 400
    assert "start_time" in r.get_json()["details"]


def test_malformed_json(db_client):
    r = db_client.post(BASE, data="bad", content_type="application/json")
    assert r.status_code == 400


# --- Overlap detection ---

def test_overlapping_slot_rejected(db_client):
    _create(db_client, {"day_of_week": "Tuesday", "start_time": "09:00", "end_time": "10:00"})
    r = _create(db_client, {"day_of_week": "Tuesday", "start_time": "09:30", "end_time": "10:30"})
    assert r.status_code == 400
    assert "time" in r.get_json()["details"]


def test_contained_slot_rejected(db_client):
    _create(db_client, {"day_of_week": "Wednesday", "start_time": "08:00", "end_time": "11:00"})
    r = _create(db_client, {"day_of_week": "Wednesday", "start_time": "09:00", "end_time": "10:00"})
    assert r.status_code == 400


def test_adjacent_slot_allowed(db_client):
    _create(db_client, {"day_of_week": "Thursday", "start_time": "09:00", "end_time": "10:00"})
    r = _create(db_client, {"day_of_week": "Thursday", "start_time": "10:00", "end_time": "11:00"})
    assert r.status_code == 201


def test_different_day_no_conflict(db_client):
    _create(db_client, {"day_of_week": "Monday", "start_time": "11:00", "end_time": "12:00"})
    r = _create(db_client, {"day_of_week": "Saturday", "start_time": "11:00", "end_time": "12:00"})
    assert r.status_code == 201


# --- Break slots ---

def test_create_break_slot(db_client):
    r = _create(db_client, {
        "day_of_week": "Sunday",
        "start_time": "13:00",
        "end_time": "14:00",
        "is_break": True,
    })
    assert r.status_code == 201
    assert r.get_json()["data"]["is_break"] is True


def test_break_slot_still_blocks_overlap(db_client):
    _create(db_client, {"day_of_week": "Friday", "start_time": "12:00", "end_time": "13:00", "is_break": True})
    r = _create(db_client, {"day_of_week": "Friday", "start_time": "12:30", "end_time": "13:30"})
    assert r.status_code == 400


# --- Filtering ---

def test_filter_by_day(db_client):
    _create(db_client, {"day_of_week": "Saturday", "start_time": "08:00", "end_time": "09:00"})
    r = db_client.get(f"{BASE}?day_of_week=Saturday")
    for item in r.get_json()["data"]:
        assert item["day_of_week"] == "Saturday"


def test_filter_by_is_break(db_client):
    _create(db_client, {"day_of_week": "Sunday", "start_time": "10:00", "end_time": "11:00", "is_break": True})
    r = db_client.get(f"{BASE}?is_break=true")
    for item in r.get_json()["data"]:
        assert item["is_break"] is True
