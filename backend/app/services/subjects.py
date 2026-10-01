import re
from app.extensions import db
from app.models.subject import Subject, SUBJECT_TYPES, ROOM_TYPES
from app.models.timetable import TimetableEntry
from app.services.utils import serialize_datetime, paginate_query, parse_pagination


def serialize(s):
    return {
        "id": s.id,
        "name": s.name,
        "code": s.code,
        "department": s.department,
        "semester": s.semester,
        "weekly_sessions": s.weekly_sessions,
        "duration_minutes": s.duration_minutes,
        "subject_type": s.subject_type,
        "required_room_type": s.required_room_type,
        "requires_consecutive_slots": s.requires_consecutive_slots,
        "created_at": serialize_datetime(s.created_at),
        "updated_at": serialize_datetime(s.updated_at),
    }


def _validate(data, partial=False):
    errors = {}
    if not partial or "name" in data:
        if not str(data.get("name", "")).strip():
            errors["name"] = "Required."
    if not partial or "code" in data:
        if not str(data.get("code", "")).strip():
            errors["code"] = "Required."
    if not partial or "department" in data:
        if not str(data.get("department", "")).strip():
            errors["department"] = "Required."
    if not partial or "semester" in data:
        v = data.get("semester")
        if v is None and not partial:
            errors["semester"] = "Required."
        elif v is not None:
            try:
                if int(v) < 1:
                    errors["semester"] = "Must be a positive integer."
            except (TypeError, ValueError):
                errors["semester"] = "Must be an integer."
    if not partial or "weekly_sessions" in data:
        v = data.get("weekly_sessions")
        if v is None and not partial:
            errors["weekly_sessions"] = "Required."
        elif v is not None:
            try:
                if int(v) < 1:
                    errors["weekly_sessions"] = "Must be a positive integer."
            except (TypeError, ValueError):
                errors["weekly_sessions"] = "Must be an integer."
    if not partial or "duration_minutes" in data:
        v = data.get("duration_minutes")
        if v is None and not partial:
            errors["duration_minutes"] = "Required."
        elif v is not None:
            try:
                if int(v) < 1:
                    errors["duration_minutes"] = "Must be a positive integer."
            except (TypeError, ValueError):
                errors["duration_minutes"] = "Must be an integer."
    if not partial or "subject_type" in data:
        v = data.get("subject_type")
        if v is None and not partial:
            errors["subject_type"] = "Required."
        elif v is not None and v not in SUBJECT_TYPES:
            errors["subject_type"] = f"Must be one of: {', '.join(SUBJECT_TYPES)}."
    if not partial or "required_room_type" in data:
        v = data.get("required_room_type")
        if v is None and not partial:
            errors["required_room_type"] = "Required."
        elif v is not None and v not in ROOM_TYPES:
            errors["required_room_type"] = f"Must be one of: {', '.join(ROOM_TYPES)}."
    return errors


def list_subjects(args):
    page, per_page = parse_pagination(args)
    q = Subject.query.order_by(Subject.id)
    if args.get("department"):
        q = q.filter(Subject.department == args["department"])
    if args.get("semester"):
        try:
            q = q.filter(Subject.semester == int(args["semester"]))
        except ValueError:
            pass
    if args.get("subject_type"):
        q = q.filter(Subject.subject_type == args["subject_type"])
    if args.get("required_room_type"):
        q = q.filter(Subject.required_room_type == args["required_room_type"])
    items, pagination = paginate_query(q, page, per_page)
    return [serialize(s) for s in items], pagination


def get_subject(subject_id):
    return Subject.query.get(subject_id)


def create_subject(data):
    errors = _validate(data)
    if errors:
        return None, errors
    existing = Subject.query.filter_by(code=data["code"].strip()).first()
    if existing:
        return None, {"code": "Subject code already exists."}
    s = Subject(
        name=data["name"].strip(),
        code=data["code"].strip().upper(),
        department=data["department"].strip(),
        semester=int(data["semester"]),
        weekly_sessions=int(data["weekly_sessions"]),
        duration_minutes=int(data["duration_minutes"]),
        subject_type=data.get("subject_type", "theory"),
        required_room_type=data.get("required_room_type", "classroom"),
        requires_consecutive_slots=bool(data.get("requires_consecutive_slots", False)),
    )
    db.session.add(s)
    db.session.commit()
    return serialize(s), None


def update_subject(subject_id, data, partial=False):
    s = Subject.query.get(subject_id)
    if not s:
        return None, None
    errors = _validate(data, partial=partial)
    if errors:
        return None, errors
    if "code" in data:
        new_code = data["code"].strip().upper()
        conflict = Subject.query.filter(Subject.code == new_code, Subject.id != subject_id).first()
        if conflict:
            return None, {"code": "Subject code already exists."}
        s.code = new_code
    if "name" in data:
        s.name = data["name"].strip()
    if "department" in data:
        s.department = data["department"].strip()
    if "semester" in data:
        s.semester = int(data["semester"])
    if "weekly_sessions" in data:
        s.weekly_sessions = int(data["weekly_sessions"])
    if "duration_minutes" in data:
        s.duration_minutes = int(data["duration_minutes"])
    if "subject_type" in data:
        s.subject_type = data["subject_type"]
    if "required_room_type" in data:
        s.required_room_type = data["required_room_type"]
    if "requires_consecutive_slots" in data:
        s.requires_consecutive_slots = bool(data["requires_consecutive_slots"])
    db.session.commit()
    return serialize(s), None


def delete_subject(subject_id):
    s = Subject.query.get(subject_id)
    if not s:
        return False, "not_found"
    if TimetableEntry.query.filter_by(subject_id=subject_id).first():
        return False, "conflict"
    db.session.delete(s)
    db.session.commit()
    return True, None
