import pytest

BASE = "/api/student-groups"

VALID = {
    "name": "CS-A",
    "department": "CS",
    "academic_year": "2024-25",
    "semester": 3,
    "student_count": 60,
}

VALID_SUBJECT = {
    "name": "OS",
    "code": "CS501",
    "department": "CS",
    "semester": 5,
    "weekly_sessions": 3,
    "duration_minutes": 60,
    "subject_type": "theory",
    "required_room_type": "classroom",
}


def _create(client, overrides=None):
    return client.post(BASE, json={**VALID, **(overrides or {})})


def _create_subject(client, overrides=None):
    return client.post("/api/subjects", json={**VALID_SUBJECT, **(overrides or {})})


# --- CRUD ---

def test_create_group(db_client):
    r = _create(db_client)
    assert r.status_code == 201
    d = r.get_json()["data"]
    assert d["name"] == "CS-A"
    assert d["id"] is not None


def test_get_group(db_client):
    gid = _create(db_client).get_json()["data"]["id"]
    r = db_client.get(f"{BASE}/{gid}")
    assert r.status_code == 200
    assert r.get_json()["data"]["id"] == gid


def test_list_groups(db_client):
    _create(db_client)
    r = db_client.get(BASE)
    assert r.status_code == 200
    body = r.get_json()
    assert isinstance(body["data"], list)
    assert "pagination" in body


def test_update_group(db_client):
    gid = _create(db_client).get_json()["data"]["id"]
    r = db_client.put(f"{BASE}/{gid}", json={**VALID, "student_count": 70})
    assert r.status_code == 200
    assert r.get_json()["data"]["student_count"] == 70


def test_patch_group(db_client):
    gid = _create(db_client).get_json()["data"]["id"]
    r = db_client.patch(f"{BASE}/{gid}", json={"division": "A"})
    assert r.status_code == 200
    assert r.get_json()["data"]["division"] == "A"


def test_delete_group(db_client):
    gid = _create(db_client, {"name": "Del Group"}).get_json()["data"]["id"]
    assert db_client.delete(f"{BASE}/{gid}").status_code == 204
    assert db_client.get(f"{BASE}/{gid}").status_code == 404


def test_get_nonexistent_group(db_client):
    assert db_client.get(f"{BASE}/99999").status_code == 404


# --- Validation ---

def test_missing_name(db_client):
    r = db_client.post(BASE, json={"department": "CS", "academic_year": "2024", "semester": 1, "student_count": 30})
    assert r.status_code == 400
    assert "name" in r.get_json()["details"]


def test_missing_department(db_client):
    r = db_client.post(BASE, json={"name": "X", "academic_year": "2024", "semester": 1, "student_count": 30})
    assert r.status_code == 400
    assert "department" in r.get_json()["details"]


def test_zero_student_count(db_client):
    r = _create(db_client, {"name": "ZSC", "student_count": 0})
    assert r.status_code == 400
    assert "student_count" in r.get_json()["details"]


def test_negative_student_count(db_client):
    r = _create(db_client, {"name": "NSC", "student_count": -5})
    assert r.status_code == 400


def test_invalid_semester(db_client):
    r = _create(db_client, {"name": "IS", "semester": 0})
    assert r.status_code == 400


def test_malformed_json(db_client):
    r = db_client.post(BASE, data="bad", content_type="application/json")
    assert r.status_code == 400


# --- Filtering ---

def test_filter_by_department(db_client):
    _create(db_client, {"name": "MATH-A", "department": "MATH"})
    r = db_client.get(f"{BASE}?department=MATH")
    for item in r.get_json()["data"]:
        assert item["department"] == "MATH"


def test_filter_by_academic_year(db_client):
    _create(db_client, {"name": "AY Group", "academic_year": "2023-24"})
    r = db_client.get(f"{BASE}?academic_year=2023-24")
    for item in r.get_json()["data"]:
        assert item["academic_year"] == "2023-24"


# --- Subject assignments ---

def test_assign_subject_to_group(db_client):
    gid = _create(db_client, {"name": "Asgn Group 1"}).get_json()["data"]["id"]
    sid = _create_subject(db_client, {"code": "GS101"}).get_json()["data"]["id"]
    r = db_client.post(f"{BASE}/{gid}/subjects", json={"subject_ids": [sid]})
    assert r.status_code == 200
    assert any(s["id"] == sid for s in r.get_json()["data"])


def test_get_group_subjects(db_client):
    gid = _create(db_client, {"name": "Asgn Group 2"}).get_json()["data"]["id"]
    sid = _create_subject(db_client, {"code": "GS102"}).get_json()["data"]["id"]
    db_client.post(f"{BASE}/{gid}/subjects", json={"subject_ids": [sid]})
    r = db_client.get(f"{BASE}/{gid}/subjects")
    assert r.status_code == 200
    assert any(s["id"] == sid for s in r.get_json()["data"])


def test_remove_subject_from_group(db_client):
    gid = _create(db_client, {"name": "Asgn Group 3"}).get_json()["data"]["id"]
    sid = _create_subject(db_client, {"code": "GS103"}).get_json()["data"]["id"]
    db_client.post(f"{BASE}/{gid}/subjects", json={"subject_ids": [sid]})
    r = db_client.delete(f"{BASE}/{gid}/subjects/{sid}")
    assert r.status_code == 204


def test_duplicate_group_assignment_rejected(db_client):
    gid = _create(db_client, {"name": "Asgn Group 4"}).get_json()["data"]["id"]
    sid = _create_subject(db_client, {"code": "GS104"}).get_json()["data"]["id"]
    db_client.post(f"{BASE}/{gid}/subjects", json={"subject_ids": [sid]})
    r = db_client.post(f"{BASE}/{gid}/subjects", json={"subject_ids": [sid]})
    assert r.status_code == 409


def test_assign_nonexistent_subject_to_group(db_client):
    gid = _create(db_client, {"name": "Asgn Group 5"}).get_json()["data"]["id"]
    r = db_client.post(f"{BASE}/{gid}/subjects", json={"subject_ids": [99999]})
    assert r.status_code == 404


def test_assign_to_nonexistent_group(db_client):
    r = db_client.post(f"{BASE}/99999/subjects", json={"subject_ids": [1]})
    assert r.status_code == 404


def test_bulk_group_assignment_all_or_nothing(db_client):
    gid = _create(db_client, {"name": "Bulk Group"}).get_json()["data"]["id"]
    sid = _create_subject(db_client, {"code": "GS105"}).get_json()["data"]["id"]
    r = db_client.post(f"{BASE}/{gid}/subjects", json={"subject_ids": [sid, 99999]})
    assert r.status_code == 404
    r2 = db_client.get(f"{BASE}/{gid}/subjects")
    assert not any(s["id"] == sid for s in r2.get_json()["data"])
