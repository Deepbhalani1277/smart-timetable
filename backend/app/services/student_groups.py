from app.extensions import db
from app.models.student_group import StudentGroup
from app.models.subject import Subject
from app.models.timetable import TimetableEntry
from app.services.utils import serialize_datetime, paginate_query, parse_pagination

SORTABLE = {"id", "name", "department", "academic_year", "semester", "created_at"}


def serialize(g, include_subjects=False):
    d = {
        "id": g.id,
        "name": g.name,
        "department": g.department,
        "academic_year": g.academic_year,
        "semester": g.semester,
        "division": g.division,
        "student_count": g.student_count,
        "is_active": g.is_active,
        "created_at": serialize_datetime(g.created_at),
        "updated_at": serialize_datetime(g.updated_at),
    }
    if include_subjects:
        d["subjects"] = [{"id": s.id, "name": s.name, "code": s.code} for s in g.subjects]
    return d


def _validate(data, partial=False):
    errors = {}
    if not partial or "name" in data:
        if not str(data.get("name", "")).strip():
            errors["name"] = "Required."
    if not partial or "department" in data:
        if not str(data.get("department", "")).strip():
            errors["department"] = "Required."
    if not partial or "academic_year" in data:
        if not str(data.get("academic_year", "")).strip():
            errors["academic_year"] = "Required."
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
    if not partial or "student_count" in data:
        v = data.get("student_count")
        if v is None and not partial:
            errors["student_count"] = "Required."
        elif v is not None:
            try:
                if int(v) < 1:
                    errors["student_count"] = "Must be a positive integer."
            except (TypeError, ValueError):
                errors["student_count"] = "Must be an integer."
    return errors


def list_groups(args):
    page, per_page = parse_pagination(args)
    sort_by = args.get("sort_by", "id")
    if sort_by not in SORTABLE:
        sort_by = "id"
    order = getattr(StudentGroup, sort_by)
    if args.get("sort_dir", "asc").lower() == "desc":
        order = order.desc()
    q = StudentGroup.query.order_by(order)
    if args.get("name"):
        q = q.filter(StudentGroup.name.ilike(f"%{args['name']}%"))
    if args.get("department"):
        q = q.filter(StudentGroup.department == args["department"])
    if args.get("academic_year"):
        q = q.filter(StudentGroup.academic_year == args["academic_year"])
    if args.get("semester"):
        try:
            q = q.filter(StudentGroup.semester == int(args["semester"]))
        except ValueError:
            pass
    if args.get("division"):
        q = q.filter(StudentGroup.division == args["division"])
    if args.get("is_active") is not None:
        val = args.get("is_active")
        if isinstance(val, str):
            val = val.lower() == "true"
        q = q.filter(StudentGroup.is_active == val)
    items, pagination = paginate_query(q, page, per_page)
    return [serialize(g) for g in items], pagination


def get_group(group_id):
    return db.session.get(StudentGroup, group_id)


def create_group(data):
    errors = _validate(data)
    if errors:
        return None, errors
    g = StudentGroup(
        name=data["name"].strip(),
        department=data["department"].strip(),
        academic_year=data["academic_year"].strip(),
        semester=int(data["semester"]),
        division=data.get("division") or None,
        student_count=int(data["student_count"]),
        is_active=bool(data.get("is_active", True)),
    )
    db.session.add(g)
    db.session.commit()
    return serialize(g), None


def update_group(group_id, data, partial=False):
    g = db.session.get(StudentGroup, group_id)
    if not g:
        return None, None
    errors = _validate(data, partial=partial)
    if errors:
        return None, errors
    if "name" in data:
        g.name = data["name"].strip()
    if "department" in data:
        g.department = data["department"].strip()
    if "academic_year" in data:
        g.academic_year = data["academic_year"].strip()
    if "semester" in data:
        g.semester = int(data["semester"])
    if "division" in data:
        g.division = data.get("division") or None
    if "student_count" in data:
        g.student_count = int(data["student_count"])
    if "is_active" in data:
        g.is_active = bool(data["is_active"])
    db.session.commit()
    return serialize(g), None


def delete_group(group_id):
    g = db.session.get(StudentGroup, group_id)
    if not g:
        return False, "not_found"
    if TimetableEntry.query.filter_by(student_group_id=group_id).first():
        return False, "conflict"
    db.session.delete(g)
    db.session.commit()
    return True, None


# --- Subject assignments ---

def get_group_subjects(group_id):
    g = db.session.get(StudentGroup, group_id)
    if not g:
        return None
    return [{"id": s.id, "name": s.name, "code": s.code} for s in g.subjects]


def assign_subjects(group_id, subject_ids):
    g = db.session.get(StudentGroup, group_id)
    if not g:
        return None, "group_not_found"
    if not isinstance(subject_ids, list) or not subject_ids:
        return None, "invalid_ids"
    existing_ids = {s.id for s in g.subjects}
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
        g.subjects.append(s)
    db.session.commit()
    return [{"id": s.id, "name": s.name, "code": s.code} for s in g.subjects], None


def remove_subject(group_id, subject_id):
    g = db.session.get(StudentGroup, group_id)
    if not g:
        return False, "group_not_found"
    s = db.session.get(Subject, subject_id)
    if not s or s not in g.subjects:
        return False, "assignment_not_found"
    g.subjects.remove(s)
    db.session.commit()
    return True, None
