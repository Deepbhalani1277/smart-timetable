import pytest
from datetime import time
from sqlalchemy.exc import IntegrityError

from app.models import Subject, Faculty, Classroom, StudentGroup, TimeSlot, Timetable, TimetableEntry


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_subject(code="CS101", **kwargs):
    defaults = dict(
        name="Intro to CS", code=code, department="CS",
        semester=1, weekly_sessions=3, duration_minutes=60,
        subject_type="theory", required_room_type="classroom",
    )
    defaults.update(kwargs)
    return Subject(**defaults)


def make_faculty(**kwargs):
    defaults = dict(name="Dr. Smith", department="CS")
    defaults.update(kwargs)
    return Faculty(**defaults)


def make_classroom(name="Room 101", **kwargs):
    defaults = dict(name=name, capacity=40, room_type="classroom")
    defaults.update(kwargs)
    return Classroom(**defaults)


def make_group(**kwargs):
    defaults = dict(
        name="Group A", department="CS",
        academic_year="2024-25", semester=1, student_count=30,
    )
    defaults.update(kwargs)
    return StudentGroup(**defaults)


def make_slot(day="Monday", start=time(9, 0), end=time(10, 0), **kwargs):
    return TimeSlot(day_of_week=day, start_time=start, end_time=end, **kwargs)


# ---------------------------------------------------------------------------
# Import tests
# ---------------------------------------------------------------------------

def test_all_models_importable():
    assert Subject and Faculty and Classroom
    assert StudentGroup and TimeSlot and Timetable and TimetableEntry


# ---------------------------------------------------------------------------
# Table creation
# ---------------------------------------------------------------------------

def test_tables_created(db_tables):
    from sqlalchemy import inspect
    inspector = inspect(db_tables.engine)
    expected = {
        "subjects", "faculty", "classrooms", "student_groups",
        "time_slots", "timetables", "timetable_entries",
        "faculty_subjects", "group_subjects",
    }
    assert expected.issubset(set(inspector.get_table_names()))


# ---------------------------------------------------------------------------
# Subject
# ---------------------------------------------------------------------------

def test_subject_insert_and_retrieve(db_session):
    s = make_subject(code="CS200")
    db_session.add(s)
    db_session.flush()
    fetched = db_session.get(Subject, s.id)
    assert fetched.code == "CS200"


def test_subject_code_unique(db_session):
    db_session.add(make_subject(code="UNIQ01"))
    db_session.flush()
    db_session.add(make_subject(code="UNIQ01"))
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_subject_missing_name_raises(db_session):
    db_session.add(Subject(
        code="X1", department="CS", semester=1,
        weekly_sessions=2, duration_minutes=60,
        subject_type="theory", required_room_type="classroom",
    ))
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


# ---------------------------------------------------------------------------
# Faculty
# ---------------------------------------------------------------------------

def test_faculty_insert(db_session):
    f = make_faculty(email="smith@uni.edu")
    db_session.add(f)
    db_session.flush()
    assert f.id is not None


def test_faculty_email_unique(db_session):
    db_session.add(make_faculty(email="dup@uni.edu"))
    db_session.flush()
    db_session.add(make_faculty(email="dup@uni.edu"))
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_faculty_subject_relationship(db_session):
    f = make_faculty()
    s = make_subject(code="REL101")
    f.subjects.append(s)
    db_session.add(f)
    db_session.flush()
    assert s in db_session.get(Faculty, f.id).subjects


# ---------------------------------------------------------------------------
# Classroom
# ---------------------------------------------------------------------------

def test_classroom_insert(db_session):
    c = make_classroom(name="Lab A", room_type="laboratory", capacity=20)
    db_session.add(c)
    db_session.flush()
    assert c.id is not None


