from flask import Blueprint, request
from app.services import faculty as svc
from app.routes.responses import ok, created, no_content, collection, validation_error, not_found, conflict, bad_request

faculty_bp = Blueprint("faculty", __name__)


@faculty_bp.get("/faculty")
def list_faculty():
    data, pagination = svc.list_faculty(request.args)
    return collection(data, pagination)


@faculty_bp.get("/faculty/<int:faculty_id>")
def get_faculty(faculty_id):
    f = svc.get_faculty(faculty_id)
    if not f:
        return not_found("Faculty")
    return ok(svc.serialize(f))


@faculty_bp.post("/faculty")
def create_faculty():
    body = request.get_json(silent=True)
    if body is None:
        return bad_request("Request body must be valid JSON.")
    result, errors = svc.create_faculty(body)
    if errors:
        return validation_error(errors)
    return created(result)


@faculty_bp.put("/faculty/<int:faculty_id>")
def update_faculty(faculty_id):
    body = request.get_json(silent=True)
    if body is None:
        return bad_request("Request body must be valid JSON.")
    result, errors = svc.update_faculty(faculty_id, body, partial=False)
    if result is None and errors is None:
        return not_found("Faculty")
    if errors:
        return validation_error(errors)
    return ok(result)


@faculty_bp.patch("/faculty/<int:faculty_id>")
def patch_faculty(faculty_id):
    body = request.get_json(silent=True)
    if body is None:
        return bad_request("Request body must be valid JSON.")
    result, errors = svc.update_faculty(faculty_id, body, partial=True)
    if result is None and errors is None:
        return not_found("Faculty")
    if errors:
        return validation_error(errors)
    return ok(result)


@faculty_bp.delete("/faculty/<int:faculty_id>")
def delete_faculty(faculty_id):
    success, reason = svc.delete_faculty(faculty_id)
    if not success:
        if reason == "not_found":
            return not_found("Faculty")
        return conflict("Faculty is referenced by timetable entries and cannot be deleted.")
    return no_content()


# --- Subject assignments ---

@faculty_bp.get("/faculty/<int:faculty_id>/subjects")
def get_faculty_subjects(faculty_id):
    result = svc.get_faculty_subjects(faculty_id)
    if result is None:
        return not_found("Faculty")
    return ok(result)


@faculty_bp.post("/faculty/<int:faculty_id>/subjects")
def assign_subjects(faculty_id):
    body = request.get_json(silent=True)
    if body is None:
        return bad_request("Request body must be valid JSON.")
    subject_ids = body.get("subject_ids")
    if not isinstance(subject_ids, list):
        return bad_request("subject_ids must be a list of integers.")
    result, error = svc.assign_subjects(faculty_id, subject_ids)
    if error == "faculty_not_found":
        return not_found("Faculty")
    if error == "invalid_ids":
        return bad_request("subject_ids must be a non-empty list of integers.")
    if error and "not_found" in error:
        sid = error.split("_")[1]
        return not_found(f"Subject {sid}")
    if error and "already_assigned" in error:
        sid = error.split("_")[1]
        return conflict(f"Subject {sid} is already assigned to this faculty member.")
    return ok(result)


@faculty_bp.delete("/faculty/<int:faculty_id>/subjects/<int:subject_id>")
def remove_subject(faculty_id, subject_id):
    success, error = svc.remove_subject(faculty_id, subject_id)
    if not success:
        if error == "faculty_not_found":
            return not_found("Faculty")
        return not_found("Assignment")
    return no_content()
