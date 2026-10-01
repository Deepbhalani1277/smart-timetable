from datetime import datetime, timezone
from sqlalchemy import CheckConstraint
from ..extensions import db

TIMETABLE_STATUSES = ("draft", "published")
GENERATION_STATUSES = ("pending", "completed", "failed")


class Timetable(db.Model):
    __tablename__ = "timetables"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    department = db.Column(db.String(100), nullable=True)
    semester = db.Column(db.Integer, nullable=True)
    status = db.Column(db.String(20), nullable=False, default="draft")
    generation_status = db.Column(db.String(20), nullable=False, default="pending")
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    entries = db.relationship(
        "TimetableEntry", back_populates="timetable", cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'published')", name="ck_timetable_status_valid"
        ),
        CheckConstraint(
            "generation_status IN ('pending', 'completed', 'failed')",
            name="ck_timetable_generation_status_valid",
        ),
    )

    def __repr__(self):
        return f"<Timetable {self.name}>"


class TimetableEntry(db.Model):
    __tablename__ = "timetable_entries"

    id = db.Column(db.Integer, primary_key=True)
    timetable_id = db.Column(
        db.Integer, db.ForeignKey("timetables.id", ondelete="CASCADE"), nullable=False
    )
    subject_id = db.Column(
        db.Integer, db.ForeignKey("subjects.id", ondelete="RESTRICT"), nullable=False
    )
    faculty_id = db.Column(
        db.Integer, db.ForeignKey("faculty.id", ondelete="RESTRICT"), nullable=False
    )
    classroom_id = db.Column(
        db.Integer, db.ForeignKey("classrooms.id", ondelete="RESTRICT"), nullable=False
    )
    student_group_id = db.Column(
        db.Integer, db.ForeignKey("student_groups.id", ondelete="RESTRICT"), nullable=False
    )
    time_slot_id = db.Column(
        db.Integer, db.ForeignKey("time_slots.id", ondelete="RESTRICT"), nullable=False
    )
    batch = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    timetable = db.relationship("Timetable", back_populates="entries")
    subject = db.relationship("Subject")
    faculty = db.relationship("Faculty")
    classroom = db.relationship("Classroom")
    student_group = db.relationship("StudentGroup")
    time_slot = db.relationship("TimeSlot")

    def __repr__(self):
        return f"<TimetableEntry timetable={self.timetable_id} slot={self.time_slot_id}>"
