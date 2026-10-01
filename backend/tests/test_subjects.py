import pytest

BASE = "/api/subjects"

VALID = {
    "name": "Data Structures",
    "code": "CS301",
    "department": "CS",
    "semester": 3,
    "weekly_sessions": 3,
    "duration_minutes": 60,
    "subject_type": "theory",
    "required_room_type": "classroom",
}


def _create(client, overrides=None):
    body = {**VALID, **(overrides or {})}
    return client.post(BASE, json=body)


# --- CRUD ---

def test_create_subject(db_client):
    r = _create(db_client)
    assert r.status_code == 201
    d = r.get_json()["data"]
    assert d["code"] == "CS301"
    assert d["id"] is not None


def test_get_subject(db_client):
    sid = _create(db_client, {"code": "CS302"}).get_json()["data"]["id"]
    r = db_client.get(f"{BASE}/{sid}")
    assert r.status_code == 200
    assert r.get_json()["data"]["id"] == sid


def test_list_subjects(db_client):
    _create(db_client, {"code": "CS303"})
    r = db_client.get(BASE)
    assert r.status_code == 200
    body = r.get_json()
    assert isinstance(body["data"], list)
    assert "pagination" in body


def test_update_subject(db_client):
    sid = _create(db_client, {"code": "CS304"}).get_json()["data"]["id"]
    r = db_client.put(f"{BASE}/{sid}", json={**VALID, "code": "CS304", "name": "Advanced DS"})
    assert r.status_code == 200
    assert r.get_json()["data"]["name"] == "Advanced DS"


def test_patch_subject(db_client):
    sid = _create(db_client, {"code": "CS305"}).get_json()["data"]["id"]
    r = db_client.patch(f"{BASE}/{sid}", json={"weekly_sessions": 5})
    assert r.status_code == 200
    assert r.get_json()["data"]["weekly_sessions"] == 5


def test_delete_subject(db_client):
    sid = _create(db_client, {"code": "CS306"}).get_json()["data"]["id"]
    assert db_client.delete(f"{BASE}/{sid}").status_code == 204
    assert db_client.get(f"{BASE}/{sid}").status_code == 404


def test_get_nonexistent_subject(db_client):
    assert db_client.get(f"{BASE}/99999").status_code == 404


# --- Validation ---

def test_missing_required_fields(db_client):
    r = db_client.post(BASE, json={})
    assert r.status_code == 400
    assert "details" in r.get_json()


def test_invalid_subject_type(db_client):
    r = _create(db_client, {"subject_type": "lecture"})
    assert r.status_code == 400
    assert "subject_type" in r.get_json()["details"]


def test_invalid_room_type(db_client):
    r = _create(db_client, {"required_room_type": "gym"})
    assert r.status_code == 400
    assert "required_room_type" in r.get_json()["details"]


def test_zero_weekly_sessions(db_client):
    r = _create(db_client, {"weekly_sessions": 0})
    assert r.status_code == 400


def test_negative_duration(db_client):
    r = _create(db_client, {"duration_minutes": -10})
    assert r.status_code == 400


def test_zero_semester(db_client):
    r = _create(db_client, {"semester": 0})
    assert r.status_code == 400


def test_duplicate_code(db_client):
    _create(db_client, {"code": "DUPX1"})
    r = _create(db_client, {"code": "DUPX1"})
    assert r.status_code == 400
    assert "code" in r.get_json()["details"]


def test_malformed_json(db_client):
    r = db_client.post(BASE, data="not-json", content_type="application/json")
    assert r.status_code == 400


# --- Filtering ---

def test_filter_by_department(db_client):
    _create(db_client, {"code": "FD01", "department": "MATH"})
    r = db_client.get(f"{BASE}?department=MATH")
    assert r.status_code == 200
    for item in r.get_json()["data"]:
        assert item["department"] == "MATH"


def test_filter_by_subject_type(db_client):
    _create(db_client, {"code": "FT01", "subject_type": "practical"})
    r = db_client.get(f"{BASE}?subject_type=practical")
    for item in r.get_json()["data"]:
        assert item["subject_type"] == "practical"


# --- Pagination ---

def test_pagination_metadata(db_client):
    _create(db_client)
    r = db_client.get(f"{BASE}?page=1&per_page=5")
    p = r.get_json()["pagination"]
    assert p["page"] == 1
    assert p["per_page"] == 5


def test_invalid_pagination_normalised(db_client):
    r = db_client.get(f"{BASE}?page=-1&per_page=abc")
    assert r.status_code == 200


# --- Deletion protection ---

def test_delete_subject_referenced_by_timetable_entry(db_client, db_tables, app):
    from datetime import time
    from app.extensions import db
    from app.models.subject import Subject
    from app.models.faculty import Faculty
    from app.models.classroom import Classroom
    from app.models.student_group import StudentGroup
    from app.models.time_slot import TimeSlot
    from app.models.timetable import Timetable, TimetableEntry

    with app.app_context():
        subj = Subject(name="Locked", code="LCK01", department="X", semester=1,
                       weekly_sessions=1, duration_minutes=60,
                       subject_type="theory", required_room_type="classroom")
        fac = Faculty(name="F", department="X")
        room = Classroom(name="R_LCK", capacity=30, room_type="classroom")
        grp = StudentGroup(name="G_LCK", department="X", academic_year="2024", semester=1, student_count=20)
        slot = TimeSlot(day_of_week="Monday", start_time=time(7, 0), end_time=time(8, 0))
        tt = Timetable(name="TT_LCK")
        for obj in (subj, fac, room, grp, slot, tt):
            db.session.add(obj)
        db.session.flush()
        entry = TimetableEntry(timetable_id=tt.id, subject_id=subj.id, faculty_id=fac.id,
                               classroom_id=room.id, student_group_id=grp.id, time_slot_id=slot.id)
        db.session.add(entry)
        db.session.commit()
        sid = subj.id
        tt_id = tt.id

    r = db_client.delete(f"{BASE}/{sid}")
    assert r.status_code == 409

    with app.app_context():
        db.session.get(Timetable, tt_id) and db.session.delete(db.session.get(Timetable, tt_id))
        db.session.commit()
