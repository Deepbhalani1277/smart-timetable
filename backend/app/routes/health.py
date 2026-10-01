from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__)


@health_bp.get("/health")
def health():
    return jsonify({
        "status": "healthy",
        "api_name": "Smart Classroom & Timetable Scheduler API",
        "version": "1.0.0",
    })
