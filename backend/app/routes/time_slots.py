from flask import Blueprint, request
from app.services import time_slots as svc
from app.routes.responses import ok, created, no_content, collection, validation_error, not_found, conflict, bad_request

time_slots_bp = Blueprint("time_slots", __name__)


@time_slots_bp.get("/time-slots")
def list_time_slots():
    data, pagination = svc.list_time_slots(request.args)
    return collection(data, pagination)


@time_slots_bp.get("/time-slots/<int:slot_id>")
def get_time_slot(slot_id):
    ts = svc.get_time_slot(slot_id)
    if not ts:
        return not_found("Time slot")
    return ok(svc.serialize(ts))


@time_slots_bp.post("/time-slots")
def create_time_slot():
    body = request.get_json(silent=True)
    if body is None:
        return bad_request("Request body must be valid JSON.")
    result, errors = svc.create_time_slot(body)
    if errors:
        return validation_error(errors)
    return created(result)


@time_slots_bp.put("/time-slots/<int:slot_id>")
def update_time_slot(slot_id):
    body = request.get_json(silent=True)
    if body is None:
        return bad_request("Request body must be valid JSON.")
    result, errors = svc.update_time_slot(slot_id, body, partial=False)
    if result is None and errors is None:
        return not_found("Time slot")
    if errors:
        return validation_error(errors)
    return ok(result)


@time_slots_bp.patch("/time-slots/<int:slot_id>")
def patch_time_slot(slot_id):
    body = request.get_json(silent=True)
    if body is None:
        return bad_request("Request body must be valid JSON.")
    result, errors = svc.update_time_slot(slot_id, body, partial=True)
    if result is None and errors is None:
        return not_found("Time slot")
    if errors:
        return validation_error(errors)
    return ok(result)


@time_slots_bp.delete("/time-slots/<int:slot_id>")
def delete_time_slot(slot_id):
    force = request.args.get("force", "").lower() in ("true", "1")
    success, reason = svc.delete_time_slot(slot_id, force=force)
    if not success:
        if reason == "not_found":
            return not_found("Time slot")
        return conflict("Time slot is referenced by timetable entries and cannot be deleted.")
    return no_content()


@time_slots_bp.post("/time-slots/bulk-template")
def apply_schedule_template():
    body = request.get_json(silent=True)
    if body is None:
        return bad_request("Request body must be valid JSON.")
    result, errors = svc.apply_schedule_template(body)
    if errors:
        return validation_error(errors)
    return created(result)
