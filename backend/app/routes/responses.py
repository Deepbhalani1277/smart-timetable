from flask import jsonify


def ok(data):
    return jsonify({"data": data}), 200


def created(data):
    return jsonify({"data": data}), 201


def no_content():
    return "", 204


def collection(data, pagination):
    return jsonify({"data": data, "pagination": pagination}), 200


def validation_error(details):
    return jsonify({
        "error": "Validation Error",
        "message": "One or more fields are invalid.",
        "details": details,
    }), 400


def not_found(resource="Resource"):
    return jsonify({"error": "Not Found", "message": f"{resource} not found."}), 404


def conflict(message):
    return jsonify({"error": "Conflict", "message": message}), 409


def bad_request(message):
    return jsonify({"error": "Bad Request", "message": message}), 400
