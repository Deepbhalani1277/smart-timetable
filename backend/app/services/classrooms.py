from app.extensions import db
from app.models.classroom import Classroom, ROOM_TYPES
from app.models.timetable import TimetableEntry
from app.services.utils import serialize_datetime, paginate_query, parse_pagination

SORTABLE = {"id", "name", "building", "capacity", "room_type", "created_at"}


def serialize(c):
    return {
        "id": c.id,
        "name": c.name,
        "building": c.building,
        "capacity": c.capacity,
        "room_type": c.room_type,
        "has_projector": c.has_projector,
        "has_computers": c.has_computers,
        "is_active": c.is_active,
        "created_at": serialize_datetime(c.created_at),
        "updated_at": serialize_datetime(c.updated_at),
    }


def _validate(data, partial=False):
    errors = {}
    if not partial or "name" in data:
        if not str(data.get("name", "")).strip():
            errors["name"] = "Required."
    if not partial or "capacity" in data:
        v = data.get("capacity")
        if v is None and not partial:
            errors["capacity"] = "Required."
        elif v is not None:
            try:
                if int(v) < 1:
                    errors["capacity"] = "Must be a positive integer."
            except (TypeError, ValueError):
                errors["capacity"] = "Must be an integer."
    if not partial or "room_type" in data:
        v = data.get("room_type")
        if v is None and not partial:
            errors["room_type"] = "Required."
        elif v is not None and v not in ROOM_TYPES:
            errors["room_type"] = f"Must be one of: {', '.join(ROOM_TYPES)}."
    for bool_field in ("has_projector", "has_computers"):
        if bool_field in data and not isinstance(data[bool_field], bool):
            errors[bool_field] = "Must be a boolean."
    return errors


def _check_name_building_conflict(name, building, exclude_id=None):
    q = Classroom.query.filter_by(name=name, building=building)
    if exclude_id:
        q = q.filter(Classroom.id != exclude_id)
    return q.first() is not None


def list_classrooms(args):
    page, per_page = parse_pagination(args)
    sort_by = args.get("sort_by", "id")
    if sort_by not in SORTABLE:
        sort_by = "id"
    order = getattr(Classroom, sort_by)
    if args.get("sort_dir", "asc").lower() == "desc":
        order = order.desc()
    q = Classroom.query.order_by(order)
    if args.get("name"):
        q = q.filter(Classroom.name.ilike(f"%{args['name']}%"))
    if args.get("building"):
        q = q.filter(Classroom.building == args["building"])
    if args.get("room_type"):
        q = q.filter(Classroom.room_type == args["room_type"])
    if args.get("min_capacity"):
        try:
            q = q.filter(Classroom.capacity >= int(args["min_capacity"]))
        except ValueError:
            pass
    if args.get("has_projector") is not None:
        val = args.get("has_projector")
        if isinstance(val, str):
            val = val.lower() == "true"
        q = q.filter(Classroom.has_projector == val)
    if args.get("has_computers") is not None:
        val = args.get("has_computers")
        if isinstance(val, str):
            val = val.lower() == "true"
        q = q.filter(Classroom.has_computers == val)
    if args.get("is_active") is not None:
        val = args.get("is_active")
        if isinstance(val, str):
            val = val.lower() == "true"
        q = q.filter(Classroom.is_active == val)
    items, pagination = paginate_query(q, page, per_page)
    return [serialize(c) for c in items], pagination


def get_classroom(classroom_id):
    return db.session.get(Classroom, classroom_id)


def create_classroom(data):
    errors = _validate(data)
    if errors:
        return None, errors
    name = data["name"].strip()
    building = data.get("building") or None
    if _check_name_building_conflict(name, building):
        return None, {"name": "Classroom name already exists in this building."}
    c = Classroom(
        name=name,
        building=building,
        capacity=int(data["capacity"]),
        room_type=data.get("room_type", "classroom"),
        has_projector=bool(data.get("has_projector", False)),
        has_computers=bool(data.get("has_computers", False)),
        is_active=bool(data.get("is_active", True)),
    )
    db.session.add(c)
    db.session.commit()
    return serialize(c), None


def update_classroom(classroom_id, data, partial=False):
    c = db.session.get(Classroom, classroom_id)
    if not c:
        return None, None
    errors = _validate(data, partial=partial)
    if errors:
        return None, errors
    name = data.get("name", c.name).strip()
    building = data.get("building", c.building) or None
    if "name" in data or "building" in data:
        if _check_name_building_conflict(name, building, exclude_id=classroom_id):
            return None, {"name": "Classroom name already exists in this building."}
    if "name" in data:
        c.name = name
    if "building" in data:
        c.building = building
    if "capacity" in data:
        c.capacity = int(data["capacity"])
    if "room_type" in data:
        c.room_type = data["room_type"]
    if "has_projector" in data:
        c.has_projector = bool(data["has_projector"])
    if "has_computers" in data:
        c.has_computers = bool(data["has_computers"])
    if "is_active" in data:
        c.is_active = bool(data["is_active"])
    db.session.commit()
    return serialize(c), None


def delete_classroom(classroom_id):
    c = db.session.get(Classroom, classroom_id)
    if not c:
        return False, "not_found"
    if TimetableEntry.query.filter_by(classroom_id=classroom_id).first():
        return False, "conflict"
    db.session.delete(c)
    db.session.commit()
    return True, None
