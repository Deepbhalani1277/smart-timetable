from flask import Blueprint, request
from app.services import subjects as svc
from app.routes.responses import ok, created, no_content, collection, validation_error, not_found, conflict, bad_request

subjects_bp = Blueprint("subjects", __name__)


@subjects_bp.get("/subjects")
def list_subjects():
    data, pagination = svc.list_subjects(request.args)
    return collection(data, pagination)


@subjects_bp.get("/subjects/<int:subject_id>")
def get_subject(subject_id):
    s = svc.get_subject(subject_id)
    if not s:
        return not_found("Subject")
    from app.services.subjects import serialize
    return ok(serialize(s))


@subjects_bp.post("/subjects")
def create_subject():
    body = request.get_json(silent=True)
    if body is None:
        return bad_request("Request body must be valid JSON.")
    result, errors = svc.create_subject(body)
    if errors:
        return validation_error(errors)
    return created(result)


@subjects_bp.put("/subjects/<int:subject_id>")
def update_subject(subject_id):
    body = request.get_json(silent=True)
    if body is None:
        return bad_request("Request body must be valid JSON.")
    result, errors = svc.update_subject(subject_id, body, partial=False)
    if result is None and errors is None:
        return not_found("Subject")
    if errors:
        return validation_error(errors)
    return ok(result)


@subjects_bp.patch("/subjects/<int:subject_id>")
def patch_subject(subject_id):
    body = request.get_json(silent=True)
    if body is None:
        return bad_request("Request body must be valid JSON.")
    result, errors = svc.update_subject(subject_id, body, partial=True)
    if result is None and errors is None:
        return not_found("Subject")
    if errors:
        return validation_error(errors)
    return ok(result)


@subjects_bp.delete("/subjects/<int:subject_id>")
def delete_subject(subject_id):
    success, reason = svc.delete_subject(subject_id)
    if not success:
        if reason == "not_found":
            return not_found("Subject")
        return conflict("Subject is referenced by timetable entries and cannot be deleted.")
    return no_content()
