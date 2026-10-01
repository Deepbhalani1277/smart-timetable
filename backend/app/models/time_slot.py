from datetime import datetime, timezone
from sqlalchemy import CheckConstraint
from ..extensions import db

DAYS_OF_WEEK = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")


class TimeSlot(db.Model):
    __tablename__ = "time_slots"

    id = db.Column(db.Integer, primary_key=True)
    day_of_week = db.Column(db.String(10), nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    label = db.Column(db.String(50), nullable=True)
    is_break = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        CheckConstraint(
            "day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')",
            name="ck_time_slot_day_valid",
        ),
        CheckConstraint("end_time > start_time", name="ck_time_slot_end_after_start"),
    )

    def __repr__(self):
        return f"<TimeSlot {self.day_of_week} {self.start_time}-{self.end_time}>"
