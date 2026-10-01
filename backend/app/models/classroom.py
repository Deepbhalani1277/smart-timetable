from datetime import datetime, timezone
from sqlalchemy import CheckConstraint, UniqueConstraint
from ..extensions import db

ROOM_TYPES = ("classroom", "laboratory")


class Classroom(db.Model):
    __tablename__ = "classrooms"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    building = db.Column(db.String(80), nullable=True)
    capacity = db.Column(db.Integer, nullable=False)
    room_type = db.Column(db.String(20), nullable=False, default="classroom")
    has_projector = db.Column(db.Boolean, nullable=False, default=False)
    has_computers = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        CheckConstraint("capacity >= 1", name="ck_classroom_capacity_positive"),
        CheckConstraint(
            "room_type IN ('classroom', 'laboratory')",
            name="ck_classroom_room_type_valid",
        ),
        UniqueConstraint("name", "building", name="uq_classroom_name_building"),
    )

    def __repr__(self):
        return f"<Classroom {self.name}>"