def test_classroom_name_building_unique(db_session):
    db_session.add(make_classroom(name="Room 201", building="Block A"))
    db_session.flush()
    db_session.add(make_classroom(name="Room 201", building="Block A"))
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_classroom_same_name_different_building_allowed(db_session):
    db_session.add(make_classroom(name="Room 301", building="Block A"))
    db_session.add(make_classroom(name="Room 301", building="Block B"))
    db_session.flush()  # should not raise


# ---------------------------------------------------------------------------
# StudentGroup
# ---------------------------------------------------------------------------

def test_student_group_insert(db_session):
    g = make_group(name="Batch 2024")
    db_session.add(g)
    db_session.flush()
    assert g.id is not None


def test_group_subject_relationship(db_session):
    g = make_group(name="Group M2M")
    s = make_subject(code="M2M101")
    g.subjects.append(s)
    db_session.add(g)
    db_session.flush()
    assert s in db_session.get(StudentGroup, g.id).subjects


def test_group_duplicate_subject_rejected(db_session):
    from sqlalchemy import text
    g = make_group(name="Group DUP")
    s = make_subject(code="DUP101")
    g.subjects.append(s)
    db_session.add(g)
    db_session.flush()
    # Bypass ORM identity map to force a real duplicate row into the DB
    with pytest.raises(IntegrityError):
        db_session.execute(
            text("INSERT INTO group_subjects (group_id, subject_id) VALUES (:g, :s)"),
            {"g": g.id, "s": s.id},
        )
        db_session.flush()
    db_session.rollback()


# ---------------------------------------------------------------------------
# TimeSlot
# ---------------------------------------------------------------------------

def test_time_slot_insert(db_session):
    ts = make_slot(day="Tuesday", start=time(10, 0), end=time(11, 0))
    db_session.add(ts)
    db_session.flush()
    assert ts.id is not None


def test_time_slot_end_before_start_rejected(db_session):
    ts = TimeSlot(
        day_of_week="Monday",
        start_time=time(11, 0),
        end_time=time(9, 0),
    )
    db_session.add(ts)
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_time_slot_invalid_day_rejected(db_session):
    ts = TimeSlot(
        day_of_week="Funday",
        start_time=time(9, 0),
        end_time=time(10, 0),
    )
    db_session.add(ts)
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


# ---------------------------------------------------------------------------
# Timetable + TimetableEntry
# ---------------------------------------------------------------------------

def _make_full_entry(db_session):
    """Insert one of each resource and return a TimetableEntry."""
    subj = make_subject(code="TT101")
    fac = make_faculty()
    room = make_classroom(name="TT Room")
    grp = make_group(name="TT Group")
    slot = make_slot(day="Wednesday", start=time(8, 0), end=time(9, 0))
    tt = Timetable(name="Spring 2025")
    for obj in (subj, fac, room, grp, slot, tt):
        db_session.add(obj)
    db_session.flush()
    entry = TimetableEntry(
        timetable_id=tt.id,
        subject_id=subj.id,
        faculty_id=fac.id,
        classroom_id=room.id,
        student_group_id=grp.id,
        time_slot_id=slot.id,
    )
    db_session.add(entry)
    db_session.flush()
    return tt, entry


def test_timetable_entry_insert(db_session):
    tt, entry = _make_full_entry(db_session)
    assert entry.id is not None
    assert entry.timetable_id == tt.id


def test_timetable_entry_relationships(db_session):
    tt, entry = _make_full_entry(db_session)
    fetched = db_session.get(TimetableEntry, entry.id)
    assert fetched.subject is not None
    assert fetched.faculty is not None
    assert fetched.classroom is not None
    assert fetched.student_group is not None
    assert fetched.time_slot is not None


def test_deleting_timetable_deletes_entries_not_resources(db_session):
    tt, entry = _make_full_entry(db_session)
    subj_id = entry.subject_id
    fac_id = entry.faculty_id
    entry_id = entry.id

    db_session.delete(tt)
    db_session.flush()

    assert db_session.get(TimetableEntry, entry_id) is None
    assert db_session.get(Subject, subj_id) is not None
    assert db_session.get(Faculty, fac_id) is not None
