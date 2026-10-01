from datetime import datetime, timezone
from sqlalchemy import CheckConstraint
from ..extensions import db

group_subjects = db.Table(
    "group_subjects",
    db.Column("group_id", db.Integer, db.ForeignKey("student_groups.id"), primary_key=True),
    db.Column("subject_id", db.Integer, db.ForeignKey("subjects.id"), primary_key=True),
)


class StudentGroup(db.Model):
    __tablename__ = "student_groups"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    department = db.Column(db.String(100), nullable=False)
    academic_year = db.Column(db.String(20), nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    division = db.Column(db.String(20), nullable=True)
    student_count = db.Column(db.Integer, nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    subjects = db.relationship("Subject", secondary=group_subjects, backref="student_groups")

    __table_args__ = (
        CheckConstraint("semester >= 1", name="ck_group_semester_positive"),
        CheckConstraint("student_count >= 1", name="ck_group_student_count_positive"),
    )

    def __repr__(self):
        return f"<StudentGroup {self.name}>"
