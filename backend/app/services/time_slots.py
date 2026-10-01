from datetime import time
from app.extensions import db
from app.models.time_slot import TimeSlot, DAYS_OF_WEEK
from app.models.timetable import TimetableEntry
from app.services.utils import serialize_datetime, serialize_time, paginate_query, parse_pagination


def serialize(ts):
    return {
        "id": ts.id,
        "day_of_week": ts.day_of_week,
        "start_time": serialize_time(ts.start_time),
        "end_time": serialize_time(ts.end_time),
        "label": ts.label,
        "is_break": ts.is_break,
        "created_at": serialize_datetime(ts.created_at),
        "updated_at": serialize_datetime(ts.updated_at),
    }


def _parse_time(value):
    """Parse HH:MM string to datetime.time. Returns None on failure."""
    if isinstance(value, time):
        return value
    try:
        parts = str(value).split(":")
        return time(int(parts[0]), int(parts[1]))
    except (IndexError, ValueError, TypeError):
        return None


def _validate(data, partial=False):
    errors = {}
    if not partial or "day_of_week" in data:
        v = data.get("day_of_week")
        if not v and not partial:
            errors["day_of_week"] = "Required."
        elif v and v not in DAYS_OF_WEEK:
            errors["day_of_week"] = f"Must be one of: {', '.join(DAYS_OF_WEEK)}."
    start = None
    end = None
    if not partial or "start_time" in data:
        v = data.get("start_time")
        if not v and not partial:
            errors["start_time"] = "Required."
        elif v:
            start = _parse_time(v)
            if start is None:
                errors["start_time"] = "Must be HH:MM format."
    if not partial or "end_time" in data:
        v = data.get("end_time")
        if not v and not partial:
            errors["end_time"] = "Required."
        elif v:
            end = _parse_time(v)
            if end is None:
                errors["end_time"] = "Must be HH:MM format."
    if start and end and end <= start:
        errors["end_time"] = "Must be later than start_time."
    if "is_break" in data and not isinstance(data["is_break"], bool):
        errors["is_break"] = "Must be a boolean."
    return errors, start, end


def _check_overlap(day, start, end, exclude_id=None):
    """Return True if any existing slot on the same day overlaps [start, end)."""
    q = TimeSlot.query.filter(
        TimeSlot.day_of_week == day,
        TimeSlot.start_time < end,
        TimeSlot.end_time > start,
    )
    if exclude_id:
        q = q.filter(TimeSlot.id != exclude_id)
    return q.first()


def list_time_slots(args):
    page, per_page = parse_pagination(args)
    q = TimeSlot.query.order_by(TimeSlot.day_of_week, TimeSlot.start_time)
    if args.get("day_of_week"):
        q = q.filter(TimeSlot.day_of_week == args["day_of_week"])
    if args.get("is_break") is not None:
        val = args.get("is_break")
        if isinstance(val, str):
            val = val.lower() == "true"
        q = q.filter(TimeSlot.is_break == val)
    items, pagination = paginate_query(q, page, per_page)
    return [serialize(ts) for ts in items], pagination


def get_time_slot(slot_id):
    return TimeSlot.query.get(slot_id)


def create_time_slot(data):
    errors, start, end = _validate(data)
    if errors:
        return None, errors
    day = data["day_of_week"]
    conflict = _check_overlap(day, start, end)
    if conflict:
        return None, {"time": f"Overlaps with existing slot {conflict.id} ({serialize_time(conflict.start_time)}-{serialize_time(conflict.end_time)})."}
    ts = TimeSlot(
        day_of_week=day,
        start_time=start,
        end_time=end,
        label=data.get("label") or None,
        is_break=bool(data.get("is_break", False)),
    )
    db.session.add(ts)
    db.session.commit()
    return serialize(ts), None


def update_time_slot(slot_id, data, partial=False):
    ts = TimeSlot.query.get(slot_id)
    if not ts:
        return None, None
    errors, new_start, new_end = _validate(data, partial=partial)
    if errors:
        return None, errors
    day = data.get("day_of_week", ts.day_of_week)
    start = new_start or ts.start_time
    end = new_end or ts.end_time
    if end <= start:
        return None, {"end_time": "Must be later than start_time."}
    conflict = _check_overlap(day, start, end, exclude_id=slot_id)
    if conflict:
        return None, {"time": f"Overlaps with existing slot {conflict.id} ({serialize_time(conflict.start_time)}-{serialize_time(conflict.end_time)})."}
    if "day_of_week" in data:
        ts.day_of_week = day
    if new_start:
        ts.start_time = start
    if new_end:
        ts.end_time = end
    if "label" in data:
        ts.label = data.get("label") or None
    if "is_break" in data:
        ts.is_break = bool(data["is_break"])
    db.session.commit()
    return serialize(ts), None


def delete_time_slot(slot_id, force=False):
    ts = TimeSlot.query.get(slot_id)
    if not ts:
        return False, "not_found"
    entries = TimetableEntry.query.filter_by(time_slot_id=slot_id).all()
    if entries:
        if not force:
            return False, "conflict"
        for entry in entries:
            db.session.delete(entry)
    db.session.delete(ts)
    db.session.commit()
    return True, None


def apply_schedule_template(template_data):
    days = template_data.get("days") or ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    periods = template_data.get("periods") or []
    clear_existing = template_data.get("clear_existing", True)

    if not periods:
        return None, {"periods": "At least one time slot period is required."}

    if clear_existing:
        TimetableEntry.query.delete()
        TimeSlot.query.delete()
        db.session.flush()

    created_slots = []
    for day in days:
        if day not in DAYS_OF_WEEK:
            continue
        for p in periods:
            st = _parse_time(p.get("start_time"))
            et = _parse_time(p.get("end_time"))
            if not st or not et or et <= st:
                continue
            ts = TimeSlot(
                day_of_week=day,
                start_time=st,
                end_time=et,
                label=p.get("label"),
                is_break=bool(p.get("is_break", False)),
            )
            db.session.add(ts)
            created_slots.append(ts)

    db.session.commit()
    return [serialize(ts) for ts in created_slots], None
