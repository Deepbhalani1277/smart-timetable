import re
from app.extensions import db
from app.models.faculty import Faculty
from app.models.subject import Subject
from app.models.timetable import TimetableEntry
from app.services.utils import serialize_datetime, paginate_query, parse_pagination

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
SORTABLE = {"id", "name", "department", "designation", "created_at"}


def serialize(f, include_subjects=False):
    d = {
        "id": f.id,
        "name": f.name,
        "email": f.email,
        "department": f.department,
        "designation": f.designation,
        "max_hours_per_day": float(f.max_hours_per_day) if f.max_hours_per_day is not None else None,
        "max_hours_per_week": float(f.max_hours_per_week) if f.max_hours_per_week is not None else None,
        "is_active": f.is_active,
        "created_at": serialize_datetime(f.created_at),
        "updated_at": serialize_datetime(f.updated_at),
    }
    if include_subjects:
        d["subjects"] = [{"id": s.id, "name": s.name, "code": s.code} for s in f.subjects]
    return d


def _validate(data, partial=False):
    errors = {}
    if not partial or "name" in data:
        if not str(data.get("name", "")).strip():
            errors["name"] = "Required."
    if not partial or "department" in data:
        if not str(data.get("department", "")).strip():
            errors["department"] = "Required."
    if "email" in data and data["email"]:
        if not _EMAIL_RE.match(str(data["email"])):
            errors["email"] = "Invalid email format."
    if "max_hours_per_day" in data and data["max_hours_per_day"] is not None:
        try:
            if float(data["max_hours_per_day"]) <= 0:
                errors["max_hours_per_day"] = "Must be positive."
        except (TypeError, ValueError):
            errors["max_hours_per_day"] = "Must be a number."
    if "max_hours_per_week" in data and data["max_hours_per_week"] is not None:
        try:
            if float(data["max_hours_per_week"]) <= 0:
                errors["max_hours_per_week"] = "Must be positive."
        except (TypeError, ValueError):
            errors["max_hours_per_week"] = "Must be a number."
    return errors


def list_faculty(args):
    page, per_page = parse_pagination(args)
    sort_by = args.get("sort_by", "id")
    if sort_by not in SORTABLE:
        sort_by = "id"
    order = getattr(Faculty, sort_by)
    if args.get("sort_dir", "asc").lower() == "desc":
        order = order.desc()
    q = Faculty.query.order_by(order)
    if args.get("name"):
        q = q.filter(Faculty.name.ilike(f"%{args['name']}%"))
    if args.get("department"):
        q = q.filter(Faculty.department == args["department"])
    if args.get("designation"):
        q = q.filter(Faculty.designation == args["designation"])
    if args.get("is_active") is not None:
        val = args.get("is_active")
        if isinstance(val, str):
            val = val.lower() == "true"
        q = q.filter(Faculty.is_active == val)
    items, pagination = paginate_query(q, page, per_page)
    return [serialize(f) for f in items], pagination


def get_faculty(faculty_id):
    return db.session.get(Faculty, faculty_id)


def create_faculty(data):
    errors = _validate(data)
    if errors:
        return None, errors
    if data.get("email"):
        if Faculty.query.filter_by(email=data["email"]).first():
            return None, {"email": "Email already exists."}
    f = Faculty(
        name=data["name"].strip(),
        email=data.get("email") or None,
        department=data["department"].strip(),
        designation=data.get("designation") or None,
        max_hours_per_day=data.get("max_hours_per_day"),
        max_hours_per_week=data.get("max_hours_per_week"),
        is_active=bool(data.get("is_active", True)),
    )
    db.session.add(f)
    db.session.commit()
    return serialize(f), None


def update_faculty(faculty_id, data, partial=False):
    f = db.session.get(Faculty, faculty_id)
    if not f:
        return None, None
    errors = _validate(data, partial=partial)
    if errors:
        return None, errors
    if "email" in data and data["email"]:
        conflict = Faculty.query.filter(Faculty.email == data["email"], Faculty.id != faculty_id).first()
        if conflict:
            return None, {"email": "Email already exists."}
    if "name" in data:
        f.name = data["name"].strip()
    if "email" in data:
        f.email = data["email"] or None
    if "department" in data:
        f.department = data["department"].strip()
    if "designation" in data:
        f.designation = data.get("designation") or None
    if "max_hours_per_day" in data:
        f.max_hours_per_day = data["max_hours_per_day"]
    if "max_hours_per_week" in data:
        f.max_hours_per_week = data["max_hours_per_week"]
    if "is_active" in data:
        f.is_active = bool(data["is_active"])
    db.session.commit()
    return serialize(f), None


def delete_faculty(faculty_id):
    f = db.session.get(Faculty, faculty_id)
    if not f:
        return False, "not_found"
    if TimetableEntry.query.filter_by(faculty_id=faculty_id).first():
        return False, "conflict"
    db.session.delete(f)
    db.session.commit()
    return True, None


# --- Subject assignments ---

def get_faculty_subjects(faculty_id):
    f = db.session.get(Faculty, faculty_id)
    if not f:
        return None
    return [{"id": s.id, "name": s.name, "code": s.code} for s in f.subjects]


def assign_subjects(faculty_id, subject_ids):
    f = db.session.get(Faculty, faculty_id)
    if not f:
        return None, "faculty_not_found"
    if not isinstance(subject_ids, list) or not subject_ids:
        return None, "invalid_ids"
    existing_ids = {s.id for s in f.subjects}
    to_add = []
    for sid in subject_ids:
        if not isinstance(sid, int):
            return None, "invalid_ids"
        if sid in existing_ids:
            return None, f"subject_{sid}_already_assigned"
        s = db.session.get(Subject, sid)
        if not s:
            return None, f"subject_{sid}_not_found"
        to_add.append(s)
    for s in to_add:
        f.subjects.append(s)
    db.session.commit()
    return [{"id": s.id, "name": s.name, "code": s.code} for s in f.subjects], None


def remove_subject(faculty_id, subject_id):
    f = db.session.get(Faculty, faculty_id)
    if not f:
        return False, "faculty_not_found"
    s = db.session.get(Subject, subject_id)
    if not s or s not in f.subjects:
        return False, "assignment_not_found"
    f.subjects.remove(s)
    db.session.commit()
    return True, None
