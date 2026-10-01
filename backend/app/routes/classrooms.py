from flask import Blueprint, request
from app.services import classrooms as svc
from app.routes.responses import ok, created, no_content, collection, validation_error, not_found, conflict, bad_request

classrooms_bp = Blueprint("classrooms", __name__)


@classrooms_bp.get("/classrooms")
def list_classrooms():
    data, pagination = svc.list_classrooms(request.args)
    return collection(data, pagination)


@classrooms_bp.get("/classrooms/<int:classroom_id>")
def get_classroom(classroom_id):
    c = svc.get_classroom(classroom_id)
    if not c:
        return not_found("Classroom")
    return ok(svc.serialize(c))


@classrooms_bp.post("/classrooms")
def create_classroom():
    body = request.get_json(silent=True)
    if body is None:
        return bad_request("Request body must be valid JSON.")
    result, errors = svc.create_classroom(body)
    if errors:
        return validation_error(errors)
    return created(result)


@classrooms_bp.put("/classrooms/<int:classroom_id>")
def update_classroom(classroom_id):
    body = request.get_json(silent=True)
    if body is None:
        return bad_request("Request body must be valid JSON.")
    result, errors = svc.update_classroom(classroom_id, body, partial=False)
    if result is None and errors is None:
        return not_found("Classroom")
    if errors:
        return validation_error(errors)
    return ok(result)


@classrooms_bp.patch("/classrooms/<int:classroom_id>")
def patch_classroom(classroom_id):
    body = request.get_json(silent=True)
    if body is None:
        return bad_request("Request body must be valid JSON.")
    result, errors = svc.update_classroom(classroom_id, body, partial=True)
    if result is None and errors is None:
        return not_found("Classroom")
    if errors:
        return validation_error(errors)
    return ok(result)


@classrooms_bp.delete("/classrooms/<int:classroom_id>")
def delete_classroom(classroom_id):
    success, reason = svc.delete_classroom(classroom_id)
    if not success:
        if reason == "not_found":
            return not_found("Classroom")
        return conflict("Classroom is referenced by timetable entries and cannot be deleted.")
    return no_content()
