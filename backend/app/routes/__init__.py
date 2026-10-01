from .health import health_bp
from .subjects import subjects_bp
from .faculty import faculty_bp
from .classrooms import classrooms_bp
from .student_groups import student_groups_bp
from .time_slots import time_slots_bp
from .timetables import timetables_bp


def register_blueprints(app):
    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(subjects_bp, url_prefix="/api")
    app.register_blueprint(faculty_bp, url_prefix="/api")
    app.register_blueprint(classrooms_bp, url_prefix="/api")
    app.register_blueprint(student_groups_bp, url_prefix="/api")
    app.register_blueprint(time_slots_bp, url_prefix="/api")
    app.register_blueprint(timetables_bp, url_prefix="/api")
