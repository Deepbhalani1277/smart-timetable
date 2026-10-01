from datetime import datetime, timezone
from sqlalchemy import CheckConstraint
from ..extensions import db

SUBJECT_TYPES = ("theory", "practical", "tutorial")
ROOM_TYPES = ("classroom", "laboratory")


class Subject(db.Model):
    __tablename__ = "subjects"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    code = db.Column(db.String(20), nullable=False, unique=True)
    department = db.Column(db.String(100), nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    weekly_sessions = db.Column(db.Integer, nullable=False)
    duration_minutes = db.Column(db.Integer, nullable=False)
    subject_type = db.Column(db.String(20), nullable=False, default="theory")
    required_room_type = db.Column(db.String(20), nullable=False, default="classroom")
    requires_consecutive_slots = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        CheckConstraint("semester >= 1", name="ck_subject_semester_positive"),
        CheckConstraint("weekly_sessions >= 1", name="ck_subject_weekly_sessions_positive"),
        CheckConstraint("duration_minutes >= 1", name="ck_subject_duration_positive"),
        CheckConstraint(
            "subject_type IN ('theory', 'practical', 'tutorial')",
            name="ck_subject_type_valid",
        ),
        CheckConstraint(
            "required_room_type IN ('classroom', 'laboratory')",
            name="ck_subject_room_type_valid",
        ),
    )

    def __repr__(self):
        return f"<Subject {self.code}>"
