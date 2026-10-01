import pytest

BASE = "/api/faculty"

VALID = {
    "name": "Dr. Alice",
    "department": "CS",
    "email": "alice@uni.edu",
}

VALID_SUBJECT = {
    "name": "Algorithms",
    "code": "CS401",
    "department": "CS",
    "semester": 4,
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

def test_create_faculty(db_client):
    r = _create(db_client)
    assert r.status_code == 201
    d = r.get_json()["data"]
    assert d["name"] == "Dr. Alice"
    assert d["id"] is not None


def test_get_faculty(db_client):
    fid = _create(db_client, {"email": "get_fac@uni.edu"}).get_json()["data"]["id"]
    r = db_client.get(f"{BASE}/{fid}")
    assert r.status_code == 200
    assert r.get_json()["data"]["id"] == fid


def test_list_faculty(db_client):
    _create(db_client, {"email": "list_fac@uni.edu"})
    r = db_client.get(BASE)
    assert r.status_code == 200
    body = r.get_json()
    assert isinstance(body["data"], list)
    assert "pagination" in body


def test_update_faculty(db_client):
    fid = _create(db_client, {"email": "upd_fac@uni.edu"}).get_json()["data"]["id"]
    r = db_client.put(f"{BASE}/{fid}", json={**VALID, "email": "upd_fac@uni.edu", "name": "Dr. Bob"})
    assert r.status_code == 200
    assert r.get_json()["data"]["name"] == "Dr. Bob"


def test_patch_faculty(db_client):
    fid = _create(db_client, {"email": "pat_fac@uni.edu"}).get_json()["data"]["id"]
    r = db_client.patch(f"{BASE}/{fid}", json={"designation": "Professor"})
    assert r.status_code == 200
    assert r.get_json()["data"]["designation"] == "Professor"


def test_delete_faculty(db_client):
    fid = _create(db_client, {"email": "del_fac@uni.edu"}).get_json()["data"]["id"]
    assert db_client.delete(f"{BASE}/{fid}").status_code == 204
    assert db_client.get(f"{BASE}/{fid}").status_code == 404


def test_get_nonexistent_faculty(db_client):
    assert db_client.get(f"{BASE}/99999").status_code == 404


# --- Validation ---

def test_missing_name(db_client):
    r = db_client.post(BASE, json={"department": "CS"})
    assert r.status_code == 400
    assert "name" in r.get_json()["details"]


def test_missing_department(db_client):
    r = db_client.post(BASE, json={"name": "X"})
    assert r.status_code == 400
    assert "department" in r.get_json()["details"]


def test_invalid_email_format(db_client):
    r = _create(db_client, {"email": "not-an-email"})
    assert r.status_code == 400
    assert "email" in r.get_json()["details"]


def test_duplicate_email(db_client):
    _create(db_client, {"email": "dup_fac@uni.edu"})
    r = _create(db_client, {"email": "dup_fac@uni.edu"})
    assert r.status_code == 400
    assert "email" in r.get_json()["details"]


def test_negative_max_hours(db_client):
    r = _create(db_client, {"max_hours_per_day": -1})
    assert r.status_code == 400


def test_zero_max_hours_per_week(db_client):
    r = _create(db_client, {"max_hours_per_week": 0})
    assert r.status_code == 400


def test_malformed_json(db_client):
    r = db_client.post(BASE, data="bad", content_type="application/json")
    assert r.status_code == 400


# --- Filtering ---

def test_filter_by_department(db_client):
    _create(db_client, {"email": "filt_fac@uni.edu", "department": "MATH"})
    r = db_client.get(f"{BASE}?department=MATH")
    for item in r.get_json()["data"]:
        assert item["department"] == "MATH"


# --- Subject assignments ---

def test_assign_subject_to_faculty(db_client):
    fid = _create(db_client, {"email": "asgn1@uni.edu"}).get_json()["data"]["id"]
    sid = _create_subject(db_client, {"code": "FA101"}).get_json()["data"]["id"]
    r = db_client.post(f"{BASE}/{fid}/subjects", json={"subject_ids": [sid]})
    assert r.status_code == 200
    ids = [s["id"] for s in r.get_json()["data"]]
    assert sid in ids


def test_get_faculty_subjects(db_client):
    fid = _create(db_client, {"email": "asgn2@uni.edu"}).get_json()["data"]["id"]
    sid = _create_subject(db_client, {"code": "FA102"}).get_json()["data"]["id"]
    db_client.post(f"{BASE}/{fid}/subjects", json={"subject_ids": [sid]})
    r = db_client.get(f"{BASE}/{fid}/subjects")
    assert r.status_code == 200
    assert any(s["id"] == sid for s in r.get_json()["data"])


def test_remove_subject_from_faculty(db_client):
    fid = _create(db_client, {"email": "asgn3@uni.edu"}).get_json()["data"]["id"]
    sid = _create_subject(db_client, {"code": "FA103"}).get_json()["data"]["id"]
    db_client.post(f"{BASE}/{fid}/subjects", json={"subject_ids": [sid]})
    r = db_client.delete(f"{BASE}/{fid}/subjects/{sid}")
    assert r.status_code == 204


def test_duplicate_assignment_rejected(db_client):
    fid = _create(db_client, {"email": "asgn4@uni.edu"}).get_json()["data"]["id"]
    sid = _create_subject(db_client, {"code": "FA104"}).get_json()["data"]["id"]
    db_client.post(f"{BASE}/{fid}/subjects", json={"subject_ids": [sid]})
    r = db_client.post(f"{BASE}/{fid}/subjects", json={"subject_ids": [sid]})
    assert r.status_code == 409


def test_assign_nonexistent_subject(db_client):
    fid = _create(db_client, {"email": "asgn5@uni.edu"}).get_json()["data"]["id"]
    r = db_client.post(f"{BASE}/{fid}/subjects", json={"subject_ids": [99999]})
    assert r.status_code == 404


def test_assign_to_nonexistent_faculty(db_client):
    r = db_client.post(f"{BASE}/99999/subjects", json={"subject_ids": [1]})
    assert r.status_code == 404


def test_bulk_assignment_all_or_nothing(db_client):
    fid = _create(db_client, {"email": "bulk1@uni.edu"}).get_json()["data"]["id"]
    sid = _create_subject(db_client, {"code": "FA105"}).get_json()["data"]["id"]
    r = db_client.post(f"{BASE}/{fid}/subjects", json={"subject_ids": [sid, 99999]})
    assert r.status_code == 404
    r2 = db_client.get(f"{BASE}/{fid}/subjects")
    assert not any(s["id"] == sid for s in r2.get_json()["data"])


def test_remove_nonexistent_assignment(db_client):
    fid = _create(db_client, {"email": "asgn6@uni.edu"}).get_json()["data"]["id"]
    r = db_client.delete(f"{BASE}/{fid}/subjects/99999")
    assert r.status_code == 404
