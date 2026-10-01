from flask import Blueprint, request
from app.services import timetables as svc
from app.routes.responses import ok, created, no_content, collection, validation_error, not_found, bad_request

timetables_bp = Blueprint("timetables", __name__)


@timetables_bp.get("/timetables")
def list_timetables():
    data, pagination = svc.list_timetables(request.args)
    return collection(data, pagination)


@timetables_bp.get("/timetables/<int:timetable_id>")
def get_timetable(timetable_id):
    tt = svc.get_timetable(timetable_id)
    if not tt:
        return not_found("Timetable")
    return ok(tt)


@timetables_bp.post("/timetables/generate")
def generate_timetable():
    body = request.get_json(silent=True) or {}
    result, errors = svc.generate_timetable(body)
    if errors:
        return validation_error(errors)
    return created(result)


@timetables_bp.delete("/timetables/<int:timetable_id>")
def delete_timetable(timetable_id):
    deleted = svc.delete_timetable(timetable_id)
    if not deleted:
        return not_found("Timetable")
    return no_content()


@timetables_bp.post("/seed")
def seed_data():
    summary = svc.seed_database()
    return ok({"message": "Database seeded successfully.", "summary": summary})
