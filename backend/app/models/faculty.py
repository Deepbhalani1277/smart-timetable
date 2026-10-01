from datetime import datetime, timezone
from sqlalchemy import CheckConstraint
from ..extensions import db

faculty_subjects = db.Table(
    "faculty_subjects",
    db.Column("faculty_id", db.Integer, db.ForeignKey("faculty.id"), primary_key=True),
    db.Column("subject_id", db.Integer, db.ForeignKey("subjects.id"), primary_key=True),
)


class Faculty(db.Model):
    __tablename__ = "faculty"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    department = db.Column(db.String(100), nullable=False)
    designation = db.Column(db.String(80), nullable=True)
    max_hours_per_day = db.Column(db.Numeric(4, 2), nullable=True)
    max_hours_per_week = db.Column(db.Numeric(5, 2), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    subjects = db.relationship("Subject", secondary=faculty_subjects, backref="faculty_members")

    __table_args__ = (
        CheckConstraint("max_hours_per_day > 0", name="ck_faculty_max_hours_day_positive"),
        CheckConstraint("max_hours_per_week > 0", name="ck_faculty_max_hours_week_positive"),
    )

    def __repr__(self):
        return f"<Faculty {self.name}>"
