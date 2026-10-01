from flask import Blueprint, request
from app.services import student_groups as svc
from app.routes.responses import ok, created, no_content, collection, validation_error, not_found, conflict, bad_request

student_groups_bp = Blueprint("student_groups", __name__)


@student_groups_bp.get("/student-groups")
def list_groups():
    data, pagination = svc.list_groups(request.args)
    return collection(data, pagination)


@student_groups_bp.get("/student-groups/<int:group_id>")
def get_group(group_id):
    g = svc.get_group(group_id)
    if not g:
        return not_found("Student group")
    return ok(svc.serialize(g))


@student_groups_bp.post("/student-groups")
def create_group():
    body = request.get_json(silent=True)
    if body is None:
        return bad_request("Request body must be valid JSON.")
    result, errors = svc.create_group(body)
    if errors:
        return validation_error(errors)
    return created(result)


@student_groups_bp.put("/student-groups/<int:group_id>")
def update_group(group_id):
    body = request.get_json(silent=True)
    if body is None:
        return bad_request("Request body must be valid JSON.")
    result, errors = svc.update_group(group_id, body, partial=False)
    if result is None and errors is None:
        return not_found("Student group")
    if errors:
        return validation_error(errors)
    return ok(result)


@student_groups_bp.patch("/student-groups/<int:group_id>")
def patch_group(group_id):
    body = request.get_json(silent=True)
    if body is None:
        return bad_request("Request body must be valid JSON.")
    result, errors = svc.update_group(group_id, body, partial=True)
    if result is None and errors is None:
        return not_found("Student group")
    if errors:
        return validation_error(errors)
    return ok(result)


@student_groups_bp.delete("/student-groups/<int:group_id>")
def delete_group(group_id):
    success, reason = svc.delete_group(group_id)
    if not success:
        if reason == "not_found":
            return not_found("Student group")
        return conflict("Student group is referenced by timetable entries and cannot be deleted.")
    return no_content()


# --- Subject assignments ---

@student_groups_bp.get("/student-groups/<int:group_id>/subjects")
def get_group_subjects(group_id):
    result = svc.get_group_subjects(group_id)
    if result is None:
        return not_found("Student group")
    return ok(result)


@student_groups_bp.post("/student-groups/<int:group_id>/subjects")
def assign_subjects(group_id):
    body = request.get_json(silent=True)
    if body is None:
        return bad_request("Request body must be valid JSON.")
    subject_ids = body.get("subject_ids")
    if not isinstance(subject_ids, list):
        return bad_request("subject_ids must be a list of integers.")
    result, error = svc.assign_subjects(group_id, subject_ids)
    if error == "group_not_found":
        return not_found("Student group")
    if error == "invalid_ids":
        return bad_request("subject_ids must be a non-empty list of integers.")
    if error and "not_found" in error:
        sid = error.split("_")[1]
        return not_found(f"Subject {sid}")
    if error and "already_assigned" in error:
        sid = error.split("_")[1]
        return conflict(f"Subject {sid} is already assigned to this group.")
    return ok(result)


@student_groups_bp.delete("/student-groups/<int:group_id>/subjects/<int:subject_id>")
def remove_subject(group_id, subject_id):
    success, error = svc.remove_subject(group_id, subject_id)
    if not success:
        if error == "group_not_found":
            return not_found("Student group")
        return not_found("Assignment")
    return no_content()
